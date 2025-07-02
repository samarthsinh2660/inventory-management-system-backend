import { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "../database/db.ts";
import { ERRORS } from "../utils/error.ts";
import { 
  InventoryEntry, 
  InventoryEntryCreateParams, 
  InventoryEntryUpdateParams,
  ProductBalance,
  InventoryBalance
} from "../models/inventoryEntries.model.ts";
import { FormulaComponentData } from "../models/productFormula.model.ts";

export class InventoryEntryRepository {
  
  /**
   * Finds all inventory entries with optional pagination
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{ entries: InventoryEntry[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Use direct integer values in the query rather than parameters for LIMIT/OFFSET
      const query = `
        SELECT ie.*, p.name as product_name, l.name as location_name, u.username
        FROM InventoryEntries ie
        JOIN Products p ON ie.product_id = p.id
        JOIN Locations l ON ie.location_id = l.id
        JOIN Users u ON ie.user_id = u.id
        ORDER BY ie.timestamp DESC
        LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
      `;
      
      const [entries] = await db.execute<InventoryEntry[]>(query, []);
      
      const [countResult] = await db.execute<RowDataPacket[]>('SELECT COUNT(*) as total FROM InventoryEntries');
      const total = countResult[0]?.total || 0;
      
      return { entries, total };
    } catch (error) {
      console.error("Error finding inventory entries:", error);
      throw ERRORS.DATABASE_ERROR;
    }
  }
  
  /**
   * Finds a specific inventory entry by ID
   */
  async findById(id: number): Promise<InventoryEntry | null> {
    try {
      const [entries] = await db.execute<InventoryEntry[]>(`
        SELECT ie.*, p.name as product_name, l.name as location_name, u.username
        FROM InventoryEntries ie
        JOIN Products p ON ie.product_id = p.id
        JOIN Locations l ON ie.location_id = l.id
        JOIN Users u ON ie.user_id = u.id
        WHERE ie.id = ?
      `, [id]);
      
      return entries.length > 0 ? entries[0] : null;
    } catch (error) {
      console.error(`Error finding inventory entry with id ${id}:`, error);
      throw ERRORS.DATABASE_ERROR;
    }
  }
  
  /**
   * Creates a new inventory entry
   */
  async create(entryData: InventoryEntryCreateParams): Promise<InventoryEntry> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Check if the entry with negative quantity would create negative inventory
      if (entryData.quantity < 0) {
        const [currentBalance] = await connection.execute<RowDataPacket[]>(`
          SELECT COALESCE(SUM(quantity), 0) as current_balance 
          FROM InventoryEntries 
          WHERE product_id = ? AND location_id = ?
        `, [entryData.product_id, entryData.location_id]);
        
        const balance = currentBalance[0]?.current_balance || 0;
        if (balance + entryData.quantity < 0) {
          throw ERRORS.INVENTORY_NEGATIVE_QUANTITY_ERROR;
        }
      }
      
      // Insert the entry
      const [result] = await connection.execute<ResultSetHeader>(`
        INSERT INTO InventoryEntries 
        (product_id, quantity, entry_type, user_id, location_id, notes, reference_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        entryData.product_id,
        entryData.quantity,
        entryData.entry_type,
        entryData.user_id,
        entryData.location_id,
        entryData.notes || null,
        entryData.reference_id || null
      ]);
      
      const entryId = result.insertId;
      
      await connection.commit();
      
      // Return the created entry
      const entry = await this.findById(entryId) as InventoryEntry;
      
      // After successfully creating the entry, check if there are any threshold alerts
      // Do this outside the transaction to avoid slowing down the main operation
      setImmediate(() => {
        import('../services/alert.service.ts')
          .then(module => {
            const alertService = module.default;
            alertService.checkAndSendAlerts()
              .catch(err => console.error("Error checking alerts after inventory change:", err));
          })
          .catch(err => console.error("Error importing alert service:", err));
      });
      
      return entry;
    } catch (error) {
      await connection.rollback();
      console.error("Error creating inventory entry:", error);
      
      if (error === ERRORS.INVENTORY_NEGATIVE_QUANTITY_ERROR) {
        throw error;
      }
      
      throw ERRORS.INVENTORY_ENTRY_CREATION_FAILED;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Updates an existing inventory entry
   */
  async update(id: number, entryData: InventoryEntryUpdateParams): Promise<InventoryEntry> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Check if the entry exists
      const existingEntry = await this.findById(id);
      if (!existingEntry) {
        throw ERRORS.INVENTORY_ENTRY_NOT_FOUND;
      }
      
      // Check if the updated quantity would create negative inventory
      if (entryData.quantity !== undefined && entryData.quantity < existingEntry.quantity) {
        const [currentBalance] = await connection.execute<RowDataPacket[]>(`
          SELECT COALESCE(SUM(quantity), 0) as current_balance 
          FROM InventoryEntries 
          WHERE product_id = ? AND location_id = ? AND id != ?
        `, [
          existingEntry.product_id, 
          entryData.location_id || existingEntry.location_id,
          id
        ]);
        
        const balance = currentBalance[0]?.current_balance || 0;
        if (balance + entryData.quantity < 0) {
          throw ERRORS.INVENTORY_NEGATIVE_QUANTITY_ERROR;
        }
      }
      
      // Build the SQL parts
      const updateParts = [];
      const params = [];
      
      if (entryData.quantity !== undefined) {
        updateParts.push('quantity = ?');
        params.push(entryData.quantity);
      }
      
      if (entryData.entry_type !== undefined) {
        updateParts.push('entry_type = ?');
        params.push(entryData.entry_type);
      }
      
      if (entryData.location_id !== undefined) {
        updateParts.push('location_id = ?');
        params.push(entryData.location_id);
      }
      
      if (entryData.notes !== undefined) {
        updateParts.push('notes = ?');
        params.push(entryData.notes);
      }
      
      if (entryData.reference_id !== undefined) {
        updateParts.push('reference_id = ?');
        params.push(entryData.reference_id);
      }
      
      // Add the ID at the end for the WHERE clause
      params.push(id);
      
      if (updateParts.length === 0) {
        // No fields to update
        return existingEntry;
      }
      
      // Update the entry
      await connection.execute(`
        UPDATE InventoryEntries 
        SET ${updateParts.join(', ')} 
        WHERE id = ?
      `, params);
      
      await connection.commit();
      
      // Return the updated entry
      return await this.findById(id) as InventoryEntry;
    } catch (error) {
      await connection.rollback();
      console.error(`Error updating inventory entry with id ${id}:`, error);
      
      if (error === ERRORS.INVENTORY_ENTRY_NOT_FOUND || 
          error === ERRORS.INVENTORY_NEGATIVE_QUANTITY_ERROR) {
        throw error;
      }
      
      throw ERRORS.INVENTORY_ENTRY_UPDATE_FAILED;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Deletes an inventory entry
   */
  async delete(id: number): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Check if the entry exists
      const entry = await this.findById(id);
      if (!entry) {
        throw ERRORS.INVENTORY_ENTRY_NOT_FOUND;
      }
      
      // Check if removing this entry would create negative inventory
      if (entry.quantity > 0) {
        const [currentBalance] = await connection.execute<RowDataPacket[]>(`
          SELECT COALESCE(SUM(quantity), 0) as current_balance 
          FROM InventoryEntries 
          WHERE product_id = ? AND location_id = ? AND id != ?
        `, [entry.product_id, entry.location_id, id]);
        
        const balance = currentBalance[0]?.current_balance || 0;
        if (balance < 0) {
          throw ERRORS.INVENTORY_NEGATIVE_QUANTITY_ERROR;
        }
      }
      
      // Delete the entry
      await connection.execute('DELETE FROM InventoryEntries WHERE id = ?', [id]);
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error(`Error deleting inventory entry with id ${id}:`, error);
      
      if (error === ERRORS.INVENTORY_ENTRY_NOT_FOUND || 
          error === ERRORS.INVENTORY_NEGATIVE_QUANTITY_ERROR) {
        throw error;
      }
      
      throw ERRORS.INVENTORY_ENTRY_DELETION_FAILED;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Gets the inventory balance for all products or by location
   */
  async getBalance(locationId?: number): Promise<InventoryBalance> {
    try {
      let query = `
        SELECT 
          p.id as product_id, 
          p.name as product_name, 
          COALESCE(SUM(
            CASE 
              WHEN ie.entry_type IN ('manual_in', 'manufacturing_in') THEN ie.quantity
              ELSE -ie.quantity
            END
          ), 0) as total_quantity,
          ie.location_id,
          l.name as location_name
        FROM 
          Products p
        LEFT JOIN 
          InventoryEntries ie ON p.id = ie.product_id
        LEFT JOIN
          Locations l ON ie.location_id = l.id
      `;
      
      const params = [];
      
      if (locationId) {
        query += ' WHERE ie.location_id = ?';
        params.push(locationId);
      }
      
      query += ` 
        GROUP BY p.id, ie.location_id
        ORDER BY p.name, l.name
      `;
      
      const [results] = await db.execute<RowDataPacket[]>(query, params);
      
      const products = results.map((row: RowDataPacket) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        total_quantity: parseFloat(row.total_quantity) || 0,
        location_id: row.location_id,
        location_name: row.location_name
      }));
      
      return {
        products: products as ProductBalance[],
        total_products: products.length
      };
    } catch (error) {
      console.error("Error retrieving inventory balance:", error);
      throw ERRORS.INVENTORY_BALANCE_RETRIEVAL_FAILED;
    }
  }
  
  /**
   * Gets inventory entries for a specific product
   */
  async findByProduct(
    productId: number, 
    page: number = 1, 
    limit: number = 10
  ): Promise<{ entries: InventoryEntry[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Use direct integer value for product_id as parameter, but LIMIT and OFFSET inline
      const numProductId = Number(productId);
      
      const query = `
        SELECT ie.*, p.name as product_name, l.name as location_name, u.username
        FROM InventoryEntries ie
        JOIN Products p ON ie.product_id = p.id
        JOIN Locations l ON ie.location_id = l.id
        JOIN Users u ON ie.user_id = u.id
        WHERE ie.product_id = ?
        ORDER BY ie.timestamp DESC
        LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
      `;
      
      const [entries] = await db.execute<InventoryEntry[]>(query, [numProductId]);
      
      const [countResult] = await db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM InventoryEntries WHERE product_id = ?', 
        [numProductId]
      );
      
      const total = countResult[0]?.total || 0;
      
      return { entries, total };
    } catch (error) {
      console.error(`Error finding inventory entries for product ${productId}:`, error);
      throw ERRORS.DATABASE_ERROR;
    }
  }
  
  /**
   * Creates a new inventory entry with component deductions based on formula
   * @param mainEntryData The main product inventory entry
   * @param formulaComponents The components from the formula
   * @param productionQuantity The quantity of the main product being produced
   * @returns Object containing the main entry and all component entries
   */
  async createWithFormulaComponents(
    mainEntryData: InventoryEntryCreateParams, 
    formulaComponents: FormulaComponentData[],
    productionQuantity: number
  ): Promise<{ mainEntry: InventoryEntry, componentEntries: InventoryEntry[] }> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // First, verify that all components have sufficient inventory to be deducted
      for (const component of formulaComponents) {
        // Calculate how much of this component will be used
        const componentQuantity = component.quantity * productionQuantity;
        
        // Check if there's enough inventory for this component
        const [currentBalance] = await connection.execute<RowDataPacket[]>(`
          SELECT COALESCE(SUM(quantity), 0) as current_balance 
          FROM InventoryEntries 
          WHERE product_id = ? AND location_id = ?
        `, [component.component_id, mainEntryData.location_id]);
        
        const balance = currentBalance[0]?.current_balance || 0;
        if (balance - componentQuantity < 0) {
          throw {
            ...ERRORS.INSUFFICIENT_COMPONENT_INVENTORY,
            message: `Insufficient inventory for component ${component.component_name || component.component_id}. Required: ${componentQuantity}, Available: ${balance}`
          };
        }
      }
      
      // Insert the main product entry (the manufactured product)
      const [mainResult] = await connection.execute<ResultSetHeader>(`
        INSERT INTO InventoryEntries 
        (product_id, quantity, entry_type, user_id, location_id, notes, reference_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        mainEntryData.product_id,
        mainEntryData.quantity,
        mainEntryData.entry_type,
        mainEntryData.user_id,
        mainEntryData.location_id,
        mainEntryData.notes || null,
        mainEntryData.reference_id || null
      ]);
      
      const mainEntryId = mainResult.insertId;
      
      // Now create entries for each component (deducting them from inventory)
      const componentEntryIds: number[] = [];
      
      for (const component of formulaComponents) {
        // Calculate how much of this component will be used
        const componentQuantity = component.quantity * productionQuantity;
        
        // Create entry for component deduction (negative quantity for deduction)
        const [componentResult] = await connection.execute<ResultSetHeader>(`
          INSERT INTO InventoryEntries 
          (product_id, quantity, entry_type, user_id, location_id, notes, reference_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          component.component_id,
          -componentQuantity, // Negative quantity for deduction
          'manufacturing_out', // Special type for formula component deductions
          mainEntryData.user_id,
          mainEntryData.location_id,
          `Auto-deducted for manufacturing product ID ${mainEntryData.product_id}`,
          mainEntryId // Reference to the main entry
        ]);
        
        componentEntryIds.push(componentResult.insertId);
      }
      
      // Commit all changes
      await connection.commit();
      
      // Retrieve all created entries
      const mainEntry = await this.findById(mainEntryId) as InventoryEntry;
      
      const componentEntries: InventoryEntry[] = [];
      for (const id of componentEntryIds) {
        const entry = await this.findById(id) as InventoryEntry;
        componentEntries.push(entry);
      }
      
      // After successfully creating entries, check if there are any threshold alerts
      // Do this outside the transaction to avoid slowing down the main operation
      setImmediate(() => {
        import('../services/alert.service.ts')
          .then(alertService => {
            // Check threshold alerts for all affected products
            alertService.default.checkAndSendAlerts();
          })
          .catch(error => {
            console.error("Error checking stock thresholds:", error);
          });
      });
      
      return { mainEntry, componentEntries };
    } catch (error) {
      await connection.rollback();
      console.error("Error creating inventory entry with formula components:", error);
      
      if (error === ERRORS.INSUFFICIENT_COMPONENT_INVENTORY || 
          (error as any)?.code === ERRORS.INSUFFICIENT_COMPONENT_INVENTORY.code) {
        throw error;
      }
      
      throw ERRORS.INVENTORY_ENTRY_CREATION_FAILED;
    } finally {
      connection.release();
    }
  }
}

export default new InventoryEntryRepository();

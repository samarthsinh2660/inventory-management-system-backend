import { db } from '../database/db.ts';
import { RowDataPacket } from 'mysql2';
import { User } from '../models/users.model.ts';

// Interface for low stock products
interface LowStockProduct {
  id: number;
  name: string;
  current_stock: number;
  min_stock_threshold: number;
  location_id: number;
  location_name: string;
}

// Interface for master users
interface MasterUser {
  id: number;
  username: string;
  email: string;
}

class AlertService {
  /**
   * Find all products that are below their minimum stock threshold
   */
  async getProductsBelowThreshold(): Promise<LowStockProduct[]> {
    try {
      // Get current stock levels and join with product info
      const query = `
        SELECT 
          p.id,
          p.name,
          p.min_stock_threshold,
          COALESCE(SUM(
            CASE 
              WHEN ie.entry_type IN ('manual_in', 'manufacturing_in') THEN ie.quantity
              ELSE -ie.quantity
            END
          ), 0) as current_stock,
          p.location_id,
          l.name as location_name
        FROM
          Products p
        LEFT JOIN
          InventoryEntries ie ON p.id = ie.product_id
        LEFT JOIN
          Locations l ON p.location_id = l.id
        WHERE
          p.min_stock_threshold IS NOT NULL
        GROUP BY
          p.id
        HAVING
          current_stock <= p.min_stock_threshold
        ORDER BY
          (current_stock / p.min_stock_threshold) ASC;
      `;
      
      const [products] = await db.execute<RowDataPacket[]>(query);
      return products as LowStockProduct[];
    } catch (error) {
      console.error("Error getting products below threshold:", error);
      return [];
    }
  }

  /**
   * Get all master users who should receive notifications
   */
  async getMasterUsers(): Promise<User[]> {
    try {
      const [users] = await db.execute<RowDataPacket[]>(
        'SELECT id, username, email FROM Users WHERE role = ?', 
        ['master']
      );
      return users as User[];
    } catch (error) {
      console.error("Error getting master users:", error);
      return [];
    }
  }

  /**
   * Check for products below threshold and notify masters if any are found
   * This is the main method to be called after inventory changes
   */
  async checkAndSendAlerts(): Promise<void> {
    try {
      const lowStockProducts = await this.getProductsBelowThreshold();
      
      if (lowStockProducts.length === 0) {
        return; // No alerts needed
      }
      
      const masterUsers = await this.getMasterUsers();
      
      if (masterUsers.length === 0) {
        console.warn("No master users found to notify about low stock");
        return;
      }
      
      // Log alerts to console
      console.log(`ALERT: ${lowStockProducts.length} products below minimum stock threshold`);
      lowStockProducts.forEach(product => {
        console.log(`Product: ${product.name}, Current: ${product.current_stock}, Minimum: ${product.min_stock_threshold}, Location: ${product.location_name}`);
      });
      
      // Store alerts in the database for later retrieval via API
      await this.storeAlerts(lowStockProducts);
      
      // Create in-app notifications for each master user for dashboard display
      await this.createInAppNotifications(lowStockProducts, masterUsers);
      
    } catch (error) {
      console.error("Error in checking and sending alerts:", error);
    }
  }
  
  /**
   * Store alerts in the database for retrieval via API
   */
  private async storeAlerts(products: LowStockProduct[]): Promise<void> {
    try {
      // Insert new alerts, avoiding duplicates
      for (const product of products) {
        // Check if there's already an unresolved alert for this product
        const [existingAlerts] = await db.execute<RowDataPacket[]>(
          'SELECT id FROM StockAlerts WHERE product_id = ? AND is_resolved = false',
          [product.id]
        );
        
        // If no existing unresolved alert, create one
        if (existingAlerts.length === 0) {
          await db.execute(
            `INSERT INTO StockAlerts (
              product_id, current_stock, min_threshold
            ) VALUES (?, ?, ?)`,
            [
              product.id,
              product.current_stock,
              product.min_stock_threshold
            ]
          );
        } else {
          // Update existing alert with current stock level
          await db.execute(
            'UPDATE StockAlerts SET current_stock = ? WHERE id = ?',
            [product.current_stock, existingAlerts[0].id]
          );
        }
      }
    } catch (error) {
      console.error("Error storing stock alerts:", error);
    }
  }
  
  /**
   * Create in-app notifications for master users to display on dashboard
   */
  private async createInAppNotifications(
    products: LowStockProduct[],
    masterUsers: User[]
  ): Promise<void> {
    try {
      // For each product, create a single notification
      for (const product of products) {
        // First check if we already have unread notifications for this product
        const [existingNotifications] = await db.execute<RowDataPacket[]>(
          `SELECT id FROM Notifications 
           WHERE product_id = ? AND is_read = false`,
          [product.id]
        );
        
        // Skip if we already have an unread notification for this product
        if (existingNotifications.length > 0) {
          continue;
        }
        
        // Create a single notification for the product (visible to all master users)
        const message = `Low stock alert: ${product.name} is below minimum threshold (${product.current_stock}/${product.min_stock_threshold})`;
        
        // First get the corresponding stock alert if available
        const [stockAlerts] = await db.execute<RowDataPacket[]>(
          'SELECT id FROM StockAlerts WHERE product_id = ? AND is_resolved = false',
          [product.id]
        );
        
        const stock_alert_id = stockAlerts.length > 0 ? stockAlerts[0].id : null;
        
        await db.execute(
          `INSERT INTO Notifications (
            product_id, stock_alert_id, message, current_stock, min_threshold
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            product.id,
            stock_alert_id,
            message,
            product.current_stock,
            product.min_stock_threshold
          ]
        );
      }
    } catch (error) {
      console.error("Error creating in-app notifications:", error);
    }
  }
}

export default new AlertService();

import { db } from '../database/db.ts';
import { Pool } from 'mysql2/promise';
import { Product, ProductCategory, ProductCreateParams, ProductSearchParams } from '../models/products.model.ts';
import { ResultSetHeader } from 'mysql2';
import { ERRORS } from '../utils/error.ts';

export class ProductRepository {
  
  // Simple method to get pool from request or default to db
  private getPool(req?: any): Pool {
    return req?.factoryPool || db;
  }
  /**
   * Find a product by its ID
   */
  async findById(id: number, req?: any): Promise<Product | null> {
    const pool = this.getPool(req);
    const [products] = await pool.execute(
      `SELECT p.*, s.name as subcategory_name, l.name as location_name, pf.name as product_formula_name,
              pi.business_name as purchase_business_name, pi.address as purchase_address,
              pi.phone_number as purchase_phone, pi.email as purchase_email, pi.gst_number as purchase_gst
       FROM Products p
       JOIN Subcategories s ON p.subcategory_id = s.id
       JOIN Locations l ON p.location_id = l.id
       LEFT JOIN ProductFormula pf ON p.product_formula_id = pf.id
       LEFT JOIN PurchaseInfo pi ON p.purchase_info_id = pi.id
       WHERE p.id = ?`,
      [id]
    ) as [Product[], any];

    return products.length ? products[0] : null;
  }

  /**
   * Find a product by its name
   */
  async findByName(name: string, req?: any): Promise<Product | null> {
    const pool = this.getPool(req);
    const [products] = await pool.execute(
      `SELECT p.*, s.name as subcategory_name, l.name as location_name
       FROM Products p
       JOIN Subcategories s ON p.subcategory_id = s.id
       JOIN Locations l ON p.location_id = l.id
       WHERE p.name = ?`,
      [name]
    ) as [Product[], any];

    return products.length ? products[0] : null;
  }

  /**
   * Get all products with optional filters
   */
  async getAllProducts(filters?: ProductSearchParams, req?: any): Promise<{ products: Product[], total: number }> {
    // If no filters provided, use empty filters object
    if (!filters) {
      filters = {};
    }
    
    return this.searchProducts(filters, req);
  }



  /**
   * Create a new product
   */
  async create(productData: {
    subcategory_id: number; 
    name: string;
    unit: string;
    source_type: 'manufacturing' | 'trading';
    category: ProductCategory;
    min_stock_threshold?: number | null;
    location_id?: number | null;
    price?: number | null;
    product_formula_id?: number | null;
    purchase_info_id?: number | null;
  }, req?: any): Promise<Product> {
    try {
      const pool = this.getPool(req);
      // Check if product name already exists
      const [existingProducts] = await pool.execute(
        "SELECT * FROM Products WHERE name = ?",
        [productData.name]
      ) as [any[], any];

      if (existingProducts.length > 0) {
        throw ERRORS.PRODUCT_NAME_EXISTS;
      }

      // Insert the product
      const [result] = await pool.execute(
        `INSERT INTO Products 
         (subcategory_id, name, unit, source_type, category, min_stock_threshold, location_id, price, product_formula_id, purchase_info_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productData.subcategory_id,
          productData.name,
          productData.unit,
          productData.source_type,
          productData.category,
          productData.min_stock_threshold || null,
          productData.location_id || null,
          productData.price || null,
          productData.product_formula_id || null,
          productData.purchase_info_id || null
        ]
      ) as [ResultSetHeader, any];

      const id = result.insertId;

      // Get the product with the location name
      const [rows] = await pool.execute(
        `SELECT p.*, l.name as location_name, sc.name as subcategory_name
         FROM Products p
         LEFT JOIN Locations l ON p.location_id = l.id
         LEFT JOIN Subcategories sc ON p.subcategory_id = sc.id
         WHERE p.id = ?`,
        [id]
      ) as [any[], any];

      return rows[0] as Product;
    } catch (error) {
      console.error('Error creating product:', error);

      if (error === ERRORS.PRODUCT_NAME_EXISTS) {
        throw error;
      }

      throw ERRORS.PRODUCT_CREATION_FAILED;
    }
  }

  /**
   * Update a product by ID
   */
  async update(
    id: number,
    productData: {
      subcategory_id?: number;
      name?: string;
      unit?: string;
      source_type?: 'manufacturing' | 'trading';
      category?: ProductCategory;
      min_stock_threshold?: number | null;
      location_id?: number | null;
      price?: number | null;
      product_formula_id?: number | null;
      purchase_info_id?: number | null;
    },
    req?: any
  ): Promise<Product | null> {
    try {
      // Check if product exists
      const product = await this.findById(id, req);
      if (!product) {
        throw ERRORS.PRODUCT_NOT_FOUND;
      }

      // Check if name is being updated and already exists
      if (productData.name && productData.name !== product.name) {
        const pool = this.getPool(req);
        const [existingProducts] = await pool.execute(
          "SELECT * FROM Products WHERE name = ? AND id != ?",
          [productData.name, id]
        ) as [any[], any];

        if (existingProducts.length > 0) {
          throw ERRORS.PRODUCT_NAME_EXISTS;
        }
      }

      // Build the update query dynamically based on provided fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (productData.subcategory_id !== undefined) {
        updateFields.push("subcategory_id = ?");
        updateValues.push(productData.subcategory_id);
      }

      if (productData.name !== undefined) {
        updateFields.push("name = ?");
        updateValues.push(productData.name);
      }

      if (productData.unit !== undefined) {
        updateFields.push("unit = ?");
        updateValues.push(productData.unit);
      }

      if (productData.source_type !== undefined) {
        updateFields.push("source_type = ?");
        updateValues.push(productData.source_type);
      }

      if (productData.category !== undefined) {
        updateFields.push("category = ?");
        updateValues.push(productData.category);
      }

      if (productData.min_stock_threshold !== undefined) {
        updateFields.push("min_stock_threshold = ?");
        updateValues.push(productData.min_stock_threshold);
      }

      if (productData.location_id !== undefined) {
        updateFields.push("location_id = ?");
        updateValues.push(productData.location_id);
      }

      if (productData.price !== undefined) {
        updateFields.push("price = ?");
        updateValues.push(productData.price);
      }

      if (productData.product_formula_id !== undefined) {
        updateFields.push("product_formula_id = ?");
        updateValues.push(productData.product_formula_id);
      }

      if (productData.purchase_info_id !== undefined) {
        updateFields.push("purchase_info_id = ?");
        updateValues.push(productData.purchase_info_id);
      }

      // Return early if no fields to update
      if (updateFields.length === 0) {
        return product;
      }

      // Add ID to values array
      updateValues.push(id);

      // Execute update
      const pool = this.getPool(req);
      await pool.execute(
        `UPDATE Products SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get the updated product
      return await this.findById(id, req);
    } catch (error) {
      console.error('Error updating product:', error);

      if (error === ERRORS.PRODUCT_NOT_FOUND || error === ERRORS.PRODUCT_NAME_EXISTS) {
        throw error;
      }

      throw ERRORS.PRODUCT_UPDATE_FAILED;
    }
  }

  /**
   * Delete a product by ID
   */
  async delete(id: number, req?: any): Promise<boolean> {
    try {
      // Check if product exists
      const product = await this.findById(id, req);
      if (!product) {
        throw ERRORS.PRODUCT_NOT_FOUND;
      }
      
      const pool = this.getPool(req);
      // Check if product is used in any inventory entries
      const [inventoryEntries] = await pool.execute(
        'SELECT COUNT(*) as count FROM InventoryEntries WHERE product_id = ?',
        [id]
      ) as [any[], any];
      
      if (inventoryEntries[0].count > 0) {
        throw {
          ...ERRORS.PRODUCT_IN_USE,
          message: 'Cannot delete this product because it is used in inventory entries'
        };
      }
      
      // Check if product has a formula attached to it
      if (product.product_formula_id) {
        throw {
          ...ERRORS.PRODUCT_HAS_FORMULA,
          message: 'Cannot delete this product because it has a formula attached. Remove the formula first.'
        };
      }
      
      // Check if product is used as a component in any formula
      const [formulas] = await pool.execute(
        'SELECT id, name, components FROM ProductFormula'
      ) as [any[], any];
      
      // Check each formula's components JSON to see if this product is used as a component
      for (const formula of formulas) {
        // Handle cases where components might already be parsed as an object
        let components;
        if (typeof formula.components === 'string') {
          components = JSON.parse(formula.components || '[]');
        } else {
          components = formula.components || [];
        }
        
        const isComponentInFormula = components.some(
          (component: any) => component.component_id === id
        );
        
        if (isComponentInFormula) {
          throw {
            ...ERRORS.PRODUCT_IN_USE,
            message: `Cannot delete this product because it is used as a component in formula "${formula.name}" (ID: ${formula.id})`
          };
        }
      }
      
      // Now it's safe to delete the product
      const [result] = await pool.execute(
        'DELETE FROM Products WHERE id = ?',
        [id]
      ) as [ResultSetHeader, any];
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting product:', error);
      
      if (
        error === ERRORS.PRODUCT_NOT_FOUND || 
        error === ERRORS.PRODUCT_IN_USE || 
        error === ERRORS.PRODUCT_HAS_FORMULA ||
        (error as any)?.code === ERRORS.PRODUCT_IN_USE.code ||
        (error as any)?.code === ERRORS.PRODUCT_HAS_FORMULA.code
      ) {
        throw error;
      }
      
      throw ERRORS.PRODUCT_DELETION_FAILED;
    }
  }

  /**
   * Search products with flexible filtering options
   */
  async searchProducts(filters: ProductSearchParams, req?: any): Promise<{ products: Product[], total: number }> {
    const {
      search,
      category,
      subcategory_id,
      location_id,
      source_type,
      formula_id,
      component_id,
      purchase_info_id,
      page = 1,
      limit = 20
    } = filters;

    // Start building the query
    let baseQuery = `
      SELECT SQL_CALC_FOUND_ROWS p.*, 
      s.name as subcategory_name, 
      l.name as location_name,
      pf.name as product_formula_name
      FROM Products p
      JOIN Subcategories s ON p.subcategory_id = s.id
      JOIN Locations l ON p.location_id = l.id
      LEFT JOIN ProductFormula pf ON p.product_formula_id = pf.id
    `;

    // Initialize where clauses and parameters
    const whereClauses: string[] = [];
    const params: any[] = [];

    // Add filter conditions
    if (search) {
      whereClauses.push('(p.name LIKE ? OR p.unit LIKE ? OR s.name LIKE ? OR l.name LIKE ? OR pf.name LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    if (category) {
      whereClauses.push('p.category = ?');
      params.push(category);
    }

    if (subcategory_id) {
      whereClauses.push('p.subcategory_id = ?');
      params.push(subcategory_id);
    }

    if (location_id) {
      whereClauses.push('p.location_id = ?');
      params.push(location_id);
    }

    if (source_type) {
      whereClauses.push('p.source_type = ?');
      params.push(source_type);
    }

    if (purchase_info_id !== undefined) {
      if (purchase_info_id === null) {
        whereClauses.push('p.purchase_info_id IS NULL');
      } else {
        whereClauses.push('p.purchase_info_id = ?');
        params.push(purchase_info_id);
      }
    }

    // Formula-related filters
    if (formula_id !== undefined && formula_id !== null) {
      whereClauses.push('p.product_formula_id = ?');
      params.push(formula_id);
    }

    if (component_id !== undefined && component_id !== null) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM ProductFormula pf 
        WHERE JSON_CONTAINS(pf.components, JSON_OBJECT('component_id', ?))
      )`);
      params.push(component_id);
    }



    // Assemble the where clause if needed
    let query = baseQuery;
    if (whereClauses.length) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Add ordering
    query += ' ORDER BY p.name';

    // Add pagination with direct values, not parameters
    const offset = (page - 1) * limit;
    const paginatedQuery = `${query} LIMIT ${limit} OFFSET ${offset}`;

    try {
      // Execute main query with pagination
      const pool = this.getPool(req);
      const [products] = await pool.execute(paginatedQuery, params) as [Product[], any];

      // Get total count (without parameters)
      const [countResult] = await pool.execute('SELECT FOUND_ROWS() as total') as [any[], any];
      const total = countResult[0].total;

      return { products, total };
    } catch (error) {
      console.error('Search products error:', error);
      throw ERRORS.PRODUCT_SEARCH_FAILED;
    }
  }
}

export const productRepository = new ProductRepository();

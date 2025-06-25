import { db } from '../database/db.ts';
import { Product, ProductCategory, ProductCreateParams, ProductSearchParams } from '../models/products.model.ts';
import { ResultSetHeader } from 'mysql2';
import { ERRORS } from '../utils/error.ts';

export class ProductRepository {
  /**
   * Find a product by its ID
   */
  async findById(id: number): Promise<Product | null> {
    const [products] = await db.execute(
      `SELECT p.*, s.name as subcategory_name, l.name as location_name 
       FROM Products p
       JOIN Subcategories s ON p.subcategory_id = s.id
       JOIN Locations l ON p.location_id = l.id
       WHERE p.id = ?`,
      [id]
    ) as [Product[], any];

    return products.length ? products[0] : null;
  }

  /**
   * Find a product by its name
   */
  async findByName(name: string): Promise<Product | null> {
    const [products] = await db.execute(
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
   * Get all products
   */
  async getAllProducts(): Promise<Product[]> {
    const [products] = await db.execute(
      `SELECT p.*, s.name as subcategory_name, l.name as location_name 
       FROM Products p
       JOIN Subcategories s ON p.subcategory_id = s.id
       JOIN Locations l ON p.location_id = l.id
       ORDER BY p.name`
    ) as [Product[], any];

    return products;
  }

  /**
   * Get products by category
   */
  async findByCategory(category: ProductCategory): Promise<Product[]> {
    const [products] = await db.execute(
      `SELECT p.*, s.name as subcategory_name, l.name as location_name 
       FROM Products p
       JOIN Subcategories s ON p.subcategory_id = s.id
       JOIN Locations l ON p.location_id = l.id
       WHERE p.category = ?
       ORDER BY p.name`,
      [category]
    ) as [Product[], any];

    return products;
  }

  /**
   * Create a new product
   */
  async create(product: ProductCreateParams): Promise<Product> {
    const { 
      subcategory_id, 
      name, 
      unit, 
      source_type, 
      category, 
      min_stock_threshold, 
      location_id 
    } = product;

    // Check for duplicate product name
    const [existingProducts] = await db.execute(
      'SELECT id FROM Products WHERE name = ?',
      [name]
    ) as [any[], any];

    if (existingProducts.length > 0) {
      throw ERRORS.DUPLICATE_RESOURCE;
    }

    const [result] = await db.execute(
      `INSERT INTO Products 
       (subcategory_id, name, unit, source_type, category, min_stock_threshold, location_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [subcategory_id, name, unit, source_type, category, min_stock_threshold || null, location_id]
    ) as [ResultSetHeader, any];

    return this.findById(result.insertId) as Promise<Product>;
  }

  /**
   * Update product information
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
      location_id?: number;
    }
  ): Promise<Product | null> {
    const {
      subcategory_id,
      name,
      unit,
      source_type,
      category,
      min_stock_threshold,
      location_id
    } = productData;

    // Check if the product exists
    const product = await this.findById(id);
    if (!product) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }

    // If name is being updated, check for duplicates
    if (name && name !== product.name) {
      const [existingProducts] = await db.execute(
        'SELECT id FROM Products WHERE name = ? AND id != ?',
        [name, id]
      ) as [any[], any];

      if (existingProducts.length > 0) {
        throw ERRORS.DUPLICATE_RESOURCE;
      }
    }

    // Build dynamic update query
    let query = 'UPDATE Products SET ';
    const params: any[] = [];

    if (subcategory_id !== undefined) {
      query += 'subcategory_id = ?, ';
      params.push(subcategory_id);
    }

    if (name !== undefined) {
      query += 'name = ?, ';
      params.push(name);
    }

    if (unit !== undefined) {
      query += 'unit = ?, ';
      params.push(unit);
    }

    if (source_type !== undefined) {
      query += 'source_type = ?, ';
      params.push(source_type);
    }

    if (category !== undefined) {
      query += 'category = ?, ';
      params.push(category);
    }

    if (min_stock_threshold !== undefined) {
      query += 'min_stock_threshold = ?, ';
      params.push(min_stock_threshold);
    }

    if (location_id !== undefined) {
      query += 'location_id = ?, ';
      params.push(location_id);
    }

    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);

    await db.execute(query, params);

    return this.findById(id);
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number): Promise<boolean> {
    // Check if product exists
    const product = await this.findById(id);
    if (!product) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }

    // Check if product is used as a component in any product formulas
    const [productInFormulas] = await db.execute(
      'SELECT COUNT(*) as count FROM ProductFormula WHERE component_id = ?',
      [id]
    ) as [any[], any];
    
    if (productInFormulas[0].count > 0) {
      throw ERRORS.PRODUCT_IN_USE;
    }
    
    // Check if product has a formula (is a parent product)
    const [productHasFormula] = await db.execute(
      'SELECT COUNT(*) as count FROM ProductFormula WHERE product_id = ?',
      [id]
    ) as [any[], any];
    
    if (productHasFormula[0].count > 0) {
      throw ERRORS.PRODUCT_HAS_FORMULA;
    }

    const [result] = await db.execute(
      'DELETE FROM Products WHERE id = ?',
      [id]
    ) as [ResultSetHeader, any];

    return result.affectedRows > 0;
  }

  /**
   * Search products with flexible filtering options
   */
  async searchProducts(filters: ProductSearchParams): Promise<{ products: Product[], total: number }> {
    const {
      search,
      category,
      subcategory_id,
      location_id,
      source_type,
      formula_id,
      component_id,
      is_parent,
      is_component,
      page = 1,
      limit = 10
    } = filters;

    // Start building the query
    let baseQuery = `
      SELECT SQL_CALC_FOUND_ROWS p.*, 
      s.name as subcategory_name, 
      l.name as location_name
      FROM Products p
      JOIN Subcategories s ON p.subcategory_id = s.id
      JOIN Locations l ON p.location_id = l.id
    `;

    // Initialize where clauses and parameters
    const whereClauses: string[] = [];
    const params: any[] = [];

    // Add filter conditions
    if (search) {
      whereClauses.push('(p.name LIKE ? OR p.unit LIKE ? OR s.name LIKE ? OR l.name LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
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

    // Formula-related filters - Use direct strings for EXISTS/NOT EXISTS clauses
    if (is_parent !== undefined) {
      if (is_parent) {
        whereClauses.push('EXISTS (SELECT 1 FROM ProductFormula pf WHERE pf.product_id = p.id)');
      } else {
        whereClauses.push('NOT EXISTS (SELECT 1 FROM ProductFormula pf WHERE pf.product_id = p.id)');
      }
    }

    if (is_component !== undefined) {
      if (is_component) {
        whereClauses.push('EXISTS (SELECT 1 FROM ProductFormula pf WHERE pf.component_id = p.id)');
      } else {
        whereClauses.push('NOT EXISTS (SELECT 1 FROM ProductFormula pf WHERE pf.component_id = p.id)');
      }
    }

    if (formula_id !== undefined && formula_id !== null) {
      whereClauses.push('EXISTS (SELECT 1 FROM ProductFormula pf WHERE pf.product_id = p.id AND pf.id = ?)');
      params.push(formula_id);
    }

    if (component_id !== undefined && component_id !== null) {
      whereClauses.push('EXISTS (SELECT 1 FROM ProductFormula pf WHERE pf.product_id = p.id AND pf.component_id = ?)');
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
      const [products] = await db.execute(paginatedQuery, params) as [Product[], any];
      
      // Get total count (without parameters)
      const [countResult] = await db.execute('SELECT FOUND_ROWS() as total') as [any[], any];
      const total = countResult[0].total;

      return { products, total };
    } catch (error) {
      console.error('Search products error:', error);
      throw ERRORS.PRODUCT_SEARCH_FAILED;
    }
  }
}

export const productRepository = new ProductRepository();

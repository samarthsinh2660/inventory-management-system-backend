import { db } from '../database/db.ts';
import { Subcategory, SubcategoryCreateParams, SubcategoryUpdateParams } from '../models/subCategories.model.ts';
import { ResultSetHeader } from 'mysql2';
import { ERRORS } from '../utils/error.ts';

export class SubcategoryRepository {
  /**
   * Find a subcategory by its ID
   */
  async findById(id: number): Promise<Subcategory | null> {
    const [subcategories] = await db.execute(
      'SELECT * FROM Subcategories WHERE id = ?',
      [id]
    ) as [Subcategory[], any];

    return subcategories.length ? subcategories[0] : null;
  }

  /**
   * Find a subcategory by name
   */
  async findByName(name: string): Promise<Subcategory | null> {
    const [subcategories] = await db.execute(
      'SELECT * FROM Subcategories WHERE name = ?',
      [name]
    ) as [Subcategory[], any];

    return subcategories.length ? subcategories[0] : null;
  }

  /**
   * Get all subcategories
   */
  async getAllSubcategories(): Promise<Subcategory[]> {
    const [subcategories] = await db.execute(
      'SELECT * FROM Subcategories ORDER BY name'
    ) as [Subcategory[], any];

    return subcategories;
  }

  /**
   * Create a new subcategory
   */
  async create(subcategory: SubcategoryCreateParams): Promise<Subcategory> {
    const { name, description } = subcategory;
    
    // Check for duplicate subcategory name
    const [existingSubcategories] = await db.execute(
      'SELECT id FROM Subcategories WHERE name = ?',
      [name]
    ) as [any[], any];

    if (existingSubcategories.length > 0) {
      throw ERRORS.DUPLICATE_SUBCATEGORY_NAME;
    }

    const [result] = await db.execute(
      'INSERT INTO Subcategories (name, description) VALUES (?, ?)',
      [name, description || null]
    ) as [ResultSetHeader, any];

    const newSubcategory = await this.findById(result.insertId);
    if (!newSubcategory) {
      throw ERRORS.SUBCATEGORY_CREATION_FAILED;
    }

    return newSubcategory;
  }

  /**
   * Update subcategory
   */
  async update(id: number, subcategoryData: SubcategoryUpdateParams): Promise<Subcategory> {
    const { name, description } = subcategoryData;
    
    // Check if the subcategory exists
    const subcategory = await this.findById(id);
    if (!subcategory) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }

    // Check for duplicate subcategory name
    if (name && name !== subcategory.name) {
      const [existingSubcategories] = await db.execute(
        'SELECT id FROM Subcategories WHERE name = ? AND id != ?',
        [name, id]
      ) as [any[], any];

      if (existingSubcategories.length > 0) {
        throw ERRORS.DUPLICATE_RESOURCE;
      }
    }

    // Build dynamic update query
    let query = 'UPDATE Subcategories SET ';
    const params: any[] = [];

    if (name !== undefined) {
      query += 'name = ?, ';
      params.push(name);
    }

    if (description !== undefined) {
      query += 'description = ?, ';
      params.push(description);
    }

    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);

    await db.execute(query, params);

    const updatedSubcategory = await this.findById(id);
    if (!updatedSubcategory) {
      throw ERRORS.SUBCATEGORY_UPDATE_FAILED;
    }

    return updatedSubcategory;
  }

  /**
   * Delete a subcategory
   */
  async deleteSubcategory(id: number): Promise<boolean> {
    // Check if subcategory exists
    const subcategory = await this.findById(id);
    if (!subcategory) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }
    
    // Check if subcategory is in use by any products
    const [productsUsingSubcategory] = await db.execute(
      'SELECT COUNT(*) as count FROM Products WHERE subcategory_id = ?',
      [id]
    ) as [any[], any];
    
    if (productsUsingSubcategory[0].count > 0) {
      throw ERRORS.SUBCATEGORY_IN_USE;
    }

    const [result] = await db.execute(
      'DELETE FROM Subcategories WHERE id = ?',
      [id]
    ) as [ResultSetHeader, any];

    return result.affectedRows > 0;
  }
}

export const subcategoryRepository = new SubcategoryRepository();

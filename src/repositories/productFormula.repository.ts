import { db } from '../database/db.ts';
import { ProductFormula, ProductFormulaCreateParams, ProductFormulaUpdateParams, ProductFormulaWithNames } from '../models/productFormula.model.ts';
import { ResultSetHeader } from 'mysql2';
import { ERRORS } from '../utils/error.ts';

export class ProductFormulaRepository {
  /**
   * Find a product formula component by its ID
   */
  async findById(id: number): Promise<ProductFormulaWithNames | null> {
    const [formulaComponents] = await db.execute(
      `SELECT f.*, 
        parent.name as product_name, 
        component.name as component_name,
        component.unit as component_unit
       FROM ProductFormula f
       JOIN Products parent ON f.product_id = parent.id
       JOIN Products component ON f.component_id = component.id
       WHERE f.id = ?`,
      [id]
    ) as [ProductFormulaWithNames[], any];

    return formulaComponents.length ? formulaComponents[0] : null;
  }

  /**
   * Get all formula components
   */
  async getAllFormulas(): Promise<ProductFormulaWithNames[]> {
    const [formulaComponents] = await db.execute(
      `SELECT f.*, 
        parent.name as product_name, 
        component.name as component_name,
        component.unit as component_unit
       FROM ProductFormula f
       JOIN Products parent ON f.product_id = parent.id
       JOIN Products component ON f.component_id = component.id
       ORDER BY f.product_id`
    ) as [ProductFormulaWithNames[], any];

    return formulaComponents;
  }

  /**
   * Get formula components by product ID
   */
  async getByProductId(productId: number): Promise<ProductFormulaWithNames[]> {
    const [formulaComponents] = await db.execute(
      `SELECT f.*, 
        parent.name as product_name, 
        component.name as component_name,
        component.unit as component_unit
       FROM ProductFormula f
       JOIN Products parent ON f.product_id = parent.id
       JOIN Products component ON f.component_id = component.id
       WHERE f.product_id = ?
       ORDER BY f.id`,
      [productId]
    ) as [ProductFormulaWithNames[], any];

    return formulaComponents;
  }

  /**
   * Check if adding a component to a product would create a circular dependency
   */
  async checkCircularDependency(productId: number, componentId: number): Promise<boolean> {
    // Implementation to check for circular dependencies in the formula
    const [result] = await db.execute(
      `WITH RECURSIVE FormulaChain AS (
        SELECT component_id, product_id, 1 as depth
        FROM ProductFormula
        WHERE product_id = ?
        UNION ALL
        SELECT f.component_id, f.product_id, fc.depth + 1
        FROM ProductFormula f
        JOIN FormulaChain fc ON f.product_id = fc.component_id
        WHERE fc.depth < 10
      )
      SELECT COUNT(*) as count FROM FormulaChain WHERE component_id = ?`,
      [componentId, productId]
    ) as [any[], any];

    return result[0].count > 0;
  }

  /**
   * Add a component to a product formula
   */
  async addComponent(formulaComponent: ProductFormulaCreateParams): Promise<ProductFormulaWithNames> {
    const { product_id, component_id, quantity } = formulaComponent;

    // Prevent self-reference
    if (product_id === component_id) {
      throw ERRORS.SELF_REFERENCE_ERROR;
    }

    // Check for circular dependency
    const hasCircularDependency = await this.checkCircularDependency(product_id, component_id);
    if (hasCircularDependency) {
      throw ERRORS.CIRCULAR_DEPENDENCY_ERROR;
    }

    // Check if product exists
    const [productExists] = await db.execute(
      'SELECT id FROM Products WHERE id = ?',
      [product_id]
    ) as [any[], any];

    if (!productExists.length) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }

    // Check if component exists
    const [componentExists] = await db.execute(
      'SELECT id FROM Products WHERE id = ?',
      [component_id]
    ) as [any[], any];

    if (!componentExists.length) {
      throw ERRORS.PRODUCT_NOT_FOUND;
    }

    // Check if the component already exists in the formula
    const [existingFormula] = await db.execute(
      'SELECT id FROM ProductFormula WHERE product_id = ? AND component_id = ?',
      [product_id, component_id]
    ) as [any[], any];

    if (existingFormula.length) {
      throw ERRORS.COMPONENT_ALREADY_EXISTS;
    }

    const [result] = await db.execute(
      'INSERT INTO ProductFormula (product_id, component_id, quantity) VALUES (?, ?, ?)',
      [product_id, component_id, quantity]
    ) as [ResultSetHeader, any];

    const formulaId = result.insertId;
    return this.findById(formulaId) as Promise<ProductFormulaWithNames>;
  }

  /**
   * Update a product formula component
   */
  async updateComponent(id: number, updateData: ProductFormulaUpdateParams): Promise<ProductFormulaWithNames> {
    // Check if formula exists
    const formula = await this.findById(id);
    if (!formula) {
      throw ERRORS.FORMULA_COMPONENT_NOT_FOUND;
    }

    await db.execute(
      'UPDATE ProductFormula SET quantity = ? WHERE id = ?',
      [updateData.quantity, id]
    );

    return this.findById(id) as Promise<ProductFormulaWithNames>;
  }

  /**
   * Delete formula component
   */
  async deleteComponent(id: number): Promise<void> {
    // Check if formula exists
    const formula = await this.findById(id);
    if (!formula) {
      throw ERRORS.FORMULA_COMPONENT_NOT_FOUND;
    }

    const [result] = await db.execute(
      'DELETE FROM ProductFormula WHERE id = ?',
      [id]
    ) as [ResultSetHeader, any];

    if (result.affectedRows === 0) {
      throw ERRORS.FORMULA_DELETION_FAILED;
    }
  }

  /**
   * Clear all formula components for a product
   */
  async clearProductFormula(productId: number): Promise<void> {
    await db.execute(
      'DELETE FROM ProductFormula WHERE product_id = ?',
      [productId]
    );
  }
}

export const productFormulaRepository = new ProductFormulaRepository();

import { db } from '../database/db.ts';
import { ProductFormula, ProductFormulaCreateParams, ProductFormulaUpdateParams, FormulaComponentData } from '../models/productFormula.model.ts';
import { ResultSetHeader } from 'mysql2';
import { ERRORS } from '../utils/error.ts';
import { Product } from '../models/products.model.ts';

export class ProductFormulaRepository {
  /**
   * Find a product formula by its ID
   */
  async findById(id: number): Promise<ProductFormula | null> {
    const [formulas] = await db.execute(
      `SELECT * FROM ProductFormula WHERE id = ?`,
      [id]
    ) as [any[], any];

    if (!formulas.length) {
      return null;
    }

    const formula = formulas[0] as ProductFormula;
    
    // Parse JSON components
    if (formula.components && typeof formula.components === 'string') {
      formula.components = JSON.parse(formula.components as unknown as string);
    }

    return formula;
  }

  /**
   * Get all formulas
   */
  async getAllFormulas(): Promise<ProductFormula[]> {
    const [formulas] = await db.execute(
      `SELECT * FROM ProductFormula ORDER BY name`
    ) as [any[], any];

    return formulas.map((formula: any) => {
      if (formula.components && typeof formula.components === 'string') {
        formula.components = JSON.parse(formula.components);
      }
      return formula;
    });
  }

  /**
   * Get formula by name
   */
  async getByName(name: string): Promise<ProductFormula | null> {
    const [formulas] = await db.execute(
      `SELECT * FROM ProductFormula WHERE name = ?`,
      [name]
    ) as [any[], any];

    if (!formulas.length) {
      return null;
    }

    const formula = formulas[0] as ProductFormula;
    
    // Parse JSON components
    if (formula.components && typeof formula.components === 'string') {
      formula.components = JSON.parse(formula.components as unknown as string);
    }

    return formula;
  }

  /**
   * Create a new formula
   */
  async create(formulaData: ProductFormulaCreateParams): Promise<ProductFormula> {
    const { name, description, components } = formulaData;

    // Check if formula with this name already exists
    const existingFormula = await this.getByName(name);
    if (existingFormula) {
      throw ERRORS.PRODUCT_FORMULA_NAME_EXISTS;
    }

    // Validate components exist in products
    for (const component of components) {
      const [productExists] = await db.execute(
        'SELECT id, name FROM Products WHERE id = ?',
        [component.component_id]
      ) as [any[], any];

      if (!productExists.length) {
        throw ERRORS.FORMULA_COMPONENT_NOT_FOUND;
      }

      // Enhance component with product name
      component.component_name = productExists[0].name;
    }

    // Generate unique IDs for components
    const componentsWithIds = components.map((component, index) => ({
      ...component,
      id: index + 1
    }));

    // Store formula with JSON components
    const [result] = await db.execute(
      `INSERT INTO ProductFormula (name, description, components) VALUES (?, ?, ?)`,
      [name, description || null, JSON.stringify(componentsWithIds)]
    ) as [ResultSetHeader, any];

    return this.findById(result.insertId) as Promise<ProductFormula>;
  }

  /**
   * Update a product formula
   */
  async update(id: number, updateData: ProductFormulaUpdateParams): Promise<ProductFormula> {
    // Check if formula exists
    const formula = await this.findById(id);
    if (!formula) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }

    const { name, description, components } = updateData;
    const updates = [];
    const params = [];

    // Build update statement based on provided fields
    if (name !== undefined) {
      // Check for name duplicates if name is being changed
      if (name !== formula.name) {
        const existingFormula = await this.getByName(name);
        if (existingFormula) {
          throw ERRORS.PRODUCT_FORMULA_NAME_EXISTS;
        }
      }
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (components !== undefined) {
      // Validate components exist in products
      for (const component of components) {
        const [productExists] = await db.execute(
          'SELECT id, name FROM Products WHERE id = ?',
          [component.component_id]
        ) as [any[], any];

        if (!productExists.length) {
          throw ERRORS.FORMULA_COMPONENT_NOT_FOUND;
        }

        // Enhance component with product name
        component.component_name = productExists[0].name;
      }

      // Generate unique IDs for components if they don't have them
      const componentsWithIds = components.map((component, index) => ({
        ...component,
        id: component.id || index + 1
      }));

      updates.push('components = ?');
      params.push(JSON.stringify(componentsWithIds));
    }

    if (updates.length === 0) {
      return formula; // Nothing to update
    }

    // Add ID to params array for WHERE clause
    params.push(id);

    await db.execute(
      `UPDATE ProductFormula SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id) as Promise<ProductFormula>;
  }

  /**
   * Delete a formula
   */
  async delete(id: number): Promise<boolean> {
    // Check if formula exists
    const formula = await this.findById(id);
    if (!formula) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }

    // Check if any product is using this formula
    const [productsUsingFormula] = await db.execute(
      'SELECT id FROM Products WHERE product_formula_id = ?',
      [id]
    ) as [any[], any];

    if (productsUsingFormula.length > 0) {
      throw ERRORS.FORMULA_IN_USE;
    }

    const [result] = await db.execute(
      'DELETE FROM ProductFormula WHERE id = ?',
      [id]
    ) as [ResultSetHeader, any];

    return result.affectedRows > 0;
  }

  /**
   * Get products using a specific formula
   */
  async getProductsUsingFormula(formulaId: number): Promise<Product[]> {
    const [products] = await db.execute(
      `SELECT p.* FROM Products p
       WHERE p.product_formula_id = ?`,
      [formulaId]
    ) as [Product[], any];

    return products;
  }

  /**
   * Add or update a component in a formula
   */
  async updateFormulaComponent(formulaId: number, componentData: FormulaComponentData): Promise<ProductFormula> {
    const formula = await this.findById(formulaId);
    if (!formula) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }

    // Validate component exists in products
    const [productExists] = await db.execute(
      'SELECT id, name FROM Products WHERE id = ?',
      [componentData.component_id]
    ) as [any[], any];

    if (!productExists.length) {
      throw ERRORS.FORMULA_COMPONENT_NOT_FOUND;
    }

    const components = formula.components || [];
    const componentIndex = componentData.id ? 
      components.findIndex(c => c.id === componentData.id) : 
      components.findIndex(c => c.component_id === componentData.component_id);

    if (componentIndex >= 0) {
      // Update existing component
      components[componentIndex] = {
        ...components[componentIndex],
        ...componentData,
        component_name: productExists[0].name
      };
    } else {
      // Add new component
      components.push({
        id: components.length > 0 ? Math.max(...components.map(c => c.id)) + 1 : 1,
        component_id: componentData.component_id,
        component_name: productExists[0].name,
        quantity: componentData.quantity
      });
    }

    // Update formula with modified components
    await db.execute(
      'UPDATE ProductFormula SET components = ? WHERE id = ?',
      [JSON.stringify(components), formulaId]
    );

    return this.findById(formulaId) as Promise<ProductFormula>;
  }

  /**
   * Remove a component from a formula
   */
  async removeFormulaComponent(formulaId: number, componentId: number): Promise<ProductFormula> {
    const formula = await this.findById(formulaId);
    if (!formula) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }

    if (!formula.components) {
      throw ERRORS.PRODUCT_FORMULA_NOT_FOUND;
    }

    const updatedComponents = formula.components.filter(c => c.id !== componentId);
    
    if (updatedComponents.length === formula.components.length) {
      throw ERRORS.FORMULA_COMPONENT_NOT_FOUND;
    }

    // Update formula with modified components
    await db.execute(
      'UPDATE ProductFormula SET components = ? WHERE id = ?',
      [JSON.stringify(updatedComponents), formulaId]
    );

    return this.findById(formulaId) as Promise<ProductFormula>;
  }
}

export const productFormulaRepository = new ProductFormulaRepository();

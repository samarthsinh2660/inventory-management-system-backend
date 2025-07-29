import { db } from '../database/db.ts';
import { PurchaseInfo, PurchaseInfoCreateParams, PurchaseInfoUpdateParams } from '../models/purchaseInfo.model.ts';
import { ResultSetHeader } from 'mysql2';
import { ERRORS } from '../utils/error.ts';

export class PurchaseInfoRepository {
  /**
   * Find a purchase info by its ID
   */
  async findById(id: number): Promise<PurchaseInfo | null> {
    const [purchaseInfos] = await db.execute(
      'SELECT * FROM PurchaseInfo WHERE id = ?',
      [id]
    ) as [PurchaseInfo[], any];

    return purchaseInfos.length ? purchaseInfos[0] : null;
  }

  /**
   * Find purchase info by business name
   */
  async findByBusinessName(businessName: string): Promise<PurchaseInfo | null> {
    const [purchaseInfos] = await db.execute(
      'SELECT * FROM PurchaseInfo WHERE business_name = ?',
      [businessName]
    ) as [PurchaseInfo[], any];

    return purchaseInfos.length ? purchaseInfos[0] : null;
  }

  /**
   * Get all purchase infos
   */
  async getAllPurchaseInfos(): Promise<PurchaseInfo[]> {
    const [purchaseInfos] = await db.execute(
      'SELECT * FROM PurchaseInfo ORDER BY business_name'
    ) as [PurchaseInfo[], any];

    return purchaseInfos;
  }

  /**
   * Search purchase infos by business name or email
   */
  async searchPurchaseInfos(searchTerm: string): Promise<PurchaseInfo[]> {
    const [purchaseInfos] = await db.execute(
      'SELECT * FROM PurchaseInfo WHERE business_name LIKE ? OR email LIKE ? ORDER BY business_name',
      [`%${searchTerm}%`, `%${searchTerm}%`]
    ) as [PurchaseInfo[], any];

    return purchaseInfos;
  }

  /**
   * Create a new purchase info
   */
  async create(purchaseInfo: PurchaseInfoCreateParams): Promise<PurchaseInfo> {
    const { business_name, address, phone_number, email, gst_number } = purchaseInfo;
    
    // Check for duplicate business name
    const [existingPurchaseInfos] = await db.execute(
      'SELECT id FROM PurchaseInfo WHERE business_name = ?',
      [business_name]
    ) as [any[], any];

    if (existingPurchaseInfos.length > 0) {
      throw ERRORS.DUPLICATE_RESOURCE;
    }

    const [result] = await db.execute(
      'INSERT INTO PurchaseInfo (business_name, address, phone_number, email, gst_number) VALUES (?, ?, ?, ?, ?)',
      [business_name, address || null, phone_number || null, email || null, gst_number || null]
    ) as [ResultSetHeader, any];

    const newPurchaseInfo = await this.findById(result.insertId);
    if (!newPurchaseInfo) {
      throw ERRORS.DATABASE_ERROR;
    }

    return newPurchaseInfo;
  }

  /**
   * Update purchase info
   */
  async update(id: number, purchaseInfoData: PurchaseInfoUpdateParams): Promise<PurchaseInfo> {
    const { business_name, address, phone_number, email, gst_number } = purchaseInfoData;
    
    // Check if the purchase info exists
    const purchaseInfo = await this.findById(id);
    if (!purchaseInfo) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }

    // Check for duplicate business name if changing name
    if (business_name && business_name !== purchaseInfo.business_name) {
      const [existingPurchaseInfos] = await db.execute(
        'SELECT id FROM PurchaseInfo WHERE business_name = ? AND id != ?',
        [business_name, id]
      ) as [any[], any];

      if (existingPurchaseInfos.length > 0) {
        throw ERRORS.DUPLICATE_RESOURCE;
      }
    }

    // Build dynamic update query
    let query = 'UPDATE PurchaseInfo SET ';
    const params: any[] = [];

    if (business_name !== undefined) {
      query += 'business_name = ?, ';
      params.push(business_name);
    }

    if (address !== undefined) {
      query += 'address = ?, ';
      params.push(address);
    }

    if (phone_number !== undefined) {
      query += 'phone_number = ?, ';
      params.push(phone_number);
    }

    if (email !== undefined) {
      query += 'email = ?, ';
      params.push(email);
    }

    if (gst_number !== undefined) {
      query += 'gst_number = ?, ';
      params.push(gst_number);
    }

    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);

    await db.execute(query, params);

    const updatedPurchaseInfo = await this.findById(id);
    if (!updatedPurchaseInfo) {
      throw ERRORS.DATABASE_ERROR;
    }

    return updatedPurchaseInfo;
  }

  /**
   * Delete a purchase info
   */
  async deletePurchaseInfo(id: number): Promise<boolean> {
    // Check if purchase info exists
    const purchaseInfo = await this.findById(id);
    if (!purchaseInfo) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }
    
    // Check if purchase info is in use by any products
    const [productsUsingPurchaseInfo] = await db.execute(
      'SELECT COUNT(*) as count FROM Products WHERE purchase_info_id = ?',
      [id]
    ) as [any[], any];
    
    if (productsUsingPurchaseInfo[0].count > 0) {
      throw ERRORS.RESOURCE_IN_USE;
    }

    const [result] = await db.execute(
      'DELETE FROM PurchaseInfo WHERE id = ?',
      [id]
    ) as [ResultSetHeader, any];

    return result.affectedRows > 0;
  }

  /**
   * Get products associated with a purchase info
   */
  async getProductsByPurchaseInfo(id: number): Promise<any[]> {
    const [products] = await db.execute(`
      SELECT p.id, p.name, p.unit, p.category, p.price,
             s.name as subcategory_name,
             l.name as location_name
      FROM Products p
      LEFT JOIN Subcategories s ON p.subcategory_id = s.id
      LEFT JOIN Locations l ON p.location_id = l.id
      WHERE p.purchase_info_id = ?
      ORDER BY p.name
    `, [id]) as [any[], any];

    return products;
  }
}

export const purchaseInfoRepository = new PurchaseInfoRepository();

import { RowDataPacket, Pool } from 'mysql2/promise';
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
  async getProductsBelowThreshold(tenantPool: Pool): Promise<LowStockProduct[]> {
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
      
      const [products] = await tenantPool.execute<RowDataPacket[]>(query);
      return products as LowStockProduct[];
    } catch (error) {
      console.error("Error getting products below threshold:", error);
      return [];
    }
  }

  /**
   * Get all master users who should receive notifications
   */
  async getMasterUsers(tenantPool: Pool): Promise<User[]> {
    try {
      const [users] = await tenantPool.execute<RowDataPacket[]>(
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
   * Also resolve alerts and notifications for products that are now above threshold
   * This is the main method to be called after inventory changes
   */
  async checkAndSendAlerts(tenantPool: Pool): Promise<void> {
    try {
      const lowStockProducts = await this.getProductsBelowThreshold(tenantPool);
      
      // Resolve alerts and notifications for products that are now above threshold
      await this.resolveRefilledAlerts(tenantPool, lowStockProducts);
      
      if (lowStockProducts.length === 0) {
        return; // No new alerts needed
      }
      
      const masterUsers = await this.getMasterUsers(tenantPool);
      
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
      await this.storeAlerts(lowStockProducts, tenantPool);
      
      // Create in-app notifications for each master user for dashboard display
      await this.createInAppNotifications(lowStockProducts, masterUsers, tenantPool);
      
    } catch (error) {
      console.error("Error in checking and sending alerts:", error);
    }
  }

  /**
   * Store alerts in the database for retrieval via API
   */
  private async storeAlerts(products: LowStockProduct[], tenantPool: Pool): Promise<void> {
    try {
      // Insert new alerts, avoiding duplicates
      for (const product of products) {
        // Check if there's already an unresolved alert for this product
        const [existingAlerts] = await tenantPool.execute<RowDataPacket[]>(
          'SELECT id FROM StockAlerts WHERE product_id = ? AND is_resolved = false',
          [product.id]
        );
        
        // If no existing unresolved alert, create one
        if (existingAlerts.length === 0) {
          await tenantPool.execute(
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
          await tenantPool.execute(
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
    masterUsers: User[],
    tenantPool: Pool
  ): Promise<void> {
    try {
      // For each product, create or update notification
      for (const product of products) {
        // First check if we already have unread notifications for this product
        const [existingNotifications] = await tenantPool.execute<RowDataPacket[]>(
          `SELECT id, current_stock FROM Notifications 
           WHERE product_id = ? AND is_read = false`,
          [product.id]
        );
        
        // Create updated message with current stock level
        const message = `Low stock alert: ${product.name} is below minimum threshold (${product.current_stock}/${product.min_stock_threshold})`;
        
        if (existingNotifications.length > 0) {
          // Update existing notification with current stock level and message
          const existingNotification = existingNotifications[0];
          
          // Only update if the stock level has changed
          if (existingNotification.current_stock !== product.current_stock) {
            await tenantPool.execute(
              `UPDATE Notifications 
               SET current_stock = ?, message = ? 
               WHERE id = ?`,
              [
                product.current_stock,
                message,
                existingNotification.id
              ]
            );
          }
        } else {
          // Create new notification if none exists
          // First get the corresponding stock alert if available
          const [stockAlerts] = await tenantPool.execute<RowDataPacket[]>(
            'SELECT id FROM StockAlerts WHERE product_id = ? AND is_resolved = false',
            [product.id]
          );
          
          const stock_alert_id = stockAlerts.length > 0 ? stockAlerts[0].id : null;
          
          await tenantPool.execute(
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
      }
    } catch (error) {
      console.error("Error creating in-app notifications:", error);
    }
  }
  
  /**
   * Resolve alerts and notifications for products that are now above their threshold
   */
  private async resolveRefilledAlerts(tenantPool: Pool, currentLowStockProducts: LowStockProduct[]): Promise<void> {
    try {
      // Get all currently unresolved alerts
      const [unresolvedAlerts] = await tenantPool.execute<RowDataPacket[]>(
        'SELECT product_id FROM StockAlerts WHERE is_resolved = false'
      );
      
      // Find products that had alerts but are no longer in the low stock list
      const currentLowStockProductIds = new Set(currentLowStockProducts.map(p => p.id));
      const productsToResolve = unresolvedAlerts
        .map(alert => alert.product_id)
        .filter(productId => !currentLowStockProductIds.has(productId));
      
      if (productsToResolve.length > 0) {
        console.log(`RESOLVED: ${productsToResolve.length} products are now above minimum threshold`);
        
        // Resolve stock alerts for these products
        for (const productId of productsToResolve) {
          await tenantPool.execute(
            'UPDATE StockAlerts SET is_resolved = true, resolved_at = NOW() WHERE product_id = ? AND is_resolved = false',
            [productId]
          );
        }
        
        // Mark notifications as read for these products
        for (const productId of productsToResolve) {
          await tenantPool.execute(
            'UPDATE Notifications SET is_read = true WHERE product_id = ? AND is_read = false',
            [productId]
          );
        }
        
        // Log which products were resolved
        for (const productId of productsToResolve) {
          const [productInfo] = await tenantPool.execute<RowDataPacket[]>(
            'SELECT name FROM Products WHERE id = ?',
            [productId]
          );
          if (productInfo.length > 0) {
            console.log(`Product: ${productInfo[0].name} - Alert resolved (stock refilled above threshold)`);
          }
        }
      }
    } catch (error) {
      console.error("Error resolving refilled alerts:", error);
    }
  }

}

export default new AlertService();

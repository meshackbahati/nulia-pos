import models from '../models/index.js';
import emailService from '../lib/email.js';
import { Op } from 'sequelize';

class NotificationService {
  /**
   * Resolves the list of email recipients for a given branch.
   * Includes Branch Manager, Head of Sales (for that branch), and all Admins.
   * Also checks for a configured support email in settings.
   */
  async getBranchRecipients(branchId) {
    const recipients = new Set();

    // 1. Get Branch-specific roles (Manager and Head of Sales)
    const branchUsers = await models.User.findAll({
      where: {
        branchId,
        isActive: true,
        role: { [Op.in]: ['manager', 'head_of_sales'] }
      },
      attributes: ['email']
    });
    branchUsers.forEach(user => recipients.add(user.email));

    // 2. Get all Admins (Global)
    const admins = await models.User.findAll({
      where: {
        role: 'admin',
        isActive: true
      },
      attributes: ['email']
    });
    admins.forEach(admin => recipients.add(admin.email));

    // 3. Check for configured support email in settings
    const supportEmailSetting = await models.Setting.findOne({
      where: {
        branchId,
        category: 'notifications',
        key: 'support_email'
      }
    });
    if (supportEmailSetting && supportEmailSetting.value) {
      recipients.add(supportEmailSetting.value);
    }

    return Array.from(recipients);
  }

  /**
   * Send real-time notification that a new product was added.
   */
  async notifyNewProduct(branchId, productName) {
    try {
      const branch = await models.Branch.findByPk(branchId);
      if (!branch) return;
      const recipients = await this.getBranchRecipients(branchId);
      if (recipients.length === 0) return;
      await emailService.sendNewProductAlert(recipients.join(','), branch.name, productName);
    } catch (error) {
      console.error('[Notification] notifyNewProduct error:', error.message);
    }
  }

  /**
   * Send real-time notification that a product was removed/deactivated.
   */
  async notifyProductRemoved(branchId, productName) {
    try {
      const branch = await models.Branch.findByPk(branchId);
      if (!branch) return;
      const recipients = await this.getBranchRecipients(branchId);
      if (recipients.length === 0) return;
      await emailService.sendProductRemovedAlert(recipients.join(','), branch.name, productName);
    } catch (error) {
      console.error('[Notification] notifyProductRemoved error:', error.message);
    }
  }

  /**
   * Send real-time stock alert (out of stock or low stock).
   */
  async notifyStockAlert(branchId, productName, type, available, minLevel) {
    try {
      const branch = await models.Branch.findByPk(branchId);
      if (!branch) return;
      const recipients = await this.getBranchRecipients(branchId);
      if (recipients.length === 0) return;
      await emailService.sendStockAlert(recipients.join(','), branch.name, productName, type, available, minLevel);
    } catch (error) {
      console.error('[Notification] notifyStockAlert error:', error.message);
    }
  }

  /**
   * Sends weekly summary report to all branches.
   * Includes low stock / out of stock items and weekly sales totals.
   */
  async sendWeeklySummary() {
    const branches = await models.Branch.findAll({ where: { isActive: true } });
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekLabel = `${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`;

    for (const branch of branches) {
      try {
        const recipients = await this.getBranchRecipients(branch.id);
        if (recipients.length === 0) continue;

        // Fetch inventory
        const inventoryItems = await models.Inventory.findAll({
          where: { branchId: branch.id },
          include: [{ model: models.Product, as: 'product' }]
        });

        const outOfStockItems = [];
        const lowStockItems = [];

        for (const item of inventoryItems) {
          const available = Number(item.quantity) - Number(item.reservedQuantity || 0);
          if (available <= 0) {
            outOfStockItems.push({ name: item.product.name, currentStock: 0 });
          } else if (available <= item.minStockLevel) {
            lowStockItems.push({
              name: item.product.name,
              currentStock: available,
              minLevel: item.minStockLevel
            });
          }
        }

        // Fetch weekly sales
        const sales = await models.Sale.findAll({
          where: {
            branchId: branch.id,
            createdAt: { [Op.gte]: weekAgo },
            status: 'completed'
          }
        });

        const saleCount = sales.length;
        let totalSales = 0;
        for (const sale of sales) {
          totalSales += Number(sale.totalAmount || 0);
        }
        const currencySymbol = branch.currency === 'KES' ? 'KES ' : '$';

        const reportData = {
          weekLabel,
          outOfStockItems,
          lowStockItems,
          saleCount,
          totalSales: `${currencySymbol}${totalSales.toFixed(2)}`,
        };

        await emailService.sendWeeklySummary(recipients.join(','), branch.name, reportData);
        console.log(`[Notification] Weekly summary sent to ${branch.name}`);
      } catch (error) {
        console.error(`[Notification] Error sending weekly summary for ${branch.name}:`, error.message);
      }
    }
  }
}

export default new NotificationService();

import models from '../models/index.js';
import emailService from '../lib/email.js';
import { Op } from 'sequelize';
import { triggerWebhook, WEBHOOK_EVENTS } from './webhookService.js';

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

      triggerWebhook(WEBHOOK_EVENTS.INVENTORY_LOW_STOCK, {
        branchId,
        productName,
        type,
        available,
        minLevel,
      }, branchId, null);
    } catch (error) {
      console.error('[Notification] notifyStockAlert error:', error.message);
    }
  }

  /**
   * Sends a daily end-of-day product status report to all branches.
   * Only sends if there is at least one item to report (out of stock or low stock).
   * Lists include product images.
   */
  async sendDailyProductStatus() {
    const branches = await models.Branch.findAll({ where: { isActive: true } });
    const now = new Date();
    const dateLabel = now.toLocaleDateString();

    for (const branch of branches) {
      try {
        const recipients = await this.getBranchRecipients(branch.id);
        if (recipients.length === 0) continue;

        const inventoryItems = await models.Inventory.findAll({
          where: { branchId: branch.id },
          include: [{ model: models.Product, as: 'product' }]
        });

        const outOfStockItems = [];
        const lowStockItems = [];

        for (const item of inventoryItems) {
          const available = Number(item.quantity) - Number(item.reservedQuantity || 0);
          const imageUrl = item.product.imageUrl || null;
          if (available <= 0) {
            outOfStockItems.push({ name: item.product.name, currentStock: 0, imageUrl });
          } else if (available <= item.minStockLevel) {
            lowStockItems.push({
              name: item.product.name,
              currentStock: available,
              minLevel: item.minStockLevel,
              imageUrl,
            });
          }
        }

        if (outOfStockItems.length === 0 && lowStockItems.length === 0) {
          console.log(`[Notification] No product status issues for ${branch.name}, skipping email.`);
          continue;
        }

        const reportData = {
          dateLabel,
          outOfStockItems,
          lowStockItems,
        };

        await emailService.sendDailyProductStatus(recipients.join(','), branch.name, reportData);
        console.log(`[Notification] Daily product status sent to ${branch.name}`);
      } catch (error) {
        console.error(`[Notification] Error sending daily product status for ${branch.name}:`, error.message);
      }
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

  /**
   * Broadcasts a server update notification to all admins, managers, and support recipients.
   */
  async notifyServerUpdate(updateData = {}) {
    try {
      const recipientsSet = new Set();

      // 1. Get all Admins, Managers, and Head of Sales
      const users = await models.User.findAll({
        where: {
          isActive: true,
          role: { [Op.in]: ['admin', 'manager', 'head_of_sales'] }
        },
        attributes: ['email']
      });
      users.forEach(u => recipientsSet.add(u.email));

      // 2. Get support emails from settings
      const supportSettings = await models.Setting.findAll({
        where: {
          category: 'notifications',
          key: 'support_email'
        }
      });
      supportSettings.forEach(s => {
        if (s.value) recipientsSet.add(s.value);
      });

      const recipients = Array.from(recipientsSet);
      if (recipients.length === 0) {
        console.log('[Notification] No recipients found for server update email.');
        return false;
      }

      await emailService.sendServerUpdateNotification(recipients.join(','), updateData);
      console.log(`[Notification] Server update email sent to ${recipients.length} recipient(s).`);
      return true;
    } catch (error) {
      console.error('[Notification] notifyServerUpdate error:', error.message);
      return false;
    }
  }
}

export default new NotificationService();

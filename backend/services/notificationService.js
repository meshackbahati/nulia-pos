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
   * Scans inventory and sends alerts for low stock and out of stock items.
   */
  async scanAndNotifyInventory(branchId) {
    const branch = await models.Branch.findByPk(branchId);
    if (!branch) return;

    const recipients = await this.getBranchRecipients(branchId);
    if (recipients.length === 0) return;

    // Fetch all inventory for this branch
    const inventoryItems = await models.Inventory.findAll({
      where: { branchId },
      include: [{ model: models.Product, as: 'product' }]
    });

    const lowStockItems = [];
    const outOfStockItems = [];

    for (const item of inventoryItems) {
      const available = Number(item.quantity) - Number(item.reservedQuantity || 0);
      
      if (available <= 0) {
        outOfStockItems.push({
          name: item.product.name,
          currentStock: 0
        });
      } else if (available <= item.minStockLevel) {
        lowStockItems.push({
          name: item.product.name,
          currentStock: available,
          minLevel: item.minStockLevel
        });
      }
    }

    // Send alerts
    if (outOfStockItems.length > 0) {
      for (const email of recipients) {
        await emailService.sendOutOfStockAlert(email, branch.name, outOfStockItems);
      }
    }

    if (lowStockItems.length > 0) {
      for (const email of recipients) {
        await emailService.sendLowStockAlert(email, branch.name, lowStockItems);
      }
    }
  }
}

export default new NotificationService();

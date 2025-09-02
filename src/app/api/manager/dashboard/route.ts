import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import models from '@/models';
import { Op } from 'sequelize';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'manager');

    // Get user's branch
    const user = await models.User.findByPk(auth.userId, {
      include: [
        {
          model: models.Branch,
          as: 'branch',
          attributes: ['id', 'name', 'currency', 'currencySymbol'],
        },
      ],
    });

    if (!user || !user.branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    const branchId = user.branch.id;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await models.Sale.count({
      where: {
        branchId,
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        paymentStatus: 'completed'
      }
    });

    const todayRevenueResult = await models.Sale.sum('totalAmount', {
      where: {
        branchId,
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        paymentStatus: 'completed'
      }
    });
    const todayRevenue = todayRevenueResult || 0;

    // Get total products for this branch
    const totalProducts = await models.Inventory.count({
      where: { branchId }
    });

    // Get low stock items
    const lowStockItems = await models.Inventory.count({
      where: {
        branchId,
        quantity: {
          [Op.lte]: models.Inventory.sequelize!.col('minStockLevel')
        }
      }
    });

    // Get active users for this branch
    const activeUsers = await models.User.count({
      where: {
        branchId,
        isActive: true
      }
    });

    // Get top products today
    const topProducts = await models.SaleItem.findAll({
      attributes: [
        'productId',
        [models.SaleItem.sequelize!.fn('SUM', models.SaleItem.sequelize!.col('quantity')), 'totalQuantity'],
        [models.SaleItem.sequelize!.fn('SUM', models.SaleItem.sequelize!.col('totalPrice')), 'totalRevenue'],
      ],
      include: [
        {
          model: models.Product,
          as: 'product',
          attributes: ['name'],
        },
        {
          model: models.Sale,
          as: 'sale',
          where: {
            branchId,
            createdAt: {
              [Op.gte]: today,
              [Op.lt]: tomorrow
            },
            paymentStatus: 'completed'
          },
          attributes: [],
        },
      ],
      group: ['productId', 'product.id', 'product.name'],
      order: [[models.SaleItem.sequelize!.fn('SUM', models.SaleItem.sequelize!.col('totalPrice')), 'DESC']],
      limit: 5,
    });

    // Get recent sales
    const recentSales = await models.Sale.findAll({
      where: {
        branchId,
        paymentStatus: 'completed'
      },
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['firstName', 'lastName'],
        },
      ],
    });

    const formattedTopProducts = topProducts.map((item: any) => ({
      name: item.product.name,
      quantity: parseInt(item.dataValues.totalQuantity),
      revenue: parseFloat(item.dataValues.totalRevenue),
    }));

    const formattedRecentSales = recentSales.map(sale => ({
      id: sale.id,
      receiptId: sale.receiptId,
      total: parseFloat(sale.totalAmount.toString()),
      customer: sale.customerPhone || sale.customerEmail,
      timestamp: sale.createdAt.toLocaleString(),
    }));

    return NextResponse.json({
      branchName: user.branch.name,
      stats: {
        todaySales,
        todayRevenue: parseFloat(todayRevenue.toString()),
        totalProducts,
        lowStockItems,
        activeUsers,
        topProducts: formattedTopProducts,
        recentSales: formattedRecentSales,
      },
    });

  } catch (error) {
    console.error('Manager dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
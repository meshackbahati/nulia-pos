import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import models from '@/models';
import { Op } from 'sequelize';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'admin');

    // Get total branches
    const totalBranches = await models.Branch.count();
    const activeBranches = await models.Branch.count({
      where: { isActive: true }
    });

    // Get total users
    const totalUsers = await models.User.count({
      where: { isActive: true }
    });

    // Get this month's sales
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const totalSales = await models.Sale.count({
      where: {
        createdAt: {
          [Op.gte]: startOfMonth
        },
        paymentStatus: 'completed'
      }
    });

    // Get this month's revenue
    const revenueResult = await models.Sale.sum('totalAmount', {
      where: {
        createdAt: {
          [Op.gte]: startOfMonth
        },
        paymentStatus: 'completed'
      }
    });
    const totalRevenue = revenueResult || 0;

    // Get recent activity from audit logs
    const recentActivity = await models.AuditLog.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['firstName', 'lastName'],
        },
        {
          model: models.Branch,
          as: 'branch',
          attributes: ['name'],
        },
      ],
    });

    const formattedActivity = recentActivity.map(log => ({
      id: log.id,
      action: log.action.replace(/_/g, ' ').toUpperCase(),
      user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      timestamp: log.createdAt.toLocaleString(),
      branch: log.branch?.name,
    }));

    return NextResponse.json({
      totalBranches,
      activeBranches,
      totalUsers,
      totalSales,
      totalRevenue,
      recentActivity: formattedActivity,
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { testConnection } from '@/lib/database';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await models.User.findOne({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'System is already installed' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, email, password, companyName } = body;

    // Validate input
    if (!firstName || !lastName || !email || !password || !companyName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Create the admin user
    const adminUser = await models.User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'admin',
      isActive: true,
    });

    // Create a default branch
    const defaultBranch = await models.Branch.create({
      name: `${companyName} - Main Branch`,
      address: 'Please update your branch address',
      phone: 'Please update your phone number',
      email: email,
      currency: process.env.DEFAULT_CURRENCY || 'USD',
      currencySymbol: process.env.DEFAULT_CURRENCY_SYMBOL || '$',
      timezone: 'UTC',
      isActive: true,
      metadata: {
        isDefault: true,
        setupComplete: false,
      },
    });

    // Create audit log for installation
    await createAuditLog({
      userId: adminUser.id,
      branchId: defaultBranch.id,
      action: AUDIT_ACTIONS.SYSTEM_BACKUP,
      resource: AUDIT_RESOURCES.SYSTEM,
      newValues: {
        adminCreated: true,
        defaultBranchCreated: true,
        companyName,
      },
      metadata: {
        installationDate: new Date().toISOString(),
        version: '1.0.0',
      },
    }, request);

    return NextResponse.json({
      success: true,
      message: 'System installed successfully',
      data: {
        adminId: adminUser.id,
        branchId: defaultBranch.id,
      },
    });

  } catch (error) {
    console.error('Installation error:', error);
    return NextResponse.json(
      { error: 'Installation failed. Please try again.' },
      { status: 500 }
    );
  }
}
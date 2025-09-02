import models from '@/models';
import { generateToken } from '@/lib/auth';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '@/lib/audit';

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'head_of_sales' | 'salesperson';
  branchId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    branchId?: string;
  };
  error?: string;
}

export async function checkAdminExists(): Promise<boolean> {
  try {
    const adminCount = await models.User.count({
      where: { role: 'admin' }
    });
    return adminCount > 0;
  } catch (error) {
    console.error('Error checking admin existence:', error);
    return false;
  }
}

export async function createUser(userData: CreateUserData, createdBy?: string): Promise<AuthResult> {
  try {
    // Check if email already exists
    const existingUser = await models.User.findOne({
      where: { email: userData.email }
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Email already exists',
      };
    }

    // Create the user
    const user = await models.User.create(userData);

    // Create audit log
    if (createdBy) {
      await createAuditLog({
        userId: createdBy,
        branchId: userData.branchId,
        action: AUDIT_ACTIONS.USER_CREATE,
        resource: AUDIT_RESOURCES.USER,
        resourceId: user.id,
        newValues: {
          email: user.email,
          role: user.role,
          branchId: user.branchId,
        },
      });
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branchId: user.branchId,
      },
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: 'Failed to create user',
    };
  }
}

export async function authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    // Find user by email
    const user = await models.User.findOne({
      where: { 
        email: credentials.email,
        isActive: true,
      },
      include: [
        {
          model: models.Branch,
          as: 'branch',
          attributes: ['id', 'name', 'currency', 'currencySymbol'],
        },
      ],
    });

    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Validate password
    const isValidPassword = await user.validatePassword(credentials.password);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      branchId: user.branchId,
      action: AUDIT_ACTIONS.USER_LOGIN,
      resource: AUDIT_RESOURCES.USER,
      resourceId: user.id,
      metadata: {
        loginTime: new Date().toISOString(),
      },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branchId: user.branchId,
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

export async function getUsersByBranch(branchId: string, role?: string) {
  try {
    const whereClause: any = { branchId, isActive: true };
    if (role) {
      whereClause.role = role;
    }

    const users = await models.User.findAll({
      where: whereClause,
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'lastLoginAt', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function updateUser(userId: string, updateData: Partial<CreateUserData>, updatedBy: string) {
  try {
    const user = await models.User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oldValues = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    };

    await user.update(updateData);

    // Create audit log
    await createAuditLog({
      userId: updatedBy,
      branchId: user.branchId,
      action: AUDIT_ACTIONS.USER_UPDATE,
      resource: AUDIT_RESOURCES.USER,
      resourceId: user.id,
      oldValues,
      newValues: updateData,
    });

    return { success: true, user };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: 'Failed to update user' };
  }
}

export async function deactivateUser(userId: string, deactivatedBy: string) {
  try {
    const user = await models.User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await user.update({ isActive: false });

    // Create audit log
    await createAuditLog({
      userId: deactivatedBy,
      branchId: user.branchId,
      action: AUDIT_ACTIONS.USER_DELETE,
      resource: AUDIT_RESOURCES.USER,
      resourceId: user.id,
      oldValues: { isActive: true },
      newValues: { isActive: false },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deactivating user:', error);
    return { success: false, error: 'Failed to deactivate user' };
  }
}
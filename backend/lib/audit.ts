import models from '@/models';
import { NextRequest } from 'next/server';

export interface AuditLogData {
  userId?: string;
  branchId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
}

export async function createAuditLog(
  data: AuditLogData,
  request?: NextRequest
): Promise<void> {
  try {
    const auditData = {
      ...data,
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request ? request.headers.get('user-agent') : undefined,
    };

    await models.AuditLog.create(auditData);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Audit action constants
export const AUDIT_ACTIONS = {
  // User actions
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  
  // Product actions
  PRODUCT_CREATE: 'product_create',
  PRODUCT_UPDATE: 'product_update',
  PRODUCT_DELETE: 'product_delete',
  PRODUCT_IMPORT: 'product_import',
  
  // Inventory actions
  INVENTORY_UPDATE: 'inventory_update',
  INVENTORY_RESTOCK: 'inventory_restock',
  INVENTORY_ADJUSTMENT: 'inventory_adjustment',
  
  // Sales actions
  SALE_CREATE: 'sale_create',
  SALE_VOID: 'sale_void',
  SALE_REFUND: 'sale_refund',
  
  // Payment actions
  PAYMENT_INITIATE: 'payment_initiate',
  PAYMENT_COMPLETE: 'payment_complete',
  PAYMENT_FAIL: 'payment_fail',
  
  // Branch actions
  BRANCH_CREATE: 'branch_create',
  BRANCH_UPDATE: 'branch_update',
  BRANCH_DELETE: 'branch_delete',
  
  // System actions
  SYSTEM_BACKUP: 'system_backup',
  SYSTEM_RESTORE: 'system_restore',
  CONFIG_UPDATE: 'config_update',
} as const;

// Audit resource constants
export const AUDIT_RESOURCES = {
  USER: 'user',
  BRANCH: 'branch',
  PRODUCT: 'product',
  INVENTORY: 'inventory',
  SALE: 'sale',
  PAYMENT: 'payment',
  SYSTEM: 'system',
} as const;
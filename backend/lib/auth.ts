import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import models from '@/models';

const ***REMOVED*** = process.env.***REMOVED*** || 'default-secret-for-development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  branchId?: string;
  iat?: number;
  exp?: number;
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ***REMOVED***, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, ***REMOVED***) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Verify user still exists and is active
    const user = await models.User.findByPk(payload.userId);
    if (!user || !user.isActive) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    admin: 4,
    manager: 3,
    head_of_sales: 2,
    salesperson: 1,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

export function canAccessBranch(userRole: string, userBranchId: string | undefined, targetBranchId: string): boolean {
  // Admin can access all branches
  if (userRole === 'admin') {
    return true;
  }

  // Other roles can only access their assigned branch
  return userBranchId === targetBranchId;
}

export async function requireAuth(request: NextRequest, requiredRole?: string) {
  const auth = await authenticateRequest(request);
  
  if (!auth) {
    throw new Error('Authentication required');
  }

  if (requiredRole && !hasPermission(auth.role, requiredRole)) {
    throw new Error('Insufficient permissions');
  }

  return auth;
}
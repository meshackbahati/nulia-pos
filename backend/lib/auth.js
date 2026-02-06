import jwt from 'jsonwebtoken';
import models from '../models/index.js';

const ***REMOVED*** = process.env.***REMOVED*** || 'default-secret-for-development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function generateToken(payload) {
    return jwt.sign(payload, ***REMOVED***, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, ***REMOVED***);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

export function hasPermission(userRole, requiredRole) {
    // Role Hierarchy: Higher numbers have more permissions
    // admin (4) > manager (3) > head_of_sales (2) > salesperson (1)
    const roleHierarchy = {
        admin: 4,
        manager: 3,
        head_of_sales: 2,
        salesperson: 1,
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
}

export function canAccessBranch(userRole, userBranchId, targetBranchId) {
    if (userRole === 'admin') {
        return true;
    }
    return userBranchId === targetBranchId;
}

// Express Middleware
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        const user = await models.User.findByPk(payload.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User inactive or not found' });
        }

        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: error.message });
    }
};

export const authorize = (requiredRole, checkBranch = false) => {
    return async (req, res, next) => {
        if (!req.user || !hasPermission(req.user.role, requiredRole)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // If checkBranch is true, verify the user belongs to or manages the branch
        if (checkBranch && req.user.role !== 'admin') {
            const branchId = req.params.branchId || req.body.branchId || req.query.branchId;
            if (branchId) {
                // For Managers, check if they manage this specific branch
                if (req.user.role === 'manager') {
                    const branch = await models.Branch.findByPk(branchId);
                    if (!branch || (branch.managedBy !== req.user.userId && req.user.branchId !== branchId)) {
                        return res.status(403).json({ error: 'You do not have access to this branch' });
                    }
                } else if (req.user.branchId !== branchId) {
                    return res.status(403).json({ error: 'You do not have access to this branch' });
                }
            }
        }

        next();
    };
};

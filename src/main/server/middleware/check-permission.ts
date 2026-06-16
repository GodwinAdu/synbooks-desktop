/**
 * Permission Checking Middleware
 * 
 * Validates that the current user's role has the required permission.
 * Looks up the role from the roles table and checks the permissions map.
 * Admin and owner roles always have full access.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './local-auth';
import { Repository } from '../../database/repository';

interface RoleRecord {
  id: string;
  organizationId: string;
  name: string;
  permissions: Record<string, boolean>;
  del_flag: number;
}

const roleRepo = new Repository<RoleRecord>('roles');

/**
 * Express middleware factory that checks if the user has a specific permission.
 * 
 * Usage: router.post('/invoices', requirePermission('invoices_create'), handler)
 */
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.role;
    const organizationId = req.organizationId;

    // Admin and owner always have full access
    if (userRole === 'admin' || userRole === 'owner') {
      next();
      return;
    }

    if (!userRole || !organizationId) {
      res.status(403).json({ error: 'Access denied. No role assigned.' });
      return;
    }

    // Look up the role in the database
    const role = roleRepo.findOne({
      organizationId,
      name: userRole,
      del_flag: 0,
    });

    if (!role) {
      res.status(403).json({ error: 'Access denied. Role not found.' });
      return;
    }

    // Check if the permission is granted
    const permissions = role.permissions || {};
    if (permissions[permission] === true) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Permission denied',
      message: `You don't have the "${permission}" permission. Contact your administrator.`,
      requiredPermission: permission,
      currentRole: userRole,
    });
  };
}

/**
 * Check if a user has a specific permission (non-middleware utility).
 * Useful for conditional logic in route handlers.
 */
export function userHasPermission(organizationId: string, roleName: string, permission: string): boolean {
  if (roleName === 'admin' || roleName === 'owner') return true;

  const role = roleRepo.findOne({
    organizationId,
    name: roleName,
    del_flag: 0,
  });

  if (!role) return false;
  return role.permissions?.[permission] === true;
}

/**
 * Roles CRUD Routes
 * 
 * Manage roles and their permissions for the organization.
 * Only admins/owners can modify roles.
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { Repository } from '../../database/repository';
import { ALL_PERMISSIONS } from '../services/default-roles';

export const rolesRouter = Router();

interface RoleRecord {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Record<string, boolean>;
  isSystem: number;
  del_flag: number;
  createdBy: string;
}

const roleRepo = new Repository<RoleRecord>('roles');

/**
 * GET /api/roles
 * List all roles for the organization
 */
rolesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = roleRepo.find({
      where: {
        organizationId: req.organizationId,
        del_flag: 0,
      },
      orderBy: 'createdAt',
      order: 'ASC',
    });

    res.json({ roles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/roles/:id
 * Get a single role by ID
 */
rolesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = roleRepo.findById(req.params.id);

    if (!role || role.del_flag === 1 || role.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }

    res.json({ role });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/roles
 * Create a new custom role
 */
rolesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admins/owners can create roles
    if (req.role !== 'admin' && req.role !== 'owner') {
      res.status(403).json({ error: 'Only administrators can create roles' });
      return;
    }

    const { name, displayName, description, permissions } = req.body;

    if (!name || !displayName) {
      res.status(400).json({ error: 'Name and displayName are required' });
      return;
    }

    // Check if role name already exists
    const existing = roleRepo.findOne({
      organizationId: req.organizationId,
      name,
      del_flag: 0,
    });

    if (existing) {
      res.status(409).json({ error: 'A role with this name already exists' });
      return;
    }

    // Validate permissions - only allow known permission keys
    const validPermissions: Record<string, boolean> = {};
    if (permissions && typeof permissions === 'object') {
      for (const [key, value] of Object.entries(permissions)) {
        if (ALL_PERMISSIONS.includes(key as any)) {
          validPermissions[key] = Boolean(value);
        }
      }
    }

    const role = roleRepo.create({
      organizationId: req.organizationId,
      name: name.toLowerCase().replace(/\s+/g, '-'),
      displayName,
      description: description || '',
      permissions: validPermissions as any,
      isSystem: 0,
      del_flag: 0,
      createdBy: req.userId,
    } as any);

    res.status(201).json({ role });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/roles/:id
 * Update a role (including permissions)
 */
rolesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admins/owners can update roles
    if (req.role !== 'admin' && req.role !== 'owner') {
      res.status(403).json({ error: 'Only administrators can update roles' });
      return;
    }

    const role = roleRepo.findById(req.params.id);

    if (!role || role.del_flag === 1 || role.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }

    const { displayName, description, permissions } = req.body;
    const updates: any = {};

    if (displayName !== undefined) updates.displayName = displayName;
    if (description !== undefined) updates.description = description;

    // Validate and set permissions
    if (permissions && typeof permissions === 'object') {
      const validPermissions: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(permissions)) {
        if (ALL_PERMISSIONS.includes(key as any)) {
          validPermissions[key] = Boolean(value);
        }
      }
      updates.permissions = validPermissions;
    }

    const updated = roleRepo.update(req.params.id, updates);
    res.json({ role: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/roles/:id
 * Soft delete a role (cannot delete system roles)
 */
rolesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admins/owners can delete roles
    if (req.role !== 'admin' && req.role !== 'owner') {
      res.status(403).json({ error: 'Only administrators can delete roles' });
      return;
    }

    const role = roleRepo.findById(req.params.id);

    if (!role || role.del_flag === 1 || role.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }

    // Prevent deleting system roles
    if (role.isSystem === 1) {
      res.status(400).json({ error: 'Cannot delete system roles' });
      return;
    }

    roleRepo.softDelete(req.params.id, req.userId);
    res.json({ success: true, message: 'Role deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

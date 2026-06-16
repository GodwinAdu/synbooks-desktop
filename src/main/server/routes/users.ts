/**
 * User Management Routes
 * 
 * CRUD for users within an organization.
 * Only admins/owners can manage users.
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest, localAuth } from '../middleware/local-auth';
import { Repository } from '../../database/repository';

export const usersRouter = Router();

interface UserRecord {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  password?: string;
  role: string;
  isActive: number;
  del_flag: number;
  profileImage?: string;
  phone?: string;
  permissions?: string[];
}

const userRepo = new Repository<UserRecord>('users');

/**
 * GET /api/users
 * List all users in the organization
 */
usersRouter.get('/', localAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admins/owners can list users
    if (req.role !== 'admin' && req.role !== 'owner') {
      res.status(403).json({ error: 'Only administrators can view users' });
      return;
    }

    const users = userRepo.find({
      where: {
        organizationId: req.organizationId,
        del_flag: 0,
      },
      orderBy: 'createdAt',
      order: 'DESC',
    });

    // Strip passwords from response
    const sanitized = users.map(({ password, ...user }) => user);

    res.json({ users: sanitized });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users
 * Create a new user with role assignment
 */
usersRouter.post('/', localAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admins/owners can create users
    if (req.role !== 'admin' && req.role !== 'owner') {
      res.status(403).json({ error: 'Only administrators can create users' });
      return;
    }

    const { fullName, email, password, role, phone } = req.body;

    if (!fullName || !email || !password || !role) {
      res.status(400).json({ error: 'fullName, email, password, and role are required' });
      return;
    }

    // Check if email is already in use
    const existing = userRepo.findOne({ email, del_flag: 0 });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = userRepo.create({
      organizationId: req.organizationId,
      fullName,
      email,
      password: hashedPassword,
      role,
      phone: phone || null,
      isActive: 1,
      del_flag: 0,
    } as any);

    // Return without password
    const { password: _, ...sanitized } = user;
    res.status(201).json({ user: sanitized });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Update a user (change role, name, etc.)
 */
usersRouter.put('/:id', localAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admins/owners can update users
    if (req.role !== 'admin' && req.role !== 'owner') {
      res.status(403).json({ error: 'Only administrators can update users' });
      return;
    }

    const user = userRepo.findById(req.params.id);

    if (!user || user.del_flag === 1 || user.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { fullName, role, phone, isActive, password } = req.body;
    const updates: any = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (role !== undefined) updates.role = role;
    if (phone !== undefined) updates.phone = phone;
    if (isActive !== undefined) updates.isActive = isActive ? 1 : 0;

    // Allow password reset by admin
    if (password) {
      updates.password = await bcrypt.hash(password, 12);
    }

    const updated = userRepo.update(req.params.id, updates);
    if (updated) {
      const { password: _, ...sanitized } = updated;
      res.json({ user: sanitized });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate (soft delete) a user
 */
usersRouter.delete('/:id', localAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admins/owners can delete users
    if (req.role !== 'admin' && req.role !== 'owner') {
      res.status(403).json({ error: 'Only administrators can delete users' });
      return;
    }

    // Prevent self-deletion
    if (req.params.id === req.userId) {
      res.status(400).json({ error: 'You cannot delete your own account' });
      return;
    }

    const user = userRepo.findById(req.params.id);

    if (!user || user.del_flag === 1 || user.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    userRepo.softDelete(req.params.id, req.userId);
    res.json({ success: true, message: 'User deactivated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

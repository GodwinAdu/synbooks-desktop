/**
 * Auth Routes - Local Desktop Authentication
 * 
 * Handles login, registration, and session management
 * against the local SQLite database.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Repository } from '../../database/repository';
import { signLocalToken, localAuth, AuthenticatedRequest } from '../middleware/local-auth';
import { ensureDefaultRoles } from '../services/default-roles';

export const authRouter = Router();

interface UserRecord {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  password?: string;
  role: string;
  isActive: boolean;
  del_flag: boolean;
  profileImage?: string;
  permissions?: string[];
}

interface OrgRecord {
  id: string;
  organizationCode: string;
  name: string;
  settings: any;
  modules: any;
  subscriptionPlan: any;
}

const userRepo = new Repository<UserRecord>('users');
const orgRepo = new Repository<OrgRecord>('organizations');

/**
 * POST /api/auth/login
 * Authenticate user with email/password
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user - prefer cloud-synced user (24-char MongoDB ObjectId org)
    const allUsers = userRepo.find({ where: { email } });
    const user = allUsers.find(u => u.organizationId && u.organizationId.length === 24) || allUsers[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.password) {
      res.status(401).json({ error: 'Account not set up for offline access. Please sync first.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signLocalToken({
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    });

    // Ensure default roles exist for this org (handles pre-existing orgs)
    ensureDefaultRoles(user.organizationId);

    const org = orgRepo.findById(user.organizationId);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        profileImage: user.profileImage,
        permissions: user.permissions || [],
      },
      organization: org ? {
        id: org.id,
        name: org.name,
        organizationCode: org.organizationCode,
        settings: org.settings,
        modules: org.modules,
      } : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

/**
 * POST /api/auth/register
 * Create a new local organization and user (first-time setup)
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, organizationName } = req.body;

    if (!fullName || !email || !password || !organizationName) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    // Check if user already exists
    const existing = userRepo.findOne({ email });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create organization
    const orgCode = `ORG-${Date.now().toString(36).toUpperCase()}`;
    const org = orgRepo.create({
      organizationCode: orgCode,
      name: organizationName,
      settings: {
        timezone: 'Africa/Accra',
        currency: 'GHS',
        fiscalYearStart: '01-01',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        language: 'en',
      },
      modules: {
        dashboard: true, banking: true, sales: true, expenses: true,
        payroll: true, accounting: true, tax: true, products: true,
        reports: true, settings: true, projects: true, crm: true,
        budgeting: true, assets: true, loans: true, equity: true,
        ai: false, pos: true, production: true, procurement: true,
      },
      subscriptionPlan: { plan: 'enterprise', status: 'active' },
      isActive: true,
      suspended: false,
    } as any);

    // Create user
    const user = userRepo.create({
      organizationId: org.id,
      fullName,
      email,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      del_flag: false,
    } as any);

    // Ensure default roles exist for the new org
    ensureDefaultRoles(org.id);

    const token = signLocalToken({
      sub: user.id,
      organizationId: org.id,
      role: 'admin',
      email,
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organizationId: org.id,
      },
      organization: {
        id: org.id,
        name: org.name,
        organizationCode: org.organizationCode,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

/**
 * POST /api/auth/setup-cloud-user
 * After cloud sync, set up local access for a synced user.
 * Finds the user by email in the synced data, sets their password for local login,
 * and returns a valid JWT token.
 */
/**
 * POST /api/auth/setup-cloud-user
 * After cloud sync, set up local access for a synced user.
 */
authRouter.post('/setup-cloud-user', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    // Find ALL users in the database and match by email (case-insensitive)
    const allUsers = userRepo.find({ where: { del_flag: 0 } });
    // Also try without del_flag filter
    const allUsersNoFilter = userRepo.find({});
    
    const emailLower = email.toLowerCase().trim();
    let user = allUsersNoFilter.find((u: any) => 
      (u.email || '').toLowerCase().trim() === emailLower
    );

    if (!user) {
      // Debug: return what users exist
      const userEmails = allUsersNoFilter.map((u: any) => ({ id: u.id, email: u.email, orgId: u.organizationId?.substring(0, 8) }));
      res.status(404).json({ 
        error: 'No synced user found with this email. Try syncing first.',
        debug: { searchEmail: email, usersInDB: userEmails.length, users: userEmails }
      });
      return;
    }

    // Set password for local access
    const hashedPassword = await bcrypt.hash(password, 10);
    userRepo.update(user.id, { password: hashedPassword, del_flag: 0, isActive: 1 } as any);

    // Also ensure the org's del_flag is 0
    const org = orgRepo.findById(user.organizationId);
    if (org) {
      orgRepo.update(org.id, { del_flag: 0, isActive: 1 } as any);
    }

    // Issue token
    const token = signLocalToken({
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role || 'admin',
      email: user.email || email,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName || email.split('@')[0],
        email: user.email || email,
        role: user.role || 'admin',
        organizationId: user.organizationId,
      },
      organization: org ? {
        id: org.id,
        name: org.name,
        organizationCode: org.organizationCode,
        settings: org.settings,
        modules: org.modules,
      } : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Setup failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
authRouter.get('/me', localAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = userRepo.findById(req.userId!);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const org = orgRepo.findById(req.organizationId!);

  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      profileImage: user.profileImage,
      permissions: user.permissions || [],
    },
    organization: org ? {
      id: org.id,
      name: org.name,
      organizationCode: org.organizationCode,
      settings: org.settings,
      modules: org.modules,
    } : null,
  });
});

/**
 * GET /api/auth/permissions
 * Get the current user's permission map based on their role
 */
authRouter.get('/permissions', localAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = userRepo.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const roleName = user.role;

    // Admin and owner have all permissions
    if (roleName === 'admin' || roleName === 'owner') {
      const { ALL_PERMISSIONS } = require('../services/default-roles');
      const permissions: Record<string, boolean> = {};
      for (const key of ALL_PERMISSIONS) {
        permissions[key] = true;
      }
      res.json({ permissions });
      return;
    }

    // Look up the role from the roles table
    const roleRepo = new Repository<any>('roles');
    const role = roleRepo.findOne({
      organizationId: req.organizationId,
      name: roleName,
      del_flag: 0,
    });

    if (!role) {
      res.json({ permissions: {} });
      return;
    }

    res.json({ permissions: role.permissions || {} });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/change-password
 */
authRouter.post('/change-password', localAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = userRepo.findById(req.userId!);

    if (!user || !user.password) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    userRepo.update(user.id, { password: hashed } as any);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/auth/profile
 * Update current user's own profile (name, email, phone)
 */
authRouter.put('/profile', localAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, email, phone } = req.body;
    const user = userRepo.findById(req.userId!);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updates: any = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;

    const updated = userRepo.update(user.id, updates);
    if (updated) {
      const { password: _, ...sanitized } = updated as any;
      res.json({ success: true, user: sanitized });
    } else {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

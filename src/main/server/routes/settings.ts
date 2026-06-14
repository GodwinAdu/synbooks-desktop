import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const settingsRouter = Router();
const orgRepo = new Repository<any>('organizations');
const userRepo = new Repository<any>('users');

settingsRouter.get('/organization', (req: AuthenticatedRequest, res: Response) => {
  const org = orgRepo.findById(req.organizationId!);
  if (!org) { res.status(404).json({ error: 'Organization not found' }); return; }
  res.json(org);
});

settingsRouter.put('/organization', (req: AuthenticatedRequest, res: Response) => {
  // Merge nested settings objects instead of overwriting
  const org = orgRepo.findById(req.organizationId!);
  if (!org) { res.status(404).json({ error: 'Organization not found' }); return; }

  const updateData: any = { ...req.body };

  // Merge settings object
  if (req.body.settings) {
    const existingSettings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});
    updateData.settings = { ...existingSettings, ...req.body.settings };
  }

  // Merge taxSettings object
  if (req.body.taxSettings) {
    const existingTax = typeof org.taxSettings === 'string' ? JSON.parse(org.taxSettings || '{}') : (org.taxSettings || {});
    updateData.taxSettings = { ...existingTax, ...req.body.taxSettings };
  }

  // Merge address object
  if (req.body.address) {
    const existingAddr = typeof org.address === 'string' ? JSON.parse(org.address || '{}') : (org.address || {});
    updateData.address = { ...existingAddr, ...req.body.address };
  }

  const updated = orgRepo.update(req.organizationId!, updateData);
  res.json({ success: true, data: updated });
});

settingsRouter.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const users = userRepo.find({ where: { organizationId: req.organizationId, del_flag: 0 } });
  res.json(users.map((u: any) => ({ ...u, password: undefined })));
});

settingsRouter.put('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = userRepo.findById(req.params.id);
  if (!user || user.organizationId !== req.organizationId) { res.status(404).json({ error: 'User not found' }); return; }
  const { password, ...data } = req.body;
  res.json({ success: true, data: userRepo.update(req.params.id, data) });
});

settingsRouter.get('/modules', (req: AuthenticatedRequest, res: Response) => {
  const org = orgRepo.findById(req.organizationId!);
  res.json(org?.modules || {});
});

settingsRouter.put('/modules', (req: AuthenticatedRequest, res: Response) => {
  orgRepo.update(req.organizationId!, { modules: req.body });
  res.json({ success: true });
});

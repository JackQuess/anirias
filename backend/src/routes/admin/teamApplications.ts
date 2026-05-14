import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';

const router = Router();

const validStatuses = new Set(['pending', 'contacted', 'trial_assigned', 'accepted', 'rejected', 'archived']);

const normalizeNullableText = (value: unknown, maxLength: number) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('Text fields must be strings or null');
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
};

router.put('/team-applications/:id', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status, admin_notes, trial_task_assigned, trial_score } = req.body || {};

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Application id is required' });
    }

    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      if (typeof status !== 'string' || !validStatuses.has(status)) {
        return res.status(400).json({ success: false, error: 'Invalid application status' });
      }
      updates.status = status;
    }

    try {
      const normalizedNotes = normalizeNullableText(admin_notes, 4000);
      const normalizedTask = normalizeNullableText(trial_task_assigned, 1000);
      if (normalizedNotes !== undefined) updates.admin_notes = normalizedNotes;
      if (normalizedTask !== undefined) updates.trial_task_assigned = normalizedTask;
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }

    if (trial_score !== undefined) {
      if (trial_score === null || trial_score === '') {
        updates.trial_score = null;
      } else if (typeof trial_score === 'number' && Number.isInteger(trial_score) && trial_score >= 0 && trial_score <= 100) {
        updates.trial_score = trial_score;
      } else {
        return res.status(400).json({ success: false, error: 'trial_score must be an integer between 0 and 100 or null' });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid updates provided' });
    }

    updates.reviewed_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('team_applications')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[team-applications] Update error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update team application', details: error.message });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    return res.status(200).json({ success: true, application: data });
  } catch (err: any) {
    console.error('[team-applications] Unexpected error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error', details: err?.message || 'Unknown error' });
  }
});

export default router;

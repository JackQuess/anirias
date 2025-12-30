/**
 * Admin Notifications API Endpoints
 * 
 * GET /api/admin/notifications - Get recent admin notifications
 * POST /api/admin/notifications/read - Mark notification as read
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';
import { requireAdmin } from '../../middleware/auth.js';

const router = Router();

/**
 * GET /api/admin/notifications
 * Returns the last 20 admin notifications (unread first)
 */
router.get('/notifications', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_notifications')
      .select('*')
      .order('read', { ascending: true }) // Unread first
      .order('created_at', { ascending: false }) // Most recent first
      .limit(20);

    if (error) {
      console.error('[AdminNotifications API] Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    return res.json({ notifications: data || [] });
  } catch (err: any) {
    console.error('[AdminNotifications API] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/notifications/read
 * Mark a notification as read
 * Body: { id: string }
 */
router.post('/notifications/read', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      console.error('[AdminNotifications API] Error marking notification as read:', error);
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[AdminNotifications API] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/notifications/read-all
 * Mark all notifications as read
 */
router.post('/notifications/read-all', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .update({ read: true })
      .eq('read', false);

    if (error) {
      console.error('[AdminNotifications API] Error marking all notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[AdminNotifications API] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';

const router = Router();

function requireAdmin(req: Request, res: Response): boolean {
  const adminToken = req.header('x-admin-token');
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * GET /api/admin/comment-moderation
 * Şikayetler + silinmiş yorumlar (service role; RLS bypass)
 */
router.get('/comment-moderation', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const limit = Math.min(Number(req.query.limit) || 80, 200);

    const { data: reports, error: repErr } = await supabaseAdmin
      .from('comment_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (repErr) {
      return res.status(500).json({ success: false, error: repErr.message });
    }

    const reportRows = reports || [];
    const reportCommentIds = [...new Set(reportRows.map((r: { comment_id: string }) => r.comment_id))];

    const { data: deletedComments, error: delErr } = await supabaseAdmin
      .from('comments')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(limit);

    if (delErr) {
      return res.status(500).json({ success: false, error: delErr.message });
    }

    const allCommentIds = [
      ...new Set([
        ...reportCommentIds,
        ...((deletedComments || []) as { id: string }[]).map((c) => c.id),
      ]),
    ];

    let enriched: Record<string, any> = {};
    if (allCommentIds.length > 0) {
      let commentsWithJoin: any[] | null = null;
      const full = await supabaseAdmin
        .from('comments')
        .select('*, profiles(username, role), animes(title, slug)')
        .in('id', allCommentIds);
      if (full.error) {
        const simple = await supabaseAdmin
          .from('comments')
          .select('*, profiles(username, role)')
          .in('id', allCommentIds);
        if (simple.error) {
          return res.status(500).json({ success: false, error: simple.error.message });
        }
        commentsWithJoin = simple.data as any[];
      } else {
        commentsWithJoin = full.data as any[];
      }
      enriched = Object.fromEntries((commentsWithJoin || []).map((c: any) => [c.id, c]));
    }

    const reportsOut = reportRows.map((r: any) => ({
      ...r,
      comment: enriched[r.comment_id] || null,
    }));

    const deletedOut = (deletedComments || []).map((c: any) => ({
      ...c,
      profiles: enriched[c.id]?.profiles ?? null,
      animes: enriched[c.id]?.animes ?? null,
    }));

    return res.json({
      success: true,
      reports: reportsOut,
      deletedComments: deletedOut,
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Server error' });
  }
});

/**
 * POST /api/admin/comment-moderation/:commentId/soft-delete
 * Yorumu yumuşak sil (admin)
 */
router.post('/comment-moderation/:commentId/soft-delete', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const commentId = req.params.commentId;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;

  if (!commentId) {
    return res.status(400).json({ success: false, error: 'commentId required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: null,
        deleted_kind: 'admin',
        deleted_reason: reason,
      })
      .eq('id', commentId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    if (!data) {
      return res.status(404).json({ success: false, error: 'Comment not found or already deleted' });
    }

    return res.json({ success: true, id: data.id });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Server error' });
  }
});

/**
 * POST /api/admin/comment-moderation/:commentId/restore
 * Silinmiş yorumu geri aç
 */
router.post('/comment-moderation/:commentId/restore', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const commentId = req.params.commentId;
  if (!commentId) {
    return res.status(400).json({ success: false, error: 'commentId required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .update({
        deleted_at: null,
        deleted_by: null,
        deleted_kind: null,
        deleted_reason: null,
      })
      .eq('id', commentId)
      .not('deleted_at', 'is', null)
      .select('id')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    if (!data) {
      return res.status(404).json({ success: false, error: 'Comment not found or not deleted' });
    }

    return res.json({ success: true, id: data.id });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Server error' });
  }
});

export default router;

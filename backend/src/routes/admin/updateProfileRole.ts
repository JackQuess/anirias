import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';

const router = Router();

router.use((req, res, next) => {
  // Allow production domain and Vercel
  const allowedOrigins = [
    'https://anirias.com',
    'https://anirias.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/**
 * PUT /api/admin/update-profile-role
 * 
 * Update a user's role (user <-> admin)
 * 
 * SECURITY:
 * - Admin-only endpoint (requires X-ADMIN-TOKEN header)
 * - Uses Supabase Service Role Key (backend only)
 * - Never exposes service role key to client
 * 
 * Body:
 * {
 *   "user_id": "uuid",
 *   "role": "user" | "admin"
 * }
 * 
 * Response:
 * { success: true, user_id: "uuid", role: "user" | "admin" }
 */
router.put('/update-profile-role', async (req: Request, res: Response) => {
  try {
    // Check admin authentication
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Validate request body
    const { user_id, role } = req.body || {};

    if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'user_id is required and must be a non-empty string',
      });
    }

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'role must be either "user" or "admin"',
      });
    }

    // Verify user exists
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, role')
      .eq('id', user_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[update-profile-role] Supabase fetch error:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
        details: fetchError.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Do not allow the last admin account to be demoted.
    if (profile.role === 'admin' && role === 'user') {
      const { count, error: countError } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .neq('id', user_id);

      if (countError) {
        console.error('[update-profile-role] Admin count error:', countError);
        return res.status(500).json({
          success: false,
          error: 'Failed to verify remaining admin accounts',
          details: countError.message,
        });
      }

      if ((count ?? 0) === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot demote the last admin account',
        });
      }
    }

    // Update profile role using service role
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        role: role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)
      .select('id, username, role')
      .single();

    if (error) {
      console.error('[update-profile-role] Supabase update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user role',
        details: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'User not found after update',
      });
    }

    // Success
    return res.status(200).json({
      success: true,
      user_id: data.id,
      username: data.username,
      role: data.role,
    });
  } catch (err: any) {
    console.error('[update-profile-role] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err?.message || 'Unknown error',
    });
  }
});

/**
 * PUT /api/admin/update-user-moderation
 *
 * Body:
 * {
 *   "user_id": "uuid",
 *   "is_banned": boolean,
 *   "ban_reason": string | null,
 *   "warning_message": string | null,
 *   "clear_warning": boolean
 * }
 */
router.put('/update-user-moderation', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { user_id, is_banned, ban_reason, warning_message, clear_warning } = req.body || {};

    if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'user_id is required and must be a non-empty string',
      });
    }

    if (is_banned !== undefined && typeof is_banned !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_banned must be a boolean when provided',
      });
    }

    if (ban_reason !== undefined && ban_reason !== null && typeof ban_reason !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'ban_reason must be a string or null',
      });
    }

    if (warning_message !== undefined && warning_message !== null && typeof warning_message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'warning_message must be a string or null',
      });
    }

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, role')
      .eq('id', user_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[update-user-moderation] Supabase fetch error:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
        details: fetchError.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };

    if (typeof is_banned === 'boolean') {
      if (is_banned && profile.role === 'admin') {
        const { data: admins, error: adminsError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .neq('id', user_id);

        if (adminsError) {
          console.error('[update-user-moderation] Active admin fetch error:', adminsError);
          return res.status(500).json({
            success: false,
            error: 'Failed to verify remaining active admin accounts',
            details: adminsError.message,
          });
        }

        const otherAdminIds = (admins || []).map((admin: any) => String(admin.id));
        let activeAdminCount = otherAdminIds.length;

        if (otherAdminIds.length > 0) {
          const { data: moderationRows, error: moderationFetchError } = await supabaseAdmin
            .from('user_moderation')
            .select('user_id, is_banned')
            .in('user_id', otherAdminIds);

          if (moderationFetchError) {
            console.error('[update-user-moderation] Active admin moderation fetch error:', moderationFetchError);
            return res.status(500).json({
              success: false,
              error: 'Failed to verify remaining active admin accounts',
              details: moderationFetchError.message,
            });
          }

          const bannedAdminIds = new Set(
            (moderationRows || [])
              .filter((row: any) => row.is_banned === true)
              .map((row: any) => String(row.user_id))
          );
          activeAdminCount = otherAdminIds.filter((id) => !bannedAdminIds.has(id)).length;
        }

        if (activeAdminCount === 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot ban the last active admin account',
          });
        }
      }

      const { error: authBanError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: is_banned ? '876000h' : 'none',
      });

      if (authBanError) {
        console.error('[update-user-moderation] Supabase auth ban error:', authBanError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update Supabase Auth ban state',
          details: authBanError.message,
        });
      }

      updates.is_banned = is_banned;
      updates.banned_at = is_banned ? now : null;
      updates.banned_until = null;
      updates.ban_reason = is_banned ? String(ban_reason || '').trim() || null : null;
    } else if (ban_reason !== undefined) {
      updates.ban_reason = String(ban_reason || '').trim() || null;
    }

    if (clear_warning === true) {
      updates.account_warning_message = null;
      updates.account_warning_updated_at = null;
      updates.account_warning_seen_at = null;
    } else if (warning_message !== undefined) {
      const message = String(warning_message || '').trim();
      if (!message) {
        updates.account_warning_message = null;
        updates.account_warning_updated_at = null;
        updates.account_warning_seen_at = null;
      } else {
        updates.account_warning_message = message;
        updates.account_warning_updated_at = now;
        updates.account_warning_seen_at = null;
      }
    }

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({
        success: false,
        error: 'No moderation updates provided',
      });
    }

    const { data: moderationData, error } = await supabaseAdmin
      .from('user_moderation')
      .upsert({ user_id, ...updates }, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      console.error('[update-user-moderation] Supabase update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user moderation',
        details: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      profile: { ...profile, ...moderationData },
    });
  } catch (err: any) {
    console.error('[update-user-moderation] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err?.message || 'Unknown error',
    });
  }
});

export default router;

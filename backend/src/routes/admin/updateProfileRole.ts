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

    // Prevent self-demotion (optional safety check)
    // You can remove this if you want to allow admins to demote themselves
    // if (profile.role === 'admin' && role === 'user') {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Cannot demote yourself from admin role',
    //   });
    // }

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

export default router;


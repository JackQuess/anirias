import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/toggle-featured
 * 
 * Toggle featured status of an anime
 * 
 * SECURITY:
 * - Admin-only endpoint (requires X-ADMIN-TOKEN header)
 * - Uses Supabase Service Role Key (backend only)
 * - Never exposes service role key to client
 * 
 * Body:
 * {
 *   "anime_id": "uuid",
 *   "featured": true | false
 * }
 * 
 * Response:
 * { success: true }
 */

function isAdmin(req: NextApiRequest): boolean {
  const headerToken = req.headers['x-admin-token'];
  const expected = process.env.ADMIN_TOKEN;
  return !!(expected && headerToken === expected);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin authentication
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate Supabase configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[toggle-featured] Supabase config missing:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceKey,
    });
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  // Validate request body
  const { anime_id, featured } = req.body as {
    anime_id?: string;
    featured?: boolean;
  };

  if (!anime_id || typeof anime_id !== 'string' || anime_id.trim() === '') {
    return res.status(400).json({ error: 'anime_id is required and must be a non-empty string' });
  }

  if (typeof featured !== 'boolean') {
    return res.status(400).json({ error: 'featured is required and must be a boolean' });
  }

  try {
    // Create Supabase admin client with service role key
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Update anime featured status
    const { data, error } = await supabase
      .from('animes')
      .update({
        is_featured: featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', anime_id)
      .select('id, is_featured')
      .single();

    if (error) {
      console.error('[toggle-featured] Supabase error:', error);
      return res.status(500).json({ 
        error: 'Failed to update anime',
        details: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    // Success
    return res.status(200).json({ 
      success: true,
      anime_id: data.id,
      is_featured: data.is_featured,
    });
  } catch (err: any) {
    console.error('[toggle-featured] Unexpected error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: err?.message || 'Unknown error',
    });
  }
}


import { createSupabaseAuthClient, supabaseAdmin } from '../supabase.js';
import { authCookieNames, getAuthCookie } from './authCookies.js';

export async function requireAuth(req, res, next) {
  res.set('Cache-Control', 'no-store');
  const token = getAuthCookie(req, authCookieNames.accessCookie);
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  try {
    const { data, error } = await createSupabaseAuthClient().auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid auth session' });

    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, role, author_id, email')
      .eq('id', data.user.id)
      .single();

    if (pErr || !profile) return res.status(403).json({ error: 'Profile missing' });

    req.user = {
      id: data.user.id,
      email: profile.email || data.user.email,
      role: profile.role,
      authorId: profile.author_id,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: `Requires ${role} role` });
    next();
  };
}
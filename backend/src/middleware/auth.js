import { supabaseAnon, supabaseAdmin } from '../supabase.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

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
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: `Requires ${role} role` });
    next();
  };
}
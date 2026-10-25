import { Router } from 'express';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireRole('author'), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('books').select('*')
      .eq('author_id', req.user.authorId)
      .order('publication_date', { ascending: false, nullsFirst: false });
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

export default router;
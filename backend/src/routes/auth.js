import { Router } from 'express';
import { z } from 'zod';
import { supabaseAnon } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const { data, error } = await supabaseAnon.auth.signInWithPassword(body);
    if (error) return res.status(401).json({ error: error.message });
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: e.errors });
    next(e);
  }
});

router.get('/me', requireAuth, (req, res) => res.json(req.user));

export default router;
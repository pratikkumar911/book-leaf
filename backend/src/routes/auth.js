import { Router } from 'express';
import { z } from 'zod';
import { createSupabaseAuthClient } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import {
  authCookieNames,
  clearAuthCookies,
  getAuthCookie,
  setAuthCookies,
} from '../middleware/authCookies.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const { data, error } = await createSupabaseAuthClient().auth.signInWithPassword(body);
    if (error || !data.session) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    setAuthCookies(res, data.session);
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: e.errors });
    next(e);
  }
});

router.post('/refresh', async (req, res, next) => {
  const refreshToken = getAuthCookie(req, authCookieNames.refreshCookie);
  if (!refreshToken) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Missing refresh session' });
  }

  try {
    const { data, error } = await createSupabaseAuthClient().auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid refresh session' });
    }
    setAuthCookies(res, data.session);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  const accessToken = getAuthCookie(req, authCookieNames.accessCookie);
  const refreshToken = getAuthCookie(req, authCookieNames.refreshCookie);
  clearAuthCookies(res);

  if (accessToken && refreshToken) {
    try {
      const auth = createSupabaseAuthClient().auth;
      const { error: sessionError } = await auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!sessionError) {
        const { error } = await auth.signOut({ scope: 'local' });
        if (error) return next(error);
      }
    } catch (error) {
      return next(error);
    }
  }

  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => res.json(req.user));

export default router;
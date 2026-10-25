import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { draftResponse } from '../services/ai/drafter.js';
import { enqueueEnrichment } from '../services/queue.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/tickets', async (req, res, next) => {
  try {
    const { status, category, priority, sort } = req.query;
    let q = supabaseAdmin.from('tickets').select(`
      id, subject, category, ai_category, override_category,
      priority, ai_priority, override_priority, status, ai_status,
      created_at, updated_at, assigned_to,
      author:authors(id, name, email),
      book:books(id, title)
    `);
    if (status) q = q.eq('status', status);
    if (category) q = q.eq('category', category);
    if (priority) q = q.eq('priority', priority);
    q = q.order('created_at', { ascending: sort !== 'recent' });

    const { data, error } = await q;
    if (error) throw error;

    const rows = sort === 'priority'
      ? data.sort((a, b) => {
          const p = { Critical: 0, High: 1, Medium: 2, Low: 3 };
          return (p[a.priority] ?? 9) - (p[b.priority] ?? 9)
              || new Date(a.created_at) - new Date(b.created_at);
        })
      : data;

    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/tickets/:id', async (req, res, next) => {
  try {
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('*, author:authors(*), book:books(*)')
      .eq('id', req.params.id).single();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { data: messages } = await supabaseAdmin
      .from('ticket_messages').select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    res.json({ ...ticket, messages: messages || [] });
  } catch (e) { next(e); }
});

const patchSchema = z.object({
  status: z.enum(['Open','In Progress','Resolved','Closed']).optional(),
  override_category: z.string().optional(),
  override_priority: z.enum(['Critical','High','Medium','Low']).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

router.patch('/tickets/:id', async (req, res, next) => {
  try {
    const body = patchSchema.parse(req.body);
    const update = { updated_at: new Date().toISOString() };
    if (body.status) update.status = body.status;
    if (body.override_category) {
      update.override_category = body.override_category;
      update.category = body.override_category;
    }
    if (body.override_priority) {
      update.override_priority = body.override_priority;
      update.priority = body.override_priority;
    }
    if (body.assigned_to !== undefined) update.assigned_to = body.assigned_to;

    const { data, error } = await supabaseAdmin
      .from('tickets').update(update).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: e.errors });
    next(e);
  }
});

const replySchema = z.object({
  content: z.string().min(2).max(8000),
  is_internal: z.boolean().optional(),
  draft_source: z.enum(['ai','template','manual']).optional(),
});

router.post('/tickets/:id/messages', async (req, res, next) => {
  try {
    const body = replySchema.parse(req.body);
    const { data: ticket } = await supabaseAdmin
      .from('tickets').select('status').eq('id', req.params.id).single();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { data, error } = await supabaseAdmin.from('ticket_messages').insert({
      ticket_id: req.params.id,
      admin_id: req.user.id,
      sender_type: 'admin',
      content: body.content,
      is_internal: !!body.is_internal,
      draft_source: body.draft_source || 'manual',
    }).select('*').single();
    if (error) throw error;

    if (!body.is_internal && ticket.status === 'Open') {
      await supabaseAdmin.from('tickets')
        .update({ status: 'In Progress', updated_at: new Date().toISOString() })
        .eq('id', req.params.id);
    }
    res.status(201).json(data);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: e.errors });
    next(e);
  }
});

router.post('/tickets/:id/draft', async (req, res, next) => {
  try {
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('*, author:authors(name), book:books(*)')
      .eq('id', req.params.id).single();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { text, source } = await draftResponse({ ticket, author: ticket.author, book: ticket.book });
    res.json({ draft: text, source });
  } catch (e) { next(e); }
});

router.post('/tickets/:id/retry-ai', async (req, res, next) => {
  try {
    await supabaseAdmin.from('tickets')
      .update({ ai_status: 'pending', ai_error: null })
      .eq('id', req.params.id);
    enqueueEnrichment(req.params.id);
    res.json({ queued: true });
  } catch (e) { next(e); }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const { data } = await supabaseAdmin.from('tickets').select('status, ai_status');
    const total = data.length;
    const byStatus = data.reduce((a, t) => (a[t.status] = (a[t.status] || 0) + 1, a), {});
    const fallback = data.filter(t => t.ai_status === 'fallback').length;
    res.json({ total, byStatus, aiFallbackRate: total ? fallback / total : 0 });
  } catch (e) { next(e); }
});

export default router;
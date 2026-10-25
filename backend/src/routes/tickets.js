import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { enqueueEnrichment } from '../services/queue.js';

const router = Router();
router.use(requireAuth, requireRole('author'));

const createSchema = z.object({
  book_id: z.string().uuid().nullable().optional(),
  subject: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  attachment_url: z.string().url().nullable().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .select('id, subject, category, priority, status, created_at, updated_at, book_id')
      .eq('author_id', req.user.authorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('*, book:books(id, title, isbn)')
      .eq('id', req.params.id)
      .single();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.author_id !== req.user.authorId) return res.status(403).json({ error: 'Forbidden' });

    const { data: messages } = await supabaseAdmin
      .from('ticket_messages').select('*')
      .eq('ticket_id', ticket.id)
      .eq('is_internal', false)   // hide internal notes from author
      .order('created_at', { ascending: true });

    res.json({ ...ticket, messages: messages || [] });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    if (body.book_id) {
      const { data: book } = await supabaseAdmin
        .from('books').select('id, author_id').eq('id', body.book_id).single();
      if (!book || book.author_id !== req.user.authorId) {
        return res.status(400).json({ error: 'Book does not belong to this author' });
      }
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets').insert({
        author_id: req.user.authorId,
        book_id: body.book_id || null,
        subject: body.subject,
        description: body.description,
        attachment_url: body.attachment_url || null,
        status: 'Open',
        ai_status: 'pending',
      }).select('*').single();
    if (error) throw error;

    await supabaseAdmin.from('ticket_messages').insert({
      ticket_id: ticket.id,
      author_id: req.user.authorId,
      sender_type: 'author',
      content: body.description,
    });

    enqueueEnrichment(ticket.id);   // async — never blocks
    res.status(201).json(ticket);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: e.errors });
    next(e);
  }
});

export default router;
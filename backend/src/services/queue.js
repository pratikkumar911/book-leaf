import { classifyTicket } from './ai/classifier.js';
import { supabaseAdmin } from '../supabase.js';

const JOBS = [];
let running = false;

export function enqueueEnrichment(ticketId) {
  JOBS.push({ ticketId });
  if (!running) runLoop();
}

async function runLoop() {
  running = true;
  while (JOBS.length) {
    const job = JOBS.shift();
    try { await processJob(job); }
    catch (e) { console.error('[queue]', job.ticketId, e.message); }
  }
  running = false;
}

async function processJob({ ticketId }) {
  const { data: ticket } = await supabaseAdmin
    .from('tickets').select('*').eq('id', ticketId).single();
  if (!ticket || ticket.ai_status === 'succeeded') return;

  const result = await classifyTicket({
    subject: ticket.subject,
    description: ticket.description,
  });

  await supabaseAdmin.from('tickets').update({
    ai_category: result.category,
    ai_priority: result.priority,
    category: ticket.override_category || result.category,
    priority: ticket.override_priority || result.priority,
    ai_status: result.source === 'ai' ? 'succeeded' : 'fallback',
    ai_error: result.source === 'ai' ? null : result.source,
    enrichment_attempts: (ticket.enrichment_attempts || 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq('id', ticket.id);

  console.log(`[queue] ${ticket.id} → ${result.category}/${result.priority} (${result.source})`);
}
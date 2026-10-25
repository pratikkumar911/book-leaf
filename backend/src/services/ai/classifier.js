import { callGroq } from './groq.js';
import { CATEGORIES } from './knowledgeBase.js';
import { breakers } from './circuitBreaker.js';
import { config } from '../../config.js';
import { supabaseAdmin } from '../../supabase.js';

const KEYWORD_RULES = [
  { cat: 'ISBN & Metadata Issues', re: /\b(isbn|metadata|wrong book|duplicate isbn)\b/i, prio: 'High' },
  { cat: 'Royalty & Payments',     re: /\b(royalt|payment|payout|paid|bank|amount|earnings|money)\b/i, prio: 'High' },
  { cat: 'Printing & Quality',     re: /\b(print|binding|blurry|misalign|defect|quality|reprint|paper)\b/i, prio: 'High' },
  { cat: 'Distribution & Availability', re: /\b(unavailable|out of stock|listing|amazon|flipkart|not showing)\b/i, prio: 'Medium' },
  { cat: 'Book Status & Production Updates', re: /\b(typeset|cover design|proof|production|status|when.*(publish|live|ready))\b/i, prio: 'Medium' },
];
const URGENCY = /\b(months?|not received|still|overdue|urgent|escalate|asap|immediately|never)\b/i;

export function keywordClassify(subject, description) {
  const text = `${subject}\n${description}`;
  for (const r of KEYWORD_RULES) {
    if (r.re.test(text)) {
      const urgent = URGENCY.test(text) || r.cat === 'ISBN & Metadata Issues';
      return {
        category: r.cat,
        priority: urgent ? (r.cat === 'ISBN & Metadata Issues' ? 'Critical' : 'High') : r.prio,
        source: 'keyword_fallback',
      };
    }
  }
  return { category: 'General Inquiry', priority: 'Low', source: 'keyword_fallback' };
}

const SYSTEM_PROMPT = `You are a support ticket triage assistant for BookLeaf Publishing, a self-publishing company.

Classify the ticket into exactly ONE of:
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Priority guidance:
- Critical: ISBN errors, legal/compliance, high-value authors blocked
- High: overdue royalties, print defects, book unavailable after publication
- Medium: production delays, metadata updates, contextual questions
- Low: general questions, bio updates

Respond with ONLY valid JSON:
{"category": "<category>", "priority": "Critical|High|Medium|Low", "reason": "<one sentence>"}`;

export async function classifyTicket({ subject, description, ticketId }) {
  // Cost optimization: only first 500 chars of description.
  const excerpt = description.slice(0, 500);

  if (!breakers.classify.canCall()) {
    const r = { ...keywordClassify(subject, description), source: 'circuit_open_fallback' };
    logUsage({ ticketId, capability: 'classify', success: false, errorType: 'circuit_open' });
    return r;
  }

  const started = Date.now();
  try {
      const { content, usage, model } = await callGroq({
        model: config.groq.classifyModel,
        maxTokens: 150,
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Subject: ${subject}\n\nDescription: ${excerpt}` },
        ],
      });

    const parsed = safeParseJson(content);
    if (!parsed || !CATEGORIES.includes(parsed.category) || !parsed.priority) {
      const e = new Error('Bad classification output'); e.code = 'bad_output'; e.transient = false; throw e;
    }
    breakers.classify.recordSuccess();
    logUsage({ ticketId, capability: 'classify', model, usage, success: true, latencyMs: Date.now() - started });
    return { category: parsed.category, priority: parsed.priority, reason: parsed.reason, source: 'ai' };
  } catch (e) {
    breakers.classify.recordFailure(e.transient !== false);
    logUsage({ ticketId, capability: 'classify', model: config.groq.classifyModel, success: false, errorType: e.code || 'unknown', latencyMs: Date.now() - started });
    console.warn('[classify] fallback:', e.message);
    return { ...keywordClassify(subject, description), source: 'ai_error_fallback' };
  }
}

function safeParseJson(s) {
  if (!s) return null;
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function logUsage(row) {
  supabaseAdmin.from('ai_usage').insert(row).then(({ error }) => {
    if (error) console.warn('[ai_usage]', error.message);
  });
}
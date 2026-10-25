import { callGroq } from './groq.js';
import { kbForCategory, KB } from './knowledgeBase.js';
import { breakers } from './circuitBreaker.js';
import { config } from '../../config.js';

const TEMPLATES = {
  'Royalty & Payments': (a, b) => `Hi ${a},\n\nThank you for reaching out about your royalties for ${b}. Royalties are calculated quarterly and paid within 45 days of the quarter ending (payouts go via bank transfer to the account linked in your dashboard; minimum threshold ₹1,000).\n\nOur team is checking your royalty ledger and will follow up within 48 hours with a specific breakdown and next payout date.\n\nWarm regards,\nBookLeaf Support`,
  'ISBN & Metadata Issues': (a, b) => `Hi ${a},\n\nThank you for flagging this — an incorrect ISBN is treated as a high-priority issue at BookLeaf. We're escalating the matter for ${b} to our production team now and will update you within 48 hours with a resolution plan.\n\nWarm regards,\nBookLeaf Support`,
  'Printing & Quality': (a, b) => `Hi ${a},\n\nWe're sorry to hear about the quality issue with ${b}. Could you please share photos of the defective copies? Once we verify, we will arrange a free reprint (typically within 5–7 business days).\n\nWarm regards,\nBookLeaf Support`,
  'Distribution & Availability': (a, b) => `Hi ${a},\n\nThanks for letting us know that ${b} is showing as unavailable. This is usually a stock sync issue — our team is triggering a re-sync with the distribution partner, and it should reflect correctly within 24–48 hours.\n\nWarm regards,\nBookLeaf Support`,
  'Book Status & Production Updates': (a, b) => `Hi ${a},\n\nThank you for your patience with the production of ${b}. Our team is checking the current production stage and will update you within 48 hours with a specific timeline and next step.\n\nWarm regards,\nBookLeaf Support`,
  'General Inquiry': (a, b) => `Hi ${a},\n\nThank you for your note about ${b}. Our team is looking into your question and will respond within 48 hours with a specific answer.\n\nWarm regards,\nBookLeaf Support`,
};

export function templateDraft({ authorName, bookTitle, category }) {
  const fn = TEMPLATES[category] || TEMPLATES['General Inquiry'];
  return fn(authorName || 'there', bookTitle || 'your book');
}

export async function draftResponse({ ticket, author, book }) {
  if (!breakers.draft.canCall()) {
    return { text: templateDraft({ authorName: author?.name, bookTitle: book?.title, category: ticket.category }), source: 'template' };
  }

  const category = ticket.category || 'General Inquiry';
  const kbSections = kbForCategory(category).join('\n\n');

  // Only this book's numbers, not the whole catalog.
  const bookContext = book
    ? `Book in question:
- Title: ${book.title}
- ISBN: ${book.isbn || 'N/A'}
- Genre: ${book.genre || 'N/A'}
- Status: ${book.status}
- MRP: ₹${book.mrp ?? 'N/A'}
- Copies sold: ${book.total_copies_sold ?? 0}
- Royalty earned: ₹${book.total_royalty_earned ?? 0}
- Royalty paid: ₹${book.royalty_paid ?? 0}
- Royalty pending: ₹${book.royalty_pending ?? 0}
- Last payout: ${book.last_royalty_payout_date || 'N/A'}`
    : 'No specific book — general/account-level query.';

  const systemPrompt = `You are a senior support representative at BookLeaf Publishing. Draft a reply to an author's support ticket.

Use ONLY the Knowledge Base sections below — do not invent policies.
Match the BookLeaf tone: empathetic, specific (include numbers/dates), own BookLeaf's mistakes directly, end with a clear next step + timeline.

${kbSections}

${KB.tone}`;

  const userPrompt = `Author: ${author?.name || 'Author'}
${bookContext}

Ticket subject: ${ticket.subject}
Ticket description (may be truncated):
${ticket.description.slice(0, 1500)}

Write the reply. Sign off as "Warm regards,\\nBookLeaf Support".
Under 180 words. Plain prose — no headings or bullet symbols.`;

  try {
    const { content, finishReason } = await callGroq({
      model: config.groq.draftModel,
      maxTokens: 1200,
      temperature: 0.4,
      reasoningEffort: 'low',
      hideReasoning: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    if (!content.trim() || finishReason === 'length') {
      const error = new Error(finishReason === 'length' ? 'Groq draft reached the token limit' : 'Groq returned an empty draft');
      error.code = 'incomplete_response';
      error.transient = false;
      throw error;
    }
    breakers.draft.recordSuccess();
    return { text: content.trim(), source: 'ai' };
  } catch (e) {
    breakers.draft.recordFailure(e.transient !== false);
    console.warn('[draft] fallback:', e.message);
    return {
      text: templateDraft({ authorName: author?.name, bookTitle: book?.title, category }),
      source: 'template',
    };
  }
}

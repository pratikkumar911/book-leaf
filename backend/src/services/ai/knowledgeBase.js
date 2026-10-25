export const KB = {
  overview: `Company Overview:
- BookLeaf Publishing is a self-publishing company operating in India and the US.
- Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium).
- Services: cover design, typesetting, ISBN assignment, printing, distribution, royalties.
- In-house print facility in Delhi. Print partners: Repro India, Epitome Books.`,

  royalty: `Royalty Policy:
- 80/20 split: 80% of net profit per book to the author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission, shipping.
- Royalties calculated quarterly, paid within 45 days of the quarter ending.
- Minimum payout threshold: ₹1,000; below this, royalties roll over to next quarter.
- Payouts via bank transfer to the account linked in the author dashboard.
- Authors can view a detailed royalty breakdown per platform in the dashboard.`,

  isbn: `ISBN Policy:
- Every book receives a unique ISBN from BookLeaf, registered under BookLeaf's imprint.
- Authors who want an ISBN under their own imprint must obtain it independently.
- ISBN errors (duplicate, wrong book linked) are HIGH priority and escalated immediately.`,

  printing: `Printing & Quality:
- In-house printing handles most orders. Overflow or special formats go to Repro India or Epitome Books.
- Standard print turnaround: 5–7 business days from order confirmation.
- Quality issues (misprints, binding defects, colour inconsistency): BookLeaf arranges a free reprint after verification. Author may need to share photos.`,

  distribution: `Distribution & Availability:
- Listed on Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store.
- New listings typically go live within 7–10 business days after publication.
- Unavailable listings usually indicate a stock sync issue — a re-sync fixes it within 24–48 hours.`,

  production: `Production Stages:
- Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
- Authors are updated at each stage via email.
- Delays typically at Cover Design (author approval) and Proofreading (revision rounds).`,

  tone: `Communication Tone Guidelines:
- Always empathetic and professional. Authors are partners, not customers.
- Acknowledge the concern before jumping to solutions.
- Be specific — include actual numbers, dates, statuses wherever possible.
- If it is BookLeaf's fault (delayed royalties, ISBN error), own it directly.
- If escalation is needed, give a clear timeline ("within 48 hours").
- Always end with a clear next step.`,
};

export const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

// Category → KB sections — never send the whole KB.
export function kbForCategory(category) {
  switch (category) {
    case 'Royalty & Payments': return [KB.royalty, KB.tone];
    case 'ISBN & Metadata Issues': return [KB.isbn, KB.tone];
    case 'Printing & Quality': return [KB.printing, KB.production, KB.tone];
    case 'Distribution & Availability': return [KB.distribution, KB.tone];
    case 'Book Status & Production Updates': return [KB.production, KB.tone];
    default: return [KB.overview, KB.tone];
  }
}
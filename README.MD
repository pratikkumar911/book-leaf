# BookLeaf Author Support Portal

Support portal with author + admin interfaces. AI-assisted triage and drafting via Groq. Designed so **AI is an enhancement, not a dependency** — tickets work with the AI provider unreachable.

---

## Stack & Setup

**Stack:** React 18 + Vite · Redux Toolkit / RTK Query · Node 20 + Express · Supabase (Postgres + Auth) · Groq (GPT-OSS 20B + 120B)

```bash
# 1. Create Supabase project → run backend/db/schema.sql in SQL editor
# 2. Get Groq key at console.groq.com/keys

cd backend && cp .env.example .env       # fill SUPABASE_* + GROQ_*
cp ../bookleaf_sample_data.json seed/data.json
npm install && npm run seed && npm run dev    # :4000

cd ../frontend && cp .env.example .env    # set VITE_API_URL if the API is not localhost:4000
npm install && npm run dev                # :5173
```

**Demo logins** (password `bookleaf123`): `admin@bookleaf.com`, `priya.sharma@email.com`, `rohit.kapoor@email.com`, all 10 authors.

If `GROQ_API_KEY` is unset, the app still runs — classification falls back to keyword rules, drafts fall back to BookLeaf-tone templates.

## Vercel deployment

The root `vercel.json` deploys `backend` and `frontend` as separate Vercel services in one project and on one domain. `/api/*` routes to Express; all other paths route to the Vite frontend. In production, the frontend uses same-origin `/api` requests. Configure the backend environment variables in Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGIN` (the exact site origin, including `https://`), and optionally `GROQ_API_KEY`. Set `NODE_ENV=production` for production authentication cookies.

---

## Choices & Tradeoffs

| Choice | Why | Tradeoff |
|---|---|---|
| **Supabase Postgres** over MongoDB | Data is relational (author→books→tickets→messages); admin queue joins across 3 tables at request time | More tables/FKs than a document store; but avoids application-side joins |
| **HttpOnly cookie sessions** | Access and refresh tokens are not exposed to browser JavaScript; unsafe API requests also validate the configured frontend Origin | Cookie-based auth requires exact CORS/Origin configuration and HTTPS in production |
| **RTK Query polling** over SSE | Reuses the existing data-fetching layer and backend cookie-auth boundary; straightforward to implement for this assignment | Updates can be delayed by up to 10–20 seconds and require repeated requests; SSE would be more immediate, but needs persistent connection management, reconnect/session-expiry handling, per-user event authorization and beyond this project's scale |
| **Supabase Auth** over custom JWT | Managed auth, no password-reset infra to build | Tied to Supabase; acceptable at this scope |
| **Groq** over OpenAI/Anthropic | <1s inference (LPU) vs ~3–5s; effectively free at demo volume; OpenAI-compatible API so provider swap is one file | Llama 3.3 70B is behind GPT-4o on empathy — calibrated with tight tone prompts + template fallback |
| **Two models** (8B classify / 70B draft) | Classification runs on every ticket; drafting only on explicit click. 8B is ~10× cheaper per token | Two models to maintain — but classification needs near-zero intelligence, drafting needs tone |
| **Single-label classification + keyword augmentation** | Multi-label LLM calls cost +30% output tokens and are less deterministic; the realistic multi-topic query (royalty + distribution) is caught by keyword regex | A third concurrent topic could be missed — production evolution is multi-label with KB-union |
| **Async enrichment queue** (not awaited in POST) | Ticket creation never blocks on Groq; author gets an instant 201 | Eventual consistency — category appears a second later; admin queue is polled anyway |
| **RTK `resetApiState()` on logout** | Prevents next user from briefly seeing previous user's cached data | One extra import in `AuthContext` |

---

## API Layer

**Endpoints** (session cookies are HttpOnly; no bearer tokens are exposed to frontend JavaScript):

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | — | Email/password → HttpOnly session cookies |
| POST | `/api/auth/refresh` | Any | Refresh session cookies |
| POST | `/api/auth/logout` | Any | Revoke current session and clear cookies |
| GET | `/api/auth/me` | Any | Current user `{id, role, authorId}` |
| GET | `/api/books` | Author | Own books |
| GET | `/api/tickets` | Author | Own tickets |
| GET | `/api/tickets/:id` | Author | Detail (internal notes filtered) |
| POST | `/api/tickets` | Author | Create (async AI enrichment) |
| GET | `/api/admin/tickets` | Admin | Queue; `?status&category&priority&sort=priority\|recent` |
| GET | `/api/admin/tickets/:id` | Admin | Detail incl. internal notes |
| PATCH | `/api/admin/tickets/:id` | Admin | Update status / override category / priority / assignee |
| POST | `/api/admin/tickets/:id/messages` | Admin | Reply (`is_internal=false`) or internal note |
| POST | `/api/admin/tickets/:id/draft` | Admin | AI draft → `{draft, source: 'ai'\|'template'}` |
| POST | `/api/admin/tickets/:id/retry-ai` | Admin | Re-enqueue classification |
| GET | `/api/admin/stats` | Admin | Totals + AI fallback rate |

**Conventions:** plural nouns, verbs via HTTP, filters as query strings. **Errors:** `{error, details?}` with proper status — Zod → 400, missing/invalid session → 401, RBAC → 403, missing → 404. 500 is reserved for genuine server faults (logged with stack) — no generic 500s for user errors.

**Validation:** every body Zod-parsed. **RBAC:** `requireAuth` / `requireRole()` middleware. Unsafe requests must include the configured frontend Origin; deploy the frontend and API over HTTPS in production.

Set `NODE_ENV=production` on the backend in production so auth cookies use `Secure` and `SameSite=None`; use `NODE_ENV=development` locally.

**AI override semantics:** `tickets` stores both `ai_category` + `category`, `ai_priority` + `priority`. `PATCH` writes to `override_*`. This lets the admin correct the AI while preserving the original for stats (`ai_override_rate` computes from the same columns).

---

## AI Integration

### Error handling — graceful degradation

**Rule:** AI is on the enhancement path, not the critical path.

```js
// routes/tickets.js — POST never awaits the AI
await insert ticket; await insert first message;
enqueueEnrichment(ticket.id);        // fire-and-forget
res.status(201).json(ticket);        // author gets instant response
```

**Failure taxonomy** (`services/ai/groq.js`):

| Condition | Transient? | Retry? | Result |
|---|---|---|---|
| 429 (+Retry-After) | yes | backoff | Re-enqueued |
| Timeout / network / 5xx | yes | yes | Breaker counts |
| **401 / 403** | **no** | **no** | Alert, fallback, breaker opens |
| **400 (bad model)** | **no** | **no** | Fallback, log for fix |
| Bad JSON output | **no** | **no** | Keyword fallback |

**Two primitives on top:**

1. **Circuit breaker** (`services/ai/circuitBreaker.js`) — one per capability (classify vs draft independent). Opens after 5 failures/60s, 5-min cooldown, half-open probe. Cost of an outage: ~5 calls per window instead of one per incoming ticket.
2. **Fallback ladder** — every capability has a deterministic non-AI answer:
   - Classify → `keywordClassify()` (regex rules covering all 6 categories)
   - Priority → urgency keyword heuristic + category inheritance
   - Draft → `templateDraft()` — category-specific BookLeaf-tone templates from the same KB, pre-filled into the editable textarea

**UX:** admin sees *"AI draft unavailable — using BookLeaf template. Edit before sending."* plus a **Retry AI** button. Author sees nothing — the flow is identical.

**Demo to verify:** unset `GROQ_API_KEY`, restart backend, create ticket → category is a keyword guess, draft is a template, admin edits and sends. Full flow works.

---

## Live data updates

| Surface | Mechanism | Why |
|---|---|---|
| Ticket detail (both roles) | RTK Query polls every 10s | Keeps ticket threads current without exposing a Supabase session token to browser JavaScript |
| Author ticket list | RTK Query polls every 20s | Status changes are reflected without a direct database channel |
| Admin queue | 15s poll only | A reordering list mid-read is worse UX than slight delay |

Direct Supabase Realtime subscriptions were removed because they required exposing the user's access token to browser JavaScript.

---

## Known limitations

1. Drafts not cached per ticket (fix in Cost awareness)
2. Refresh cookies are limited to 30 days
3. Classification single-label — third concurrent topic could be missed
4. No monthly AI spend cap (visible in `ai_usage`, not enforced)
5. Attachment UI-only
6. `ai_usage` logging is fire-and-forget

## If I had more time

Priority order: (1) per-ticket draft caching, (2) monthly spend cap with nightly job, (3) multi-label classification, (4) attachment upload, (5) `pgvector` retrieval. None of them are "more AI" — all reduce cost or attack surface of the AI that's there.
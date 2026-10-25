-- Authors
create table authors (
  id uuid primary key default gen_random_uuid(),
  author_code text unique not null, -- AUTH001
  name text not null,
  email text unique not null,
  phone text,
  city text,
  joined_date date,
  created_at timestamptz default now()
);

-- Books
create table books (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references authors(id) on delete cascade,
  book_code text unique not null, -- BK001
  title text not null,
  isbn text,
  genre text,
  publication_date date,
  status text not null default 'Published & Live',
  mrp numeric,
  author_royalty_per_copy numeric,
  total_copies_sold int default 0,
  total_royalty_earned numeric default 0,
  royalty_paid numeric default 0,
  royalty_pending numeric default 0,
  last_royalty_payout_date date,
  print_partner text,
  available_on text[] default '{}',
  created_at timestamptz default now()
);

-- Profiles (linked to auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('author','admin')),
  author_id uuid references authors(id),
  email text not null,
  created_at timestamptz default now()
);

-- Tickets
create table tickets (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references authors(id) on delete cascade,
  book_id uuid references books(id) on delete set null,
  subject text not null,
  description text not null,
  category text, -- final category (AI or override or manual)
  ai_category text,
  override_category text,
  priority text check (priority in ('Critical','High','Medium','Low')),
  ai_priority text,
  override_priority text,
  status text not null default 'Open' check (status in ('Open','In Progress','Resolved','Closed')),
  assigned_to uuid references auth.users(id),
  attachment_url text,
  ai_status text not null default 'pending',
  ai_error text,
  enrichment_attempts int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ticket messages
create table ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  author_id uuid references authors(id), -- null if admin message
  admin_id uuid references auth.users(id), -- null if author message
  sender_type text not null check (sender_type in ('author','admin')),
  content text not null,
  is_internal boolean default false,
  draft_source text, -- 'ai' | 'template' | 'manual' | null
  created_at timestamptz default now()
);

-- AI usage log
create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id),
  capability text not null, -- 'classify' | 'draft'
  model text,
  prompt_tokens int,
  completion_tokens int,
  cached_tokens int,
  success boolean,
  error_type text,
  latency_ms int,
  created_at timestamptz default now()
);

-- Indexes
create index on tickets (author_id, created_at desc);
create index on tickets (status, priority, created_at desc);
create index on ticket_messages (ticket_id, created_at);
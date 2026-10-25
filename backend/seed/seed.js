import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const DATA = JSON.parse(fs.readFileSync(new URL('./data.json', import.meta.url)));
const PASSWORD = 'bookleaf123';

async function run() {
  for (const a of DATA.authors) {
    const { data: authorRow, error: aErr } = await supabase
      .from('authors').upsert({
        author_code: a.author_id, name: a.name, email: a.email,
        phone: a.phone, city: a.city, joined_date: a.joined_date,
      }, { onConflict: 'author_code' }).select('*').single();
    if (aErr) throw aErr;

    for (const b of a.books) {
      const { error: bErr } = await supabase.from('books').upsert({
        author_id: authorRow.id,
        book_code: b.book_id,
        title: b.title,
        isbn: b.isbn,
        genre: b.genre,
        publication_date: b.publication_date,
        status: b.status,
        mrp: b.mrp,
        author_royalty_per_copy: b.author_royalty_per_copy,
        total_copies_sold: b.total_copies_sold,
        total_royalty_earned: b.total_royalty_earned,
        royalty_paid: b.royalty_paid,
        royalty_pending: b.royalty_pending,
        last_royalty_payout_date: b.last_royalty_payout_date,
        print_partner: b.print_partner,
        available_on: b.available_on,
      }, { onConflict: 'book_code' });
      if (bErr) throw bErr;
    }

    const { data: list } = await supabase.auth.admin.listUsers();
    let authUser = list.users.find(u => u.email === a.email);
    if (!authUser) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: a.email, password: PASSWORD, email_confirm: true,
      });
      if (error) throw error;
      authUser = created.user;
    }
    await supabase.from('profiles').upsert({
      id: authUser.id, role: 'author', author_id: authorRow.id, email: a.email,
    }, { onConflict: 'id' });
  }

  const adminEmail = 'admin@bookleaf.com';
  const { data: list } = await supabase.auth.admin.listUsers();
  let admin = list.users.find(u => u.email === adminEmail);
  if (!admin) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: adminEmail, password: PASSWORD, email_confirm: true,
    });
    if (error) throw error;
    admin = created.user;
  }
  await supabase.from('profiles').upsert({
    id: admin.id, role: 'admin', author_id: null, email: adminEmail,
  }, { onConflict: 'id' });

  console.log(`✓ Seed complete.`);
  console.log(`  Admin  : admin@bookleaf.com / ${PASSWORD}`);
  console.log(`  Author : priya.sharma@email.com / ${PASSWORD}`);
}

run().catch(e => { console.error(e); process.exit(1); });
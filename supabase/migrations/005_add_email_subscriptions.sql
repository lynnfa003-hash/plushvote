create table if not exists public.email_subscriptions (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  locale text not null default 'en' check (locale in ('en', 'zh')),
  created_at timestamptz default now()
);

create unique index if not exists email_subscriptions_email_lower_unique
  on public.email_subscriptions (lower(email));

alter table public.email_subscriptions enable row level security;

revoke all on public.email_subscriptions from anon, authenticated;

drop policy if exists "Admins can manage email subscriptions" on public.email_subscriptions;
create policy "Admins can manage email subscriptions"
on public.email_subscriptions
for all
to authenticated
using (public.is_plushvote_admin())
with check (public.is_plushvote_admin());

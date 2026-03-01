create or replace function public.is_plushvote_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    auth.role() = 'service_role'
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

alter table public.plush_toys enable row level security;
alter table public.votes enable row level security;

drop policy if exists "Public read approved plush toys" on public.plush_toys;
create policy "Public read approved plush toys"
on public.plush_toys
for select
to anon, authenticated
using (is_approved = true or public.is_plushvote_admin());

drop policy if exists "Admins can insert plush toys" on public.plush_toys;
create policy "Admins can insert plush toys"
on public.plush_toys
for insert
to authenticated
with check (public.is_plushvote_admin());

drop policy if exists "Admins can update plush toys" on public.plush_toys;
create policy "Admins can update plush toys"
on public.plush_toys
for update
to authenticated
using (public.is_plushvote_admin())
with check (public.is_plushvote_admin());

drop policy if exists "Admins can delete plush toys" on public.plush_toys;
create policy "Admins can delete plush toys"
on public.plush_toys
for delete
to authenticated
using (public.is_plushvote_admin());

drop policy if exists "Public can read votes" on public.votes;
create policy "Public can read votes"
on public.votes
for select
to anon, authenticated
using (true);

drop policy if exists "Public can insert votes for approved toys" on public.votes;
create policy "Public can insert votes for approved toys"
on public.votes
for insert
to anon, authenticated
with check (
  public.is_plushvote_admin()
  or exists (
    select 1
    from public.plush_toys
    where plush_toys.id = toy_id
      and plush_toys.is_approved = true
  )
);

grant select on public.plush_toys to anon, authenticated;
grant select, insert, update, delete on public.plush_toys to authenticated;
grant select, insert on public.votes to anon, authenticated;

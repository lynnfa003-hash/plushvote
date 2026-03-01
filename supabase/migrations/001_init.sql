create table plush_toys (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  image_url text not null,
  category text check (category in ('已量产', '设计稿', '同人创作')) default '设计稿',
  vote_count integer default 0,
  is_approved boolean default false,
  created_at timestamptz default now()
);

create table votes (
  id uuid default gen_random_uuid() primary key,
  toy_id uuid references plush_toys(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz default now(),
  unique(toy_id, voter_id)
);

create or replace function increment_vote_count() returns trigger as $$
begin update plush_toys set vote_count = vote_count + 1 where id = NEW.toy_id; return NEW; end;
$$ language plpgsql;
create trigger on_vote_insert after insert on votes for each row execute function increment_vote_count();

create or replace function decrement_vote_count() returns trigger as $$
begin update plush_toys set vote_count = vote_count - 1 where id = OLD.toy_id; return OLD; end;
$$ language plpgsql;
create trigger on_vote_delete after delete on votes for each row execute function decrement_vote_count();

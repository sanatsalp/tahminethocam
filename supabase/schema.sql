-- ============================================
-- tahminethocam Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  email text not null,
  role text not null default 'pending' check (role in ('pending', 'user', 'admin')),
  credits integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_bonus_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security
alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Service role can do everything on profiles" on public.profiles
  using (true) with check (true);

-- ============================================
-- MATCHES TABLE
-- ============================================
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  player_a text not null,
  player_b text not null,
  odds_a numeric(5,2) not null default 1.50,
  odds_b numeric(5,2) not null default 1.50,
  status text not null default 'open' check (status in ('open', 'closed', 'finished')),
  winner text check (winner in ('A', 'B', null)),
  tournament text not null default 'ODTÜ Tenis Turnuvası',
  scheduled_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id)
);

alter table public.matches enable row level security;

create policy "Anyone can view matches" on public.matches
  for select using (true);

create policy "Admins can insert matches" on public.matches
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update matches" on public.matches
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================
-- PREDICTIONS TABLE
-- ============================================
create table public.predictions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  choice text not null check (choice in ('A', 'B')),
  amount integer not null check (amount > 0),
  potential_win numeric(10,2) not null,
  result text not null default 'pending' check (result in ('pending', 'won', 'lost')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, match_id)
);

alter table public.predictions enable row level security;

create policy "Users can view own predictions" on public.predictions
  for select using (auth.uid() = user_id);

create policy "Admins can view all predictions" on public.predictions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can insert own predictions" on public.predictions
  for insert with check (auth.uid() = user_id);

create policy "Admins can update predictions" on public.predictions
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================
-- CREDIT TRANSACTIONS TABLE
-- ============================================
create table public.credit_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('prediction', 'win', 'bonus', 'admin_grant', 'initial')),
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.credit_transactions enable row level security;

create policy "Users can view own transactions" on public.credit_transactions
  for select using (auth.uid() = user_id);

create policy "Admins can view all transactions" on public.credit_transactions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Service role full access to transactions" on public.credit_transactions
  using (true) with check (true);

-- ============================================
-- FUNCTION: Handle New User
-- Auto-creates profile on auth signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, role, credits)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    'pending',
    0
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- FUNCTION: Close Match & Resolve Predictions
-- ============================================
create or replace function public.close_match(match_id_param uuid, winner_param text)
returns void as $$
declare
  pred record;
  win_amount numeric;
  odds_val numeric;
begin
  -- Get match odds
  select case when winner_param = 'A' then odds_a else odds_b end
  into odds_val
  from public.matches
  where id = match_id_param;

  -- Update match status
  update public.matches
  set status = 'finished', winner = winner_param
  where id = match_id_param;

  -- Resolve each prediction
  for pred in
    select * from public.predictions
    where match_id = match_id_param and result = 'pending'
  loop
    if pred.choice = winner_param then
      -- Winner: calculate winnings
      win_amount := pred.amount * odds_val;
      
      update public.predictions
      set result = 'won'
      where id = pred.id;
      
      update public.profiles
      set credits = credits + win_amount::integer
      where id = pred.user_id;
      
      insert into public.credit_transactions (user_id, amount, type, description)
      values (pred.user_id, win_amount::integer, 'win', 'Tahmin kazancı - Maç #' || match_id_param);
    else
      -- Loser
      update public.predictions
      set result = 'lost'
      where id = pred.id;
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================
-- INITIAL ADMIN SETUP (Run after first registration)
-- Replace 'your-email@example.com' with your email
-- ============================================
-- UPDATE public.profiles SET role = 'admin', credits = 999999 WHERE email = 'your-email@example.com';

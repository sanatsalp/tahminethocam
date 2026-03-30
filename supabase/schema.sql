-- 1. PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'pending' CHECK (role IN ('pending', 'user', 'admin', 'blocked')),
  credits INT DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  avatar_url TEXT,
  chat_blocked BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false
);

-- 2. SITE SETTINGS
CREATE TABLE site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  title TEXT DEFAULT 'tahminethocam',
  subtitle TEXT DEFAULT 'ODTÜ Tahmin Platformu',
  logo_emoji TEXT DEFAULT '🎾',
  custom_logo_url TEXT,
  chat_enabled BOOLEAN DEFAULT true
);

-- 3. MATCHES
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  player_a TEXT NOT NULL,
  player_b TEXT NOT NULL,
  player_a_img TEXT,
  player_b_img TEXT,
  odds_a DECIMAL NOT NULL,
  odds_b DECIMAL NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'finished')),
  winner TEXT CHECK (winner IN ('A', 'B') OR winner IS NULL),
  tournament TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL
);

-- 4. PREDICTIONS
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  choice TEXT NOT NULL CHECK (choice IN ('A', 'B')),
  amount INT NOT NULL,
  potential_win INT NOT NULL,
  result TEXT DEFAULT 'pending' CHECK (result IN ('pending', 'won', 'lost')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TRANSACTIONS
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('prediction', 'win', 'bonus', 'admin_grant', 'initial')),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CHAT MESSAGES
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  text TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn off RLS globally since we are executing business logic directly via client logic and trusting all auth connections.
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Realtime configuration (optional for standard features but we can use it safely for UI polling replacements if needed)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE profiles, matches, predictions, transactions, chat_messages, site_settings;
COMMIT;

-- Trigger for new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role, credits, is_approved, is_blocked)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.email, 'pending', 1000, false, false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert initial settings configuration
INSERT INTO site_settings (id, title, subtitle, logo_emoji, chat_enabled) 
VALUES (1, 'tahminethocam', 'ODTÜ Tahmin Platformu', '🎾', true) 
ON CONFLICT (id) DO NOTHING;

-- Tower Game feature flags + limits
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS tower_game_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tower_game_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tower_game_maintenance BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tower_game_max_bet_amount INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS tower_game_daily_play_limit INT DEFAULT 3;

-- 7. TOWER GAME (Mini game)
CREATE TABLE tower_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bet_amount INT NOT NULL CHECK (bet_amount > 0 AND bet_amount <= 50),
  current_level INT NOT NULL DEFAULT 0,
  multiplier NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tower_game_limits (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  games_played INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Constants are intentionally kept in function bodies (server-side only).
-- NOTE: Since this project disables RLS globally in schema.sql, we must validate
-- everything inside RPCs using auth.uid().

-- Start game: validates daily limit + credits, deducts bet atomically, creates session.
CREATE OR REPLACE FUNCTION public.tower_game_start(p_bet_amount INT)
RETURNS TABLE (
  session_id UUID,
  bet_amount INT,
  current_level INT,
  multiplier NUMERIC,
  is_active BOOLEAN,
  remaining_games INT,
  games_played INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := current_date;
  v_enabled BOOLEAN := true;
  v_visible BOOLEAN := true;
  v_maintenance BOOLEAN := false;
  v_daily_limit INT := 3;
  v_max_bet INT := 50;
  v_credits INT;
  v_games_played INT;
  v_session_id UUID;
  v_secret TEXT := 'tower_game_secret_v1';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Feature toggle + limits are configured from `site_settings`.
  SELECT
    COALESCE(ss.tower_game_enabled, true),
    COALESCE(ss.tower_game_visible, true),
    COALESCE(ss.tower_game_maintenance, false),
    COALESCE(ss.tower_game_max_bet_amount, 50),
    COALESCE(ss.tower_game_daily_play_limit, 3)
  INTO
    v_enabled, v_visible, v_maintenance, v_max_bet, v_daily_limit
  FROM site_settings ss
  WHERE ss.id = 1;

  IF v_maintenance THEN
    RAISE EXCEPTION 'Tower Game is under maintenance';
  END IF;

  IF NOT v_enabled OR NOT v_visible THEN
    RAISE EXCEPTION 'Tower Game is currently unavailable';
  END IF;

  IF p_bet_amount IS NULL OR p_bet_amount <= 0 OR p_bet_amount > v_max_bet THEN
    RAISE EXCEPTION 'Invalid bet amount';
  END IF;

  SELECT p.credits INTO v_credits
  FROM profiles p
  WHERE p.id = v_user_id
  FOR UPDATE;

  IF v_credits IS NULL OR v_credits < p_bet_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Lock today's limit row so concurrent starts can't bypass the limit.
  INSERT INTO tower_game_limits(user_id, date, games_played)
  VALUES (v_user_id, v_today, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  SELECT tgl.games_played INTO v_games_played
  FROM tower_game_limits tgl
  WHERE tgl.user_id = v_user_id AND tgl.date = v_today
  FOR UPDATE;

  v_games_played := COALESCE(v_games_played, 0);

  IF v_games_played >= v_daily_limit THEN
    RAISE EXCEPTION 'Daily limit reached';
  END IF;

  UPDATE tower_game_limits tgl
  SET games_played = tgl.games_played + 1
  WHERE tgl.user_id = v_user_id AND tgl.date = v_today;

  -- Deduct bet (atomic guard).
  UPDATE profiles p
  SET credits = p.credits - p_bet_amount
  WHERE p.id = v_user_id AND p.credits >= p_bet_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO tower_game_sessions(user_id, bet_amount, current_level, multiplier, is_active)
  VALUES (v_user_id, p_bet_amount, 0, 1, true)
  RETURNING id INTO v_session_id;

  session_id := v_session_id;
  bet_amount := p_bet_amount;
  current_level := 0;
  multiplier := 1;
  is_active := true;

  games_played := v_games_played + 1;
  remaining_games := v_daily_limit - games_played;

  RETURN NEXT;
END;
$$;

-- Verify a single tile selection (no credit change, no DB write).
-- This is used for fast UI feedback; the real settlement happens on cashout/lose.
CREATE OR REPLACE FUNCTION public.tower_game_pick_verify(
  p_session_id UUID,
  p_current_level INT,
  p_chosen_index INT
)
RETURNS TABLE (
  is_correct BOOLEAN,
  next_level INT,
  next_multiplier NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_secret TEXT := 'tower_game_secret_v1';
  v_enabled BOOLEAN := true;
  v_visible BOOLEAN := true;
  v_maintenance BOOLEAN := false;
  v_max_level INT := 5;
  v_tile_count INT := 3;
  v_multiplier_step NUMERIC := 1.25;
  v_multipliers NUMERIC[] := ARRAY[1.0, 1.30, 1.70, 2.25, 3.00, 4.00];
  v_session tower_game_sessions%ROWTYPE;
  v_next_level INT;
  v_losing_index INT;
  v_next_multiplier NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Block gameplay if Tower Game is disabled/maintenance.
  SELECT
    COALESCE(ss.tower_game_enabled, true),
    COALESCE(ss.tower_game_visible, true),
    COALESCE(ss.tower_game_maintenance, false)
  INTO
    v_enabled, v_visible, v_maintenance
  FROM site_settings ss
  WHERE ss.id = 1;

  IF v_maintenance THEN
    RAISE EXCEPTION 'Tower Game is under maintenance';
  END IF;

  IF NOT v_enabled OR NOT v_visible THEN
    RAISE EXCEPTION 'Tower Game is currently unavailable';
  END IF;

  SELECT * INTO v_session
  FROM tower_game_sessions tgs
  WHERE tgs.id = p_session_id
  AND tgs.user_id = v_user_id
  AND tgs.is_active = true
  FOR UPDATE;

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'Game session not active';
  END IF;

  IF p_current_level IS NULL OR p_current_level < 0 OR p_current_level >= v_max_level THEN
    RAISE EXCEPTION 'Invalid level';
  END IF;

  IF p_chosen_index IS NULL OR p_chosen_index < 0 OR p_chosen_index >= v_tile_count THEN
    RAISE EXCEPTION 'Invalid tile';
  END IF;

  v_next_level := p_current_level + 1;

  -- Deterministic losing index per session + level + server secret.
  v_losing_index := mod(abs(hashtext(p_session_id::text || ':' || v_next_level::text || ':' || v_secret)), v_tile_count);

  IF p_chosen_index <> v_losing_index THEN
    v_next_multiplier := v_multipliers[v_next_level + 1];
    is_correct := true;
    next_level := v_next_level;
    next_multiplier := v_next_multiplier;
    RETURN NEXT;
  ELSE
    is_correct := false;
    next_level := v_next_level; -- UI can still show "next" row; settlement will correct it.
    next_multiplier := v_multipliers[p_current_level + 1]; -- keeps multiplier at last safe level
    RETURN NEXT;
  END IF;
END;
$$;

-- Settle lose: marks session inactive (no credit changes).
CREATE OR REPLACE FUNCTION public.tower_game_settle_lose(
  p_session_id UUID,
  p_picked_indices INT[]
)
RETURNS TABLE (
  final_level INT,
  final_multiplier NUMERIC,
  is_active BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_secret TEXT := 'tower_game_secret_v1';
  v_enabled BOOLEAN := true;
  v_visible BOOLEAN := true;
  v_maintenance BOOLEAN := false;
  v_max_level INT := 5;
  v_tile_count INT := 3;
  v_multiplier_step NUMERIC := 1.25;
  v_multipliers NUMERIC[] := ARRAY[1.0, 1.30, 1.70, 2.25, 3.00, 4.00];
  v_session tower_game_sessions%ROWTYPE;
  v_correct_count INT := 0;
  v_i INT;
  v_losing_index INT;
  v_multiplier NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Block gameplay if Tower Game is disabled/maintenance.
  SELECT
    COALESCE(ss.tower_game_enabled, true),
    COALESCE(ss.tower_game_visible, true),
    COALESCE(ss.tower_game_maintenance, false)
  INTO
    v_enabled, v_visible, v_maintenance
  FROM site_settings ss
  WHERE ss.id = 1;

  IF v_maintenance THEN
    RAISE EXCEPTION 'Tower Game is under maintenance';
  END IF;

  IF NOT v_enabled OR NOT v_visible THEN
    RAISE EXCEPTION 'Tower Game is currently unavailable';
  END IF;

  SELECT * INTO v_session
  FROM tower_game_sessions tgs
  WHERE tgs.id = p_session_id
  AND tgs.user_id = v_user_id
  AND tgs.is_active = true
  FOR UPDATE;

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'Game session not active';
  END IF;

  IF p_picked_indices IS NULL OR array_length(p_picked_indices, 1) IS NULL THEN
    RAISE EXCEPTION 'Invalid picked indices';
  END IF;

  IF array_length(p_picked_indices, 1) > v_max_level THEN
    RAISE EXCEPTION 'Too many picks';
  END IF;

  -- Count consecutive correct picks from the start.
  v_correct_count := 0;
  FOR v_i IN 1..array_length(p_picked_indices, 1) LOOP
    v_losing_index := mod(abs(hashtext(p_session_id::text || ':' || v_i::text || ':' || v_secret)), v_tile_count);
    IF p_picked_indices[v_i] <> v_losing_index THEN
      v_correct_count := v_correct_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  v_multiplier := v_multipliers[v_correct_count + 1];

  UPDATE tower_game_sessions tgs
  SET current_level = v_correct_count,
      multiplier = v_multiplier,
      is_active = false
  WHERE tgs.id = p_session_id;

  final_level := v_correct_count;
  final_multiplier := v_multiplier;
  is_active := false;
  RETURN NEXT;
END;
$$;

-- Cash out: validates all picks are correct, then atomically credits payout and closes session.
CREATE OR REPLACE FUNCTION public.tower_game_cashout(
  p_session_id UUID,
  p_picked_indices INT[]
)
RETURNS TABLE (
  payout INT,
  final_level INT,
  final_multiplier NUMERIC,
  new_credits INT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_secret TEXT := 'tower_game_secret_v1';
  v_enabled BOOLEAN := true;
  v_visible BOOLEAN := true;
  v_maintenance BOOLEAN := false;
  v_max_level INT := 5;
  v_tile_count INT := 3;
  v_multiplier_step NUMERIC := 1.25;
  v_multipliers NUMERIC[] := ARRAY[1.0, 1.30, 1.70, 2.25, 3.00, 4.00];
  v_session tower_game_sessions%ROWTYPE;
  v_correct_count INT := 0;
  v_i INT;
  v_losing_index INT;
  v_multiplier NUMERIC;
  v_payout INT;
  v_new_credits INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Block gameplay if Tower Game is disabled/maintenance.
  SELECT
    COALESCE(ss.tower_game_enabled, true),
    COALESCE(ss.tower_game_visible, true),
    COALESCE(ss.tower_game_maintenance, false)
  INTO
    v_enabled, v_visible, v_maintenance
  FROM site_settings ss
  WHERE ss.id = 1;

  IF v_maintenance THEN
    RAISE EXCEPTION 'Tower Game is under maintenance';
  END IF;

  IF NOT v_enabled OR NOT v_visible THEN
    RAISE EXCEPTION 'Tower Game is currently unavailable';
  END IF;

  SELECT * INTO v_session
  FROM tower_game_sessions tgs
  WHERE tgs.id = p_session_id
  AND tgs.user_id = v_user_id
  AND tgs.is_active = true
  FOR UPDATE;

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'Game session not active';
  END IF;

  IF p_picked_indices IS NULL OR array_length(p_picked_indices, 1) IS NULL THEN
    RAISE EXCEPTION 'Invalid picked indices';
  END IF;

  IF array_length(p_picked_indices, 1) > v_max_level THEN
    RAISE EXCEPTION 'Too many picks';
  END IF;

  -- Validate all picks are consecutive correct from level 1.
  v_correct_count := 0;
  FOR v_i IN 1..array_length(p_picked_indices, 1) LOOP
    v_losing_index := mod(abs(hashtext(p_session_id::text || ':' || v_i::text || ':' || v_secret)), v_tile_count);
    IF p_picked_indices[v_i] <> v_losing_index THEN
      v_correct_count := v_correct_count + 1;
    ELSE
      -- If any pick is wrong, treat as loss: no payout.
      v_multiplier := v_multipliers[v_correct_count + 1];
      UPDATE tower_game_sessions tgs
      SET current_level = v_correct_count,
          multiplier = v_multiplier,
          is_active = false
      WHERE tgs.id = p_session_id;

      payout := 0;
      final_level := v_correct_count;
      final_multiplier := v_multiplier;
      new_credits := (SELECT p.credits FROM profiles p WHERE p.id = v_user_id);
      is_active := false;
      RETURN NEXT;
    END IF;
  END LOOP;

  IF v_correct_count < 1 THEN
    -- You can't cash out at level 0.
    RAISE EXCEPTION 'Cashout not allowed';
  END IF;

  v_multiplier := v_multipliers[v_correct_count + 1];
  v_payout := FLOOR(v_session.bet_amount * v_multiplier)::INT;

  -- Atomic credit update + close session.
  UPDATE profiles p
  SET credits = p.credits + v_payout
  WHERE p.id = v_user_id
  RETURNING p.credits INTO v_new_credits;

  UPDATE tower_game_sessions tgs
  SET current_level = v_correct_count,
      multiplier = v_multiplier,
      is_active = false
  WHERE tgs.id = p_session_id;

  payout := v_payout;
  final_level := v_correct_count;
  final_multiplier := v_multiplier;
  new_credits := v_new_credits;
  is_active := false;
  RETURN NEXT;
END;
$$;

-- Get today's remaining games (server time).
CREATE OR REPLACE FUNCTION public.tower_game_daily_status()
RETURNS TABLE (
  games_played INT,
  remaining_games INT,
  is_active_session BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := current_date;
  v_enabled BOOLEAN := true;
  v_visible BOOLEAN := true;
  v_maintenance BOOLEAN := false;
  v_daily_limit INT := 3;
  v_games_played INT;
  v_has_active BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT
    COALESCE(ss.tower_game_enabled, true),
    COALESCE(ss.tower_game_visible, true),
    COALESCE(ss.tower_game_maintenance, false),
    COALESCE(ss.tower_game_daily_play_limit, 3)
  INTO
    v_enabled, v_visible, v_maintenance, v_daily_limit
  FROM site_settings ss
  WHERE ss.id = 1;

  IF v_maintenance OR NOT v_enabled OR NOT v_visible THEN
    games_played := 0;
    remaining_games := 0;
    is_active_session := false;
    RETURN NEXT;
  END IF;

  SELECT tgl.games_played INTO v_games_played
  FROM tower_game_limits tgl
  WHERE tgl.user_id = v_user_id AND tgl.date = v_today;

  IF v_games_played IS NULL THEN
    v_games_played := 0;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM tower_game_sessions tgs
    WHERE tgs.user_id = v_user_id AND tgs.is_active = true
  ) INTO v_has_active;

  games_played := v_games_played;
  remaining_games := v_daily_limit - v_games_played;
  is_active_session := v_has_active;

  RETURN NEXT;
END;
$$;

-- RPC execute grants (Supabase calls from anon/authenticated via RPC).
GRANT EXECUTE ON FUNCTION public.tower_game_start(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tower_game_pick_verify(UUID, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tower_game_settle_lose(UUID, INT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tower_game_cashout(UUID, INT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tower_game_daily_status() TO anon, authenticated;

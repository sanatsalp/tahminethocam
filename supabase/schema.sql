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

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Groups
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  days_of_week INT[],
  match_type TEXT CHECK (match_type IN ('futbol5', 'futbol8', 'futbol11')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_own" ON groups FOR ALL USING (user_id = auth.uid());

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  is_guest BOOLEAN DEFAULT FALSE,
  guest_label TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players_own" ON players FOR ALL USING (user_id = auth.uid());

-- Venues
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues_read" ON venues FOR SELECT
  USING (is_global = TRUE OR user_id = auth.uid());
CREATE POLICY "venues_own_write" ON venues FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY "venues_admin_write" ON venues FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Payment aliases
CREATE TABLE payment_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aliases_own" ON payment_aliases FOR ALL USING (user_id = auth.uid());

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id UUID REFERENCES venues(id),
  venue_name_override TEXT,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  total_price NUMERIC(10,2),
  player_count INT,
  payment_alias_id UUID REFERENCES payment_aliases(id),
  score_dark INT,
  score_light INT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'played', 'cancelled')),
  formation_data JSONB,
  share_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_own" ON matches FOR ALL USING (user_id = auth.uid());

-- Match players
CREATE TABLE match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team TEXT CHECK (team IN ('dark', 'light', 'bench')),
  position_x NUMERIC,
  position_y NUMERIC,
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  attended BOOLEAN DEFAULT TRUE,
  UNIQUE(match_id, player_id)
);

ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_players_own" ON match_players FOR ALL
  USING (EXISTS (
    SELECT 1 FROM matches m WHERE m.id = match_id AND m.user_id = auth.uid()
  ));

-- Player stats view
CREATE OR REPLACE VIEW player_stats AS
SELECT
  p.id AS player_id,
  p.name,
  p.group_id,
  p.user_id,
  COUNT(DISTINCT mp.match_id) AS matches_played,
  COALESCE(SUM(mp.goals), 0) AS total_goals,
  COALESCE(SUM(mp.assists), 0) AS total_assists,
  COUNT(DISTINCT CASE
    WHEN m.score_dark > m.score_light AND mp.team = 'dark' THEN m.id
    WHEN m.score_light > m.score_dark AND mp.team = 'light' THEN m.id
  END) AS wins
FROM players p
LEFT JOIN match_players mp ON mp.player_id = p.id AND mp.attended = TRUE
LEFT JOIN matches m ON m.id = mp.match_id AND m.status = 'played'
GROUP BY p.id, p.name, p.group_id, p.user_id;

-- Admin stats view (no RLS needed, filtered by is_admin in middleware)
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE is_admin = FALSE) AS total_organizers,
  (SELECT COUNT(*) FROM groups WHERE deleted_at IS NULL) AS total_groups,
  (SELECT COUNT(*) FROM matches WHERE status = 'played'
    AND match_date >= date_trunc('month', NOW())) AS matches_this_month,
  (SELECT COUNT(*) FROM profiles WHERE is_admin = FALSE
    AND created_at >= NOW() - INTERVAL '7 days') AS new_organizers_week;

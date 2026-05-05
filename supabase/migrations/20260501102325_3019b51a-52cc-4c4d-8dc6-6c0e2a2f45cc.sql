-- =========================================
-- Profiles
-- =========================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- =========================================
-- Albums
-- =========================================
CREATE TYPE public.album_visibility AS ENUM ('private', 'unlisted', 'public');

CREATE TABLE public.albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  visibility public.album_visibility NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_albums_user ON public.albums(user_id);

CREATE POLICY "Users view own albums"
  ON public.albums FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public albums viewable by all"
  ON public.albums FOR SELECT USING (visibility = 'public');
CREATE POLICY "Users create own albums"
  ON public.albums FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own albums"
  ON public.albums FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own albums"
  ON public.albums FOR DELETE USING (auth.uid() = user_id);

-- =========================================
-- Locations
-- =========================================
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  icon TEXT,
  cover_image_url TEXT,
  visited_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_locations_album ON public.locations(album_id);
CREATE INDEX idx_locations_user ON public.locations(user_id);

CREATE POLICY "Users view own locations"
  ON public.locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public album locations viewable"
  ON public.locations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.albums a
    WHERE a.id = locations.album_id AND a.visibility = 'public'
  ));
CREATE POLICY "Users create own locations"
  ON public.locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own locations"
  ON public.locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own locations"
  ON public.locations FOR DELETE USING (auth.uid() = user_id);

-- =========================================
-- Media
-- =========================================
CREATE TYPE public.media_type AS ENUM ('image', 'video');

CREATE TABLE public.media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  type public.media_type NOT NULL DEFAULT 'image',
  caption TEXT,
  taken_at TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  width INTEGER,
  height INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_media_location ON public.media(location_id);
CREATE INDEX idx_media_user ON public.media(user_id);

CREATE POLICY "Users view own media"
  ON public.media FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public album media viewable"
  ON public.media FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.locations l
    JOIN public.albums a ON a.id = l.album_id
    WHERE l.id = media.location_id AND a.visibility = 'public'
  ));
CREATE POLICY "Users create own media"
  ON public.media FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own media"
  ON public.media FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own media"
  ON public.media FOR DELETE USING (auth.uid() = user_id);

-- =========================================
-- Timestamps trigger
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_albums_updated BEFORE UPDATE ON public.albums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_locations_updated BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- Auto-create profile on signup
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- Storage bucket: media (private)
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own media files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own media files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own media files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own media files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

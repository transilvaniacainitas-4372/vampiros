
-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('player', 'storyteller');
CREATE TYPE public.character_status AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role function (security definer, avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Trigger: cria profile e atribui role ao novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'storyteller');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'player');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- characters
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  clan TEXT,
  concept TEXT,
  portrait_url TEXT,
  sheet_approved JSONB,
  sheet_draft JSONB,
  status public.character_status NOT NULL DEFAULT 'draft',
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.characters TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.characters TO authenticated;
GRANT ALL ON public.characters TO service_role;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Public reads approved characters
CREATE POLICY "public reads approved characters" ON public.characters
  FOR SELECT USING (sheet_approved IS NOT NULL);
-- Owner reads own
CREATE POLICY "owner reads own character" ON public.characters
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
-- Storyteller reads all
CREATE POLICY "storyteller reads all characters" ON public.characters
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'storyteller'));
-- Storyteller inserts
CREATE POLICY "storyteller creates characters" ON public.characters
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'storyteller'));
-- Storyteller updates all
CREATE POLICY "storyteller updates all characters" ON public.characters
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'storyteller')) WITH CHECK (public.has_role(auth.uid(), 'storyteller'));
-- Owner updates own draft (status must be draft or pending after update)
CREATE POLICY "owner updates own draft" ON public.characters
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id AND NOT public.has_role(auth.uid(), 'storyteller'))
  WITH CHECK (auth.uid() = owner_id AND status IN ('draft','pending'));
-- Storyteller deletes
CREATE POLICY "storyteller deletes characters" ON public.characters
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'storyteller'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER characters_set_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

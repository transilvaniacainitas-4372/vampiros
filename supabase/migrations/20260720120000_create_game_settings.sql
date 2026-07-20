CREATE TABLE IF NOT EXISTS public.game_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT game_settings_singleton CHECK (id = 'default')
);

GRANT SELECT ON public.game_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.game_settings TO authenticated;
GRANT ALL ON public.game_settings TO service_role;

ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads game settings" ON public.game_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "storyteller inserts game settings" ON public.game_settings
  FOR INSERT TO authenticated
  WITH CHECK (id = 'default' AND public.has_role(auth.uid(), 'storyteller'));

CREATE POLICY "storyteller updates game settings" ON public.game_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'storyteller'))
  WITH CHECK (id = 'default' AND public.has_role(auth.uid(), 'storyteller'));

DROP TRIGGER IF EXISTS game_settings_set_updated_at ON public.game_settings;
CREATE TRIGGER game_settings_set_updated_at
  BEFORE UPDATE ON public.game_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.game_settings (id, settings)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

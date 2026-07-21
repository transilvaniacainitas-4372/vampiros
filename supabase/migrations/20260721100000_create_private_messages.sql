CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) <= 1000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.private_messages TO authenticated;
GRANT ALL ON public.private_messages TO service_role;

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read own private messages" ON public.private_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "authenticated send private messages" ON public.private_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "authenticated mark own received messages" ON public.private_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE INDEX IF NOT EXISTS private_messages_pair_created_at_idx
  ON public.private_messages (sender_id, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS private_messages_recipient_read_idx
  ON public.private_messages (recipient_id, read_at, created_at DESC);

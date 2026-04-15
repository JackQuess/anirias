-- ============================================================================
-- ANIRIAS - LIVE SUPPORT CHAT SYSTEM
-- Real-time support conversations between users and admins
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS support_conversations_user_id_idx
  ON public.support_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_conversations_status_idx
  ON public.support_conversations(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_messages_conversation_id_created_at_idx
  ON public.support_messages(conversation_id, created_at ASC);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- RLS: USER
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own support conversations" ON public.support_conversations;
CREATE POLICY "Users can view own support conversations"
  ON public.support_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own support conversations" ON public.support_conversations;
CREATE POLICY "Users can create own support conversations"
  ON public.support_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own support messages" ON public.support_messages;
CREATE POLICY "Users can view own support messages"
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_conversations sc
      WHERE sc.id = support_messages.conversation_id
        AND sc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send own support messages" ON public.support_messages;
CREATE POLICY "Users can send own support messages"
  ON public.support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'user'
    AND sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.support_conversations sc
      WHERE sc.id = support_messages.conversation_id
        AND sc.user_id = auth.uid()
        AND sc.status = 'open'
    )
  );

-- --------------------------------------------------------------------------
-- RLS: ADMIN
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all support conversations" ON public.support_conversations;
CREATE POLICY "Admins can view all support conversations"
  ON public.support_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update support conversations" ON public.support_conversations;
CREATE POLICY "Admins can update support conversations"
  ON public.support_conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all support messages" ON public.support_messages;
CREATE POLICY "Admins can view all support messages"
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can send support messages" ON public.support_messages;
CREATE POLICY "Admins can send support messages"
  ON public.support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'admin'
    AND sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- --------------------------------------------------------------------------
-- Realtime publication
-- --------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

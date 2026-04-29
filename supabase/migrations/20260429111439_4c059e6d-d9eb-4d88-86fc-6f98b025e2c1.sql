
-- Add participants list and meeting title to history
ALTER TABLE public.meeting_history
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS participants_list text[];

-- Per-user overrides for chapter items extracted from the PDF
CREATE TABLE IF NOT EXISTS public.chapter_item_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter_slug text NOT NULL,
  -- Identify the original node by its index in the chapter.nodes array.
  node_index integer NOT NULL,
  -- New values (any can be null = keep original)
  override_type text,                -- 'item' | 'heading' | 'paragraph'
  item_number integer,
  heading_text text,
  paragraphs text[],                 -- for items
  paragraph_text text,               -- for single paragraph/heading override
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_slug, node_index)
);

ALTER TABLE public.chapter_item_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own overrides" ON public.chapter_item_overrides
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own overrides" ON public.chapter_item_overrides
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own overrides" ON public.chapter_item_overrides
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own overrides" ON public.chapter_item_overrides
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER chapter_item_overrides_set_updated_at
  BEFORE UPDATE ON public.chapter_item_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Inserted nodes (for content the parser missed)
CREATE TABLE IF NOT EXISTS public.chapter_node_inserts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter_slug text NOT NULL,
  -- Insert AFTER this original node index. Use -1 to insert at the start.
  after_node_index integer NOT NULL,
  -- Position within the inserts at the same after_node_index (for ordering)
  position integer NOT NULL DEFAULT 0,
  node_type text NOT NULL,           -- 'item' | 'heading' | 'paragraph'
  item_number integer,
  heading_text text,
  paragraphs text[],
  paragraph_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chapter_node_inserts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own inserts" ON public.chapter_node_inserts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own inserts" ON public.chapter_node_inserts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own inserts" ON public.chapter_node_inserts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own inserts" ON public.chapter_node_inserts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER chapter_node_inserts_set_updated_at
  BEFORE UPDATE ON public.chapter_node_inserts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Removed nodes
CREATE TABLE IF NOT EXISTS public.chapter_node_removals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter_slug text NOT NULL,
  node_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_slug, node_index)
);

ALTER TABLE public.chapter_node_removals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own removals" ON public.chapter_node_removals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own removals" ON public.chapter_node_removals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own removals" ON public.chapter_node_removals
  FOR DELETE USING (auth.uid() = user_id);

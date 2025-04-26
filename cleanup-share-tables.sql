-- Drop tables related to the old sharing system
DROP TABLE IF EXISTS public.share_links CASCADE;
DROP TABLE IF EXISTS public.share_link_meals CASCADE;
DROP TABLE IF EXISTS public.share_tokens CASCADE;

-- Drop any functions related to the old sharing system
DROP FUNCTION IF EXISTS public.handle_new_share_link() CASCADE;
DROP FUNCTION IF EXISTS public.handle_share_link_access() CASCADE;

-- Drop any triggers related to the old sharing system
DROP TRIGGER IF EXISTS on_new_share_link ON public.share_links CASCADE;
DROP TRIGGER IF EXISTS on_share_link_access ON public.share_links CASCADE;

-- CF Access is the perimeter — allow anon reads/writes on uat_tests
-- so the intranet client (anon key, no Supabase session) can access data.
-- Supabase auth wiring is tracked separately.
DROP POLICY IF EXISTS "staff read uat"  ON public.uat_tests;
DROP POLICY IF EXISTS "staff write uat" ON public.uat_tests;
CREATE POLICY "anon read uat"  ON public.uat_tests FOR SELECT USING (true);
CREATE POLICY "anon write uat" ON public.uat_tests FOR ALL    USING (true);

-- Same for uat_attachments
DROP POLICY IF EXISTS "staff read uat attachments"   ON public.uat_attachments;
DROP POLICY IF EXISTS "staff write uat attachments"  ON public.uat_attachments;
CREATE POLICY "anon read uat attachments"  ON public.uat_attachments FOR SELECT USING (true);
CREATE POLICY "anon write uat attachments" ON public.uat_attachments FOR ALL    USING (true);

-- Migration: 0003_uat_attachments
-- UAT image attachments bucket + table, linked to uat_tests and Linear issues

-- ── Storage bucket ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uat-attachments',
  'uat-attachments',
  false,
  10485760,  -- 10 MB per file
  ARRAY['image/jpeg','image/png','image/gif','image/webp','image/heic','video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anon key (Cloudflare Access handles auth at the perimeter)
CREATE POLICY "staff upload uat attachments"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'uat-attachments');

CREATE POLICY "staff read uat attachments"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'uat-attachments');

CREATE POLICY "staff delete uat attachments"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'uat-attachments');

-- ── Attachments table ─────────────────────────────────────────────────────
CREATE TABLE public.uat_attachments (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  uat_test_id          uuid        NOT NULL REFERENCES public.uat_tests(id) ON DELETE CASCADE,
  linear_issue_id      text,       -- Linear identifier e.g. REL-142 (nullable)
  storage_path         text        NOT NULL,  -- path in uat-attachments bucket
  file_name            text        NOT NULL,
  file_size            bigint,
  mime_type            text,
  caption              text,
  uploaded_by          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX uat_attachments_test_idx   ON public.uat_attachments(uat_test_id);
CREATE INDEX uat_attachments_linear_idx ON public.uat_attachments(linear_issue_id);

ALTER TABLE public.uat_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read uat_attachments"  ON public.uat_attachments FOR SELECT USING (true);
CREATE POLICY "staff write uat_attachments" ON public.uat_attachments FOR ALL    USING (true);

CREATE TRIGGER audit_uat_attachments
  AFTER INSERT OR UPDATE OR DELETE ON public.uat_attachments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

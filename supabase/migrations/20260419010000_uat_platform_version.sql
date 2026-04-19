-- Migration: 0004_uat_platform_version
ALTER TABLE public.uat_tests
  ADD COLUMN IF NOT EXISTS platform text CHECK (platform IN ('ios','android','web','all')) DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS version  text;

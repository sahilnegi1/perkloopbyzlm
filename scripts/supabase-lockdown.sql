-- Perk Loop — Supabase security baseline (from Backend Setup Playbook, Step 4)
-- Run once in Supabase SQL Editor (or via DIRECT_URL) AFTER `prisma db push`.
-- Our app connects as role `postgres` (Prisma) — unaffected by these revokes.
-- Goal: even though we never use the Data API in browsers, ensure no anon/
-- authenticated role can touch our tables if the Data API is ever exposed.

-- 1. Private schema for helper functions
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- 2. Revoke all default privileges from the public and anon roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public, anon;

-- 3. Ensure future tables inherit this lockdown
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM public, anon;

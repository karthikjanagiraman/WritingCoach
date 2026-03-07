-- Migration: Add ESL support columns to ChildProfile
-- Required for: Placement-aware coaching, ESL-adaptive prompts
-- Safe to run multiple times (uses IF NOT EXISTS)

ALTER TABLE "ChildProfile" ADD COLUMN IF NOT EXISTS "isEsl" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChildProfile" ADD COLUMN IF NOT EXISTS "homeLanguage" TEXT;

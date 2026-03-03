-- Add is_custom flag to subjects table for AI-created subjects
ALTER TABLE subjects ADD COLUMN is_custom boolean NOT NULL DEFAULT false;

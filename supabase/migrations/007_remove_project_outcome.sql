-- Remove 'project' from climb_logs outcome options
-- Migrate existing project entries to attempt
UPDATE climb_logs SET outcome = 'attempt' WHERE outcome = 'project';

-- Drop and recreate the check constraint
ALTER TABLE climb_logs DROP CONSTRAINT IF EXISTS climb_logs_outcome_check;
ALTER TABLE climb_logs ADD CONSTRAINT climb_logs_outcome_check
  CHECK (outcome IN ('flash', 'send', 'attempt'));

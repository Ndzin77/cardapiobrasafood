ALTER TABLE stores ADD COLUMN ordering_mode text NOT NULL DEFAULT 'hours_only';
ALTER TABLE stores ADD COLUMN ordering_hours jsonb DEFAULT '[]';
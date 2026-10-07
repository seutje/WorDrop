ALTER TABLE app_settings ADD COLUMN classifier TEXT NOT NULL DEFAULT 'fashionclip'
    CHECK (classifier IN ('fashionclip', 'imajev'));

ALTER TABLE clothing_items ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0
    CHECK (favorite IN (0, 1));

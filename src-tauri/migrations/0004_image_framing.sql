ALTER TABLE clothing_items ADD COLUMN display_image_path TEXT;
ALTER TABLE clothing_items ADD COLUMN crop_zoom REAL NOT NULL DEFAULT 1.0;
ALTER TABLE clothing_items ADD COLUMN crop_x REAL NOT NULL DEFAULT 0.0;
ALTER TABLE clothing_items ADD COLUMN crop_y REAL NOT NULL DEFAULT 0.0;

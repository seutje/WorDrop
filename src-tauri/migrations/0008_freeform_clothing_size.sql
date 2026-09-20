CREATE TABLE clothing_items_new (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    category TEXT NOT NULL,
    subtype TEXT,
    size TEXT,
    material TEXT,
    pattern TEXT,
    ownership TEXT NOT NULL CHECK (ownership IN ('owned', 'wishlist')),
    favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
    image_path TEXT NOT NULL CHECK (length(trim(image_path)) > 0),
    display_image_path TEXT,
    crop_zoom REAL NOT NULL DEFAULT 1.0,
    crop_x REAL NOT NULL DEFAULT 0.0,
    crop_y REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO clothing_items_new (
    id, name, category, subtype, size, material, pattern, ownership, favorite,
    image_path, display_image_path, crop_zoom, crop_x, crop_y, notes, created_at, updated_at
)
SELECT
    id, name, category, subtype, size, material, pattern, ownership, favorite,
    image_path, display_image_path, crop_zoom, crop_x, crop_y, notes, created_at, updated_at
FROM clothing_items;

DROP TABLE clothing_items;
ALTER TABLE clothing_items_new RENAME TO clothing_items;
CREATE INDEX clothing_items_updated_at_idx ON clothing_items(updated_at DESC);

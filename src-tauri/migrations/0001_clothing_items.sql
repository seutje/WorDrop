CREATE TABLE clothing_items (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    category TEXT NOT NULL,
    subtype TEXT,
    material TEXT,
    pattern TEXT,
    ownership TEXT NOT NULL CHECK (ownership IN ('owned', 'wishlist')),
    image_path TEXT NOT NULL CHECK (length(trim(image_path)) > 0),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE clothing_item_colors (
    clothing_item_id TEXT NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (clothing_item_id, value)
);

CREATE TABLE clothing_item_seasons (
    clothing_item_id TEXT NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (clothing_item_id, value)
);

CREATE TABLE clothing_item_occasions (
    clothing_item_id TEXT NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (clothing_item_id, value)
);

CREATE TABLE clothing_item_style_tags (
    clothing_item_id TEXT NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (clothing_item_id, value)
);

CREATE INDEX clothing_items_updated_at_idx ON clothing_items(updated_at DESC);

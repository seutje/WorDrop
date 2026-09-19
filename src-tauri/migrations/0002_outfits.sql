CREATE TABLE outfits (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE outfit_items (
    outfit_id TEXT NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    clothing_item_id TEXT NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    PRIMARY KEY (outfit_id, clothing_item_id),
    UNIQUE (outfit_id, position)
);

CREATE INDEX outfit_items_clothing_item_idx ON outfit_items(clothing_item_id);

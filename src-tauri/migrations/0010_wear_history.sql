CREATE TABLE wear_events (
    id TEXT PRIMARY KEY NOT NULL,
    worn_on TEXT NOT NULL,
    outfit_id TEXT REFERENCES outfits(id) ON DELETE SET NULL,
    source_name TEXT NOT NULL,
    is_outfit INTEGER NOT NULL CHECK(is_outfit IN (0, 1)),
    created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX wear_outfit_day ON wear_events(outfit_id, worn_on) WHERE outfit_id IS NOT NULL;
CREATE TABLE wear_event_items (
    event_id TEXT NOT NULL REFERENCES wear_events(id) ON DELETE CASCADE,
    clothing_item_id TEXT NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
    PRIMARY KEY(event_id, clothing_item_id)
);
CREATE INDEX wear_item_history ON wear_event_items(clothing_item_id);
CREATE INDEX wear_date ON wear_events(worn_on);

CREATE TABLE app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    allow_multiple_bottoms INTEGER NOT NULL DEFAULT 0 CHECK (allow_multiple_bottoms IN (0, 1))
);

INSERT INTO app_settings (id, allow_multiple_bottoms) VALUES (1, 0);

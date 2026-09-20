ALTER TABLE clothing_items ADD COLUMN size TEXT
    CHECK (size IS NULL OR size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'));

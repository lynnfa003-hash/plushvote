-- Migration: Support multiple images for plush toys
-- Create table to store multiple images per toy

create table plush_toy_images (
  id uuid default gen_random_uuid() primary key,
  toy_id uuid references plush_toys(id) on delete cascade,
  image_url text not null,
  display_order integer default 0,
  created_at timestamptz default now()
);

-- Add index for faster queries
CREATE INDEX idx_plush_toy_images_toy_id ON plush_toy_images(toy_id);

-- Add RLS policies
ALTER TABLE plush_toy_images ENABLE ROW LEVEL SECURITY;

-- Everyone can view approved toy images
CREATE POLICY "Everyone can view images of approved toys"
  ON plush_toy_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plush_toys
      WHERE plush_toys.id = plush_toy_images.toy_id
      AND plush_toys.is_approved = true
    )
  );

-- Only authenticated users can insert images for their submissions
CREATE POLICY "Authenticated users can insert images"
  ON plush_toy_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plush_toys
      WHERE plush_toys.id = plush_toy_images.toy_id
    )
  );

-- Comments
COMMENT ON TABLE plush_toy_images IS 'Stores multiple images for each plush toy';
COMMENT ON COLUMN plush_toy_images.display_order IS 'Order for displaying images (0 = first/main)';

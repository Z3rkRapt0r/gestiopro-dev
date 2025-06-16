
-- Create company-logos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
);

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload logos" ON storage.objects
  FOR INSERT 
  TO authenticated
  WITH CHECK (bucket_id = 'company-logos');

-- Create policy to allow public read access to logos
CREATE POLICY "Allow public read access to logos" ON storage.objects
  FOR SELECT 
  TO public
  USING (bucket_id = 'company-logos');

-- Create policy to allow users to update their own logos
CREATE POLICY "Allow users to update their own logos" ON storage.objects
  FOR UPDATE 
  TO authenticated
  USING (bucket_id = 'company-logos');

-- Create policy to allow users to delete their own logos
CREATE POLICY "Allow users to delete their own logos" ON storage.objects
  FOR DELETE 
  TO authenticated
  USING (bucket_id = 'company-logos');

-- Allow public (anon) users to create signed URLs for media that belongs to public albums.
-- This lets unauthenticated visitors view photos/videos on the /explore and /view routes.

CREATE POLICY "Public album media files readable by anyone"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media'
    AND EXISTS (
      SELECT 1
      FROM public.media m
      JOIN public.locations l ON l.id = m.location_id
      JOIN public.albums a ON a.id = l.album_id
      WHERE m.storage_path = storage.objects.name
        AND a.visibility = 'public'
    )
  );

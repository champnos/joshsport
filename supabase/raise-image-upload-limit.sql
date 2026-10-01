-- Allow images up to 20MB in the storage bucket used for hero, about and treatment photos.
-- Admin uploads go directly from the browser to Supabase Storage (signed upload URLs),
-- so this bucket limit (and the project-wide Storage "Upload file size limit" setting,
-- which must also be at least 20MB) is what governs the maximum upload size.
update storage.buckets
set file_size_limit = 20971520
where id = 'treatment-images';

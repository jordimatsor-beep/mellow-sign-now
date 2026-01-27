SELECT id, title, signed_file_url, certificate_url, created_at
FROM documents
ORDER BY created_at DESC
LIMIT 1;

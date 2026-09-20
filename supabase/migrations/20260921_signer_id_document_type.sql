-- Signer identity document type (international signers)
--
-- Until now the signer identifier was assumed to be a Spanish NIF/NIE/CIF and
-- the "new document" form blocked anything that failed the MOD-23 checksum, so
-- contracts for signers in Argentina, Colombia, Mexico… could not be created
-- without inventing a fake NIF.
--
-- These columns store WHICH document the number belongs to (CUIT, Cédula,
-- Pasaporte…). NULL means "Spanish NIF/NIE/CIF", which is exactly how every
-- existing row behaved, so no backfill is needed and old rows keep working.
--
-- Safe to run more than once. Adding a nullable column takes no table rewrite
-- and no long lock.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS signer_tax_id_type TEXT;

COMMENT ON COLUMN public.documents.signer_tax_id_type IS
  'Identity document type of the signer (ES_NIF, AR_CUIT, MX_RFC, CO_CC, PASSPORT…). NULL = Spanish NIF/NIE/CIF.';

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS nif_type TEXT;

COMMENT ON COLUMN public.contacts.nif_type IS
  'Identity document type of the contact. NULL = Spanish NIF/NIE/CIF.';

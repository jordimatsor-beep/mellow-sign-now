/**
 * Writes that tolerate a column the database may not have yet.
 *
 * FirmaClara's migration history is applied by hand through the SQL editor, so
 * a deploy can reach production before its migration does. Without this, the
 * first document sent in that window would fail with "Could not find the
 * 'signer_tax_id_type' column" and the user would just see an error.
 *
 * The write is attempted with the new columns; if — and only if — Postgres
 * says the column does not exist, it is retried without them. The document is
 * still created, only without the new data.
 */

/** PostgREST schema-cache miss (PGRST204) or Postgres undefined_column (42703). */
export const isUnknownColumnError = (error: unknown, columns: string[]): boolean => {
  if (!error || typeof error !== "object") return false;

  const { code, message } = error as { code?: string; message?: string };
  if (code !== "PGRST204" && code !== "42703") return false;

  // Only swallow the error when it is about one of OUR optional columns —
  // never mask an unrelated schema problem.
  return columns.some((c) => (message || "").includes(c));
};

interface WriteResult<T> {
  data: T | null;
  error: unknown;
}

/**
 * Runs `write` with the optional columns included, retrying without them if
 * the database does not know them yet.
 *
 * @param payload      Full payload, including the optional columns.
 * @param optional     Keys that may not exist in the database yet.
 * @param write        Performs the insert/update with the payload it receives.
 * @param onDegraded   Called when the retry path was used (for logging).
 */
export async function writeWithOptionalColumns<T>(
  payload: Record<string, unknown>,
  optional: string[],
  write: (payload: Record<string, unknown>) => Promise<WriteResult<T>>,
  onDegraded?: () => void
): Promise<WriteResult<T>> {
  const first = await write(payload);
  if (!isUnknownColumnError(first.error, optional)) return first;

  const reduced = { ...payload };
  for (const key of optional) delete reduced[key];

  onDegraded?.();
  return write(reduced);
}

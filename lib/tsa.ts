/**
 * @deprecated DO NOT USE THIS FILE.
 *
 * TSA (RFC 3161) timestamping is handled exclusively by the `request-tsa` Supabase Edge Function,
 * which uses asn1js + pkijs for real DER encoding and submits to FreeTSA.
 *
 * Calling this function would silently produce fake timestamps, invalidating signatures legally.
 * All TSA requests must go through: supabase.functions.invoke('request-tsa', { body: { hash } })
 */
export async function requestTSA(_hash: string): Promise<never> {
    throw new Error(
        '[FirmaClara] requestTSA() is deprecated. ' +
        'Use the request-tsa Edge Function instead: ' +
        'supabase.functions.invoke("request-tsa", { body: { hash } })'
    );
}

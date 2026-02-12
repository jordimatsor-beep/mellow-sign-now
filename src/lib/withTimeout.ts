/**
 * Race a promise (or thenable) against a timeout. If the work doesn't
 * resolve within the given milliseconds, the returned promise rejects.
 *
 * Works with Supabase's PostgrestBuilder which is a PromiseLike, not a
 * strict Promise.
 *
 * @param work   – the async work to perform (Promise or PromiseLike)
 * @param ms     – max milliseconds to wait (default 3 000)
 * @param label  – human-readable label for the timeout error message
 */
export function withTimeout<T>(
    work: PromiseLike<T>,
    ms = 3000,
    label = "Operation"
): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)
    );
    return Promise.race([Promise.resolve(work), timeout]);
}

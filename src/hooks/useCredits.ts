import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/context/AuthContext";

/**
 * Shared hook for fetching user credits via React Query.
 * All components that need credit balance should use this hook
 * to avoid redundant network requests and ensure cache consistency.
 */
export function useCredits() {
    const { user } = useAuth();

    const { data: credits = 0, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.credits.available,
        queryFn: async () => {
            return withTimeout(
                (async () => {
                    const { data, error } = await supabase.rpc('get_available_credits');
                    if (error) {
                        if (import.meta.env.DEV) console.error("Error fetching credits:", error);
                        return 0;
                    }
                    return (data as number) ?? 0;
                })(),
                3000, "Credits fetch"
            );
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    return { credits, isLoading, error, refetch };
}

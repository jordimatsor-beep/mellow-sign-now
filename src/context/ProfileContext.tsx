import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export type IssuerType = 'company' | 'person';

export interface IssuerProfile {
    type: IssuerType;
    name: string;
    id: string;   // CIF / NIF
    address: string;
    city: string;
    zip: string;
    country: string;
    phone: string;
    email: string;
}

interface ProfileContextType {
    profile: IssuerProfile | null;
    updateProfile: (data: Partial<IssuerProfile>) => Promise<void>;
    isProfileComplete: boolean;
    clearProfile: () => void;
    isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Derive IssuerProfile from AuthContext — zero extra DB queries.
    const { user, profile: authProfile, loading: authLoading, refreshProfile } = useAuth();

    const profile: IssuerProfile | null = useMemo(() => {
        if (!authProfile) return null;
        return {
            type: (authProfile.issuer_type as IssuerType) || 'company',
            name: authProfile.name || authProfile.company_name || user?.user_metadata?.full_name || '',
            id: authProfile.tax_id || '',
            address: authProfile.address || '',
            city: authProfile.city || '',
            zip: authProfile.zip_code || '',
            country: authProfile.country || 'España',
            phone: authProfile.phone || '',
            email: authProfile.email || user?.email || '',
        };
    }, [authProfile, user?.email, user?.user_metadata?.full_name]);

    // Loading while auth is resolving the user but profile not yet loaded.
    const isLoading = authLoading || (!!user && !authProfile);

    const updateProfile = async (data: Partial<IssuerProfile>) => {
        if (!user) return;

        const rawUpdates: Record<string, unknown> = {
            issuer_type: data.type,
            name: data.name,
            company_name: data.type === 'company' ? data.name : null,
            tax_id: data.id,
            address: data.address,
            city: data.city,
            zip_code: data.zip,
            country: data.country,
            phone: data.phone,
            email: data.email,
            updated_at: new Date().toISOString(),
        };

        const updates = Object.fromEntries(
            Object.entries(rawUpdates).filter(([, v]) => v !== undefined)
        );

        try {
            const { error } = await withTimeout(
                supabase.from('users').update(updates).eq('id', user.id),
                3000, "Profile save"
            );
            if (error) throw error;
            // Sync AuthContext cache with the updated values.
            await refreshProfile();
        } catch {
            toast.error("Error al guardar en la nube");
        }
    };

    // No-op: profile clears automatically when the user signs out via AuthContext.
    const clearProfile = () => { };

    const isProfileComplete = useMemo(() => {
        if (!profile) return false;
        return Boolean(
            profile.name?.trim() &&
            profile.id?.trim() &&
            profile.address?.trim() &&
            profile.city?.trim() &&
            profile.zip?.trim() &&
            profile.phone?.trim() &&
            profile.email?.trim()
        );
    }, [profile]);

    return (
        <ProfileContext.Provider value={{ profile, updateProfile, isProfileComplete, clearProfile, isLoading }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};

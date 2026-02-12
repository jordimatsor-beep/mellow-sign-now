import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export type IssuerType = 'company' | 'person';

export interface IssuerProfile {
    type: IssuerType;
    name: string; // Razón Social / Nombre
    id: string;   // CIF / NIF (Fetched from tax_id)
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
    const { user } = useAuth();
    const [profile, setProfile] = useState<IssuerProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch profile from Supabase on mount/auth change
    useEffect(() => {
        if (!user) {
            setProfile(null);
            return;
        }

        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase.from('users')
                    .select('tax_id, address, city, zip_code, country, issuer_type, name, email, phone, company_name')
                    .eq('id', user.id)
                    .single();
                /*
                // Removed withTimeout
                await withTimeout(
                supabase.from('users')
                    ...
                3000, "Profile fetch"
            ); */

                if (error) {
                    if (import.meta.env.DEV) console.error("Error fetching profile:", error);
                    return;
                }

                if (data) {
                    // Map DB columns to IssuerProfile interface
                    // Fallback chain: DB name → DB company_name → Auth user_metadata.full_name
                    const resolvedName = data.name || data.company_name || user.user_metadata?.full_name || "";
                    setProfile({
                        type: (data.issuer_type as IssuerType) || 'company',
                        name: resolvedName,
                        id: data.tax_id || "",
                        address: data.address || "",
                        city: data.city || "",
                        zip: data.zip_code || "",
                        country: data.country || "España",
                        phone: data.phone || "",
                        email: data.email || user.email || "",
                    });
                }
            } catch (err) {
                if (import.meta.env.DEV) console.error("Unexpected error fetching profile:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const updateProfile = async (data: Partial<IssuerProfile>) => {
        if (!user) return;

        // Optimistic UI update
        setProfile(prev => {
            if (!prev) return data as IssuerProfile;
            return { ...prev, ...data };
        });

        // Build update payload — only include defined values (undefined causes Supabase issues)
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

        // Filter out undefined keys to avoid sending them to Supabase
        const updates = Object.fromEntries(
            Object.entries(rawUpdates).filter(([, v]) => v !== undefined)
        );

        try {
            const { error } = await withTimeout(
                supabase.from('users').update(updates).eq('id', user.id),
                3000, "Profile save"
            );

            if (error) throw error;
        } catch (error) {
            if (import.meta.env.DEV) console.error("Error updating profile:", error);
            toast.error("Error al guardar en la nube");
        }
    };

    const clearProfile = () => {
        setProfile(null);
    };

    const isProfileComplete = React.useMemo(() => {
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

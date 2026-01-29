import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/lib/supabase";
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
                const { data, error } = await supabase
                    .from('users')
                    .select('tax_id, address, city, zip_code, country, issuer_type, name, email, phone, company_name')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    if (import.meta.env.DEV) console.error("Error fetching profile:", error);
                    return;
                }

                if (data) {
                    // Map DB columns to IssuerProfile interface
                    setProfile({
                        type: (data.issuer_type as IssuerType) || 'company',
                        name: data.name || data.company_name || "",
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

        const updates = {
            issuer_type: data.type,
            name: data.name,
            company_name: data.type === 'company' ? data.name : undefined, // Keep company_name in sync if it's a company
            tax_id: data.id,
            address: data.address,
            city: data.city,
            zip_code: data.zip,
            country: data.country,
            phone: data.phone,
            email: data.email,
            updated_at: new Date().toISOString(),
        };

        try {
            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;
            // toast.success("Perfil guardado en la nube"); // Handled by the form usually
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

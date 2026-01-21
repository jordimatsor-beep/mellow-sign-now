import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type IssuerType = 'company' | 'person';

export interface IssuerProfile {
    type: IssuerType;
    name: string; // Razón Social / Nombre
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
    updateProfile: (data: Partial<IssuerProfile>) => void;
    isProfileComplete: boolean;
    clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY = 'firmaclara_issuer_profile';

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<IssuerProfile | null>(null);

    useEffect(() => {
        const storedProfile = localStorage.getItem(STORAGE_KEY);
        if (storedProfile) {
            try {
                setProfile(JSON.parse(storedProfile));
            } catch (e) {
                console.error("Failed to parse profile from local storage", e);
            }
        }
    }, []);

    const updateProfile = (data: Partial<IssuerProfile>) => {
        setProfile(prev => {
            const newProfile = prev ? { ...prev, ...data } : {
                type: 'company',
                name: '',
                id: '',
                address: '',
                city: '',
                zip: '',
                country: 'España',
                phone: '',
                email: '',
                ...data
            } as IssuerProfile;

            localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
            return newProfile;
        });
    };

    const clearProfile = () => {
        setProfile(null);
        localStorage.removeItem(STORAGE_KEY);
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
        <ProfileContext.Provider value={{ profile, updateProfile, isProfileComplete, clearProfile }}>
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

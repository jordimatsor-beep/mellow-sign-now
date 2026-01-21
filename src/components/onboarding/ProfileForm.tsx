import { useState, useEffect } from "react";
import { useProfile, IssuerProfile, IssuerType } from "@/context/ProfileContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isValidTaxId, isValidEmail, isValidPhone } from "@/lib/validators";
import { toast } from "sonner";
import { Building2, User } from "lucide-react";

interface ProfileFormProps {
    onComplete?: () => void;
    className?: string;
}

export function ProfileForm({ onComplete, className }: ProfileFormProps) {
    const { profile, updateProfile } = useProfile();

    const [formData, setFormData] = useState<IssuerProfile>({
        type: "company",
        name: "",
        id: "",
        address: "",
        city: "",
        zip: "",
        country: "España",
        phone: "",
        email: "",
    });

    const [errors, setErrors] = useState<Partial<Record<keyof IssuerProfile, string>>>({});

    // Load existing profile if any
    useEffect(() => {
        if (profile) {
            setFormData(profile);
        }
    }, [profile]);

    const handleChange = (field: keyof IssuerProfile, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validate = (): boolean => {
        const newErrors: typeof errors = {};

        if (!formData.name.trim()) newErrors.name = "El nombre es obligatorio";

        if (!formData.id.trim()) {
            newErrors.id = "El CIF/NIF es obligatorio";
        } else if (!isValidTaxId(formData.id)) {
            newErrors.id = "Formato de CIF/NIF inválido";
        }

        if (!formData.address.trim()) newErrors.address = "La dirección es obligatoria";
        if (!formData.city.trim()) newErrors.city = "La ciudad es obligatoria";
        if (!formData.zip.trim()) newErrors.zip = "El código postal es obligatorio";

        if (!formData.email.trim()) {
            newErrors.email = "El email es obligatorio";
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = "Email inválido";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "El teléfono es obligatorio";
        } else if (!isValidPhone(formData.phone)) {
            newErrors.phone = "Teléfono inválido";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            updateProfile(formData);
            toast.success("Perfil guardado correctamente");
            if (onComplete) onComplete();
        } else {
            toast.error("Por favor revisa los errores en el formulario");
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
            <div className="space-y-4">
                <Label className="text-base">¿Quién emite los documentos?</Label>
                <RadioGroup
                    value={formData.type}
                    onValueChange={(val) => handleChange("type", val as IssuerType)}
                    className="grid grid-cols-2 gap-4"
                >
                    <div>
                        <RadioGroupItem value="company" id="type-company" className="peer sr-only" />
                        <Label
                            htmlFor="type-company"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                            <Building2 className="mb-3 h-6 w-6" />
                            Empresa
                        </Label>
                    </div>
                    <div>
                        <RadioGroupItem value="person" id="type-person" className="peer sr-only" />
                        <Label
                            htmlFor="type-person"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                            <User className="mb-3 h-6 w-6" />
                            Autónomo
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">{formData.type === 'company' ? 'Razón Social' : 'Nombre Completo'} *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={e => handleChange("name", e.target.value)}
                        className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="id">{formData.type === 'company' ? 'CIF' : 'NIF/DNI'} *</Label>
                    <Input
                        id="id"
                        value={formData.id}
                        onChange={e => handleChange("id", e.target.value)}
                        placeholder={formData.type === 'company' ? 'B12345678' : '12345678Z'}
                        className={errors.id ? "border-destructive" : ""}
                    />
                    {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                        id="phone"
                        value={formData.phone}
                        onChange={e => handleChange("phone", e.target.value)}
                        placeholder="+34 600 000 000"
                        className={errors.phone ? "border-destructive" : ""}
                    />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email de contacto *</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={e => handleChange("email", e.target.value)}
                        className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Dirección Fiscal *</Label>
                    <Input
                        id="address"
                        value={formData.address}
                        onChange={e => handleChange("address", e.target.value)}
                        placeholder="Calle, número, piso..."
                        className={errors.address ? "border-destructive" : ""}
                    />
                    {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input
                        id="city"
                        value={formData.city}
                        onChange={e => handleChange("city", e.target.value)}
                        className={errors.city ? "border-destructive" : ""}
                    />
                    {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="zip">Código Postal *</Label>
                    <Input
                        id="zip"
                        value={formData.zip}
                        onChange={e => handleChange("zip", e.target.value)}
                        className={errors.zip ? "border-destructive" : ""}
                    />
                    {errors.zip && <p className="text-xs text-destructive">{errors.zip}</p>}
                </div>
            </div>

            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                <p>ℹ️ Estos datos aparecerán automáticamente en el encabezado de los contratos que generes.</p>
            </div>

            <Button type="submit" className="w-full">
                Guardar perfil de emisor
            </Button>
        </form>
    );
}

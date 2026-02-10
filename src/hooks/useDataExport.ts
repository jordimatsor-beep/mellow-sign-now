import { useState } from 'react';
import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useDataExport() {
    const [isExporting, setIsExporting] = useState(false);

    const exportData = async () => {
        setIsExporting(true);
        const toastId = toast.loading('Preparando tus datos...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No usuario autenticado');

            const zip = new JSZip();

            // 1. Perfil
            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                zip.file('perfil.json', JSON.stringify(profile, null, 2));
            }

            // 2. Contactos
            const { data: contacts } = await supabase
                .from('contacts')
                .select('*')
                .eq('user_id', user.id);

            if (contacts) {
                zip.file('contactos.json', JSON.stringify(contacts, null, 2));
            }

            // 3. Documentos (Metadata)
            const { data: documents } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', user.id);

            if (documents) {
                zip.file('documentos.json', JSON.stringify(documents, null, 2));
            }

            // 4. Generate ZIP
            const content = await zip.generateAsync({ type: 'blob' });

            // 5. Trigger download
            const url = window.URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `firmaclara-data-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.dismiss(toastId);
            toast.success('Datos exportados correctamente');

        } catch (error) {
            console.error('Export error:', error);
            toast.dismiss(toastId);
            toast.error('Error al exportar los datos');
        } finally {
            setIsExporting(false);
        }
    };

    return { exportData, isExporting };
}

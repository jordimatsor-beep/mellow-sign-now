import { useState } from 'react';
import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/withTimeout';
import { toast } from 'sonner';

export function useDataExport() {
    const [isExporting, setIsExporting] = useState(false);

    const exportData = async () => {
        setIsExporting(true);
        const toastId = toast.loading('Preparando tus datos...');

        try {
            const { data: { user } } = await withTimeout(
                supabase.auth.getUser(),
                3000, "Auth user"
            );
            if (!user) throw new Error('No usuario autenticado');

            const zip = new JSZip();

            // 1. Perfil
            const { data: profile } = await withTimeout(
                supabase.from('users').select('*').eq('id', user.id).single(),
                3000, "Profile export"
            );

            if (profile) {
                zip.file('perfil.json', JSON.stringify(profile, null, 2));
            }

            // 2. Contactos
            const { data: contacts } = await withTimeout(
                supabase.from('contacts').select('*').eq('user_id', user.id),
                3000, "Contacts export"
            );

            if (contacts) {
                zip.file('contactos.json', JSON.stringify(contacts, null, 2));
            }

            // 3. Documentos (Metadata)
            const { data: documents } = await withTimeout(
                supabase.from('documents').select('*').eq('user_id', user.id),
                3000, "Documents export"
            );

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

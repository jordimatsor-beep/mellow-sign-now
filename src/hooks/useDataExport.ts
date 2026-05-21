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

            // 4. Firmas (evidencias — GDPR Art. 20)
            if (documents && documents.length > 0) {
                const docIds = documents.map((d: any) => d.id);
                const { data: signatures } = await withTimeout(
                    supabase.from('signatures').select('*').in('document_id', docIds),
                    5000, "Signatures export"
                );
                if (signatures) {
                    zip.file('firmas.json', JSON.stringify(signatures, null, 2));
                }
            }

            // 5. Historial de pagos (GDPR Art. 20)
            const { data: purchases } = await withTimeout(
                supabase.from('user_credit_purchases').select('*').eq('user_id', user.id),
                3000, "Purchases export"
            );
            if (purchases) {
                zip.file('pagos.json', JSON.stringify(purchases, null, 2));
            }

            // 6. Logs de eventos (GDPR Art. 20)
            const { data: eventLogs } = await withTimeout(
                supabase.from('event_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
                5000, "Event logs export"
            );
            if (eventLogs) {
                zip.file('historial_actividad.json', JSON.stringify(eventLogs, null, 2));
            }

            // 7. Generate ZIP
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

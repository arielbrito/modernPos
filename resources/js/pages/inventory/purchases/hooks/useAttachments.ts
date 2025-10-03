import PurchaseController from '@/actions/App/Http/Controllers/Inventory/PurchaseController';
import { router } from '@inertiajs/react';
import * as React from 'react';
import { toast } from 'sonner';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (coincide con max:5120 KB backend)
const ALLOWED_MIMES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'text/csv',
    'application/xml',
    'text/xml',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
]);

function extractErrorMessage(errors: unknown): string {
    if (typeof errors === 'string') return errors;
    if (Array.isArray(errors)) return errors.join(' ');
    if (errors && typeof errors === 'object') {
        const parts = Object.values(errors as Record<string, unknown>).flatMap((v) => (Array.isArray(v) ? v : [v]));
        return parts
            .map((x) => String(x ?? ''))
            .filter(Boolean)
            .join(' ');
    }
    return 'Error desconocido al subir archivos.';
}

export function useAttachments(purchaseId: number) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [progress, setProgress] = React.useState<number | null>(null);

    const triggerUpload = React.useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const resetInput = () => {
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const validateFiles = (files: File[]): { ok: boolean; message?: string } => {
        if (!files.length) return { ok: false, message: 'Selecciona al menos un archivo.' };

        for (const f of files) {
            if (f.size > MAX_SIZE_BYTES) {
                return { ok: false, message: `“${f.name}” excede 5MB.` };
            }
            // Si el navegador no da mime fiable, dejamos pasar y confía el backend;
            // si lo da y no está permitido, avisamos.
            if (f.type && !ALLOWED_MIMES.has(f.type)) {
                return { ok: false, message: `“${f.name}” tiene un tipo no permitido.` };
            }
        }
        return { ok: true };
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const list = e.target.files;
        if (!list || list.length === 0) return;

        const files = Array.from(list);
        const { ok, message } = validateFiles(files);
        if (!ok) {
            toast.error(message || 'Archivos inválidos.');
            resetInput();
            return;
        }

        // Armamos FormData con el nombre de campo esperado por el backend: "files[]"
        const formData = new FormData();
        files.forEach((f) => formData.append('files[]', f));

        setIsUploading(true);
        setProgress(0);

        router.post(PurchaseController.uploadAttachment.url({ purchase: purchaseId }), formData, {
            forceFormData: true, // <- CLAVE para subir archivos con Inertia
            onStart: () => {
                setIsUploading(true);
                setProgress(0);
            },
            onProgress: (p) => {
                // p.percentage viene de Inertia (0..100)
                if (p?.percentage != null) setProgress(p.percentage);
            },
            onSuccess: () => {
                toast.success('Adjunto(s) subido(s) correctamente.');
            },
            onError: (errors) => {
                toast.error(extractErrorMessage(errors) || 'Error al subir archivos.');
            },
            onFinish: () => {
                setIsUploading(false);
                setProgress(null);
                resetInput();
            },
            preserveScroll: true,
            preserveState: true,
        });
    };

    const removeAttachment = (attachmentId: string) => {
        router.delete(
            PurchaseController.destroyAttachment.url({
                purchase: purchaseId,
                attachment: attachmentId,
            }),
            {
                onSuccess: () => toast.success('Adjunto eliminado.'),
                onError: (errors) => toast.error(extractErrorMessage(errors) || 'Error al eliminar el adjunto.'),
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    return {
        fileInputRef,
        isUploading,
        progress, // porcentaje 0-100 o null
        triggerUpload,
        handleFileChange,
        removeAttachment,
        inputAccept: '.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.xlsx,.xls,.csv,.xml,.doc,.docx,.txt',
        inputMultiple: true as const,
    };
}

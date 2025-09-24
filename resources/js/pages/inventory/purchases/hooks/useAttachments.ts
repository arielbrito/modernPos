import PurchaseController from '@/actions/App/Http/Controllers/Inventory/PurchaseController';
import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

export function useAttachments(purchaseId: number) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        router.post(
            PurchaseController.uploadAttachment.url({ purchase: purchaseId }),
            { files: Array.from(files) },
            {
                onStart: () => setIsUploading(true),
                onFinish: () => {
                    setIsUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                },
                onSuccess: () => toast.success('Adjunto(s) subido(s) exitosamente.'),
                onError: (errors) => toast.error(Object.values(errors).flat().join(' ') || 'Error al subir archivos.'),
                preserveScroll: true,
            },
        );
    };

    const removeAttachment = (attachmentId: string) => {
        router.delete(PurchaseController.destroyAttachment.url({ purchase: purchaseId, attachment: attachmentId }), {
            onSuccess: () => toast.success('Adjunto eliminado.'),
            onError: () => toast.error('Error al eliminar el adjunto.'),
            preserveScroll: true,
        });
    };

    return {
        fileInputRef,
        isUploading,
        triggerUpload: () => fileInputRef.current?.click(),
        handleFileChange,
        removeAttachment,
    };
}

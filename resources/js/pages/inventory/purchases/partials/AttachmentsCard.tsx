import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Paperclip, Upload, Trash2, Download } from "lucide-react";
import type { Attachment } from "@/types";

const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

interface Props {
    attachments: Attachment[];
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    isUploading: boolean;
    triggerUpload: () => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeAttachment: (attachmentId: string) => void;

    /** Opcional: construir URL segura para descargar (e.g. controller download) */
    getDownloadUrl?: (att: Attachment) => string;
}

export function AttachmentsCard({
    attachments,
    fileInputRef,
    isUploading,
    triggerUpload,
    handleFileChange,
    removeAttachment,
    getDownloadUrl,
}: Props) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-primary" />
                    Adjuntos <span className="text-muted-foreground">({attachments.length})</span>
                </CardTitle>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={triggerUpload}
                        disabled={isUploading}
                        aria-label="Subir archivos"
                    >
                        <Upload className="h-4 w-4" />
                        {isUploading ? "Subiendo..." : "Subir"}
                    </Button>

                    {/* input oculto para uploads */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.xlsx,.xls,.csv,.xml,.doc,.docx,.txt"
                    />
                </div>
            </CardHeader>

            <CardContent>
                {attachments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {attachments.map((att) => {
                            const href = getDownloadUrl ? getDownloadUrl(att) : att.path;
                            return (
                                <div
                                    key={att.id}
                                    className="flex items-center justify-between rounded-md border p-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-medium" title={att.name}>
                                            {att.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatFileSize(att.size)}
                                        </div>
                                    </div>

                                    <div className="ml-3 flex items-center gap-1">
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="icon"
                                            title="Descargar"
                                            aria-label={`Descargar ${att.name}`}
                                        >
                                            <a href={href} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4" />
                                            </a>
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Eliminar"
                                                    aria-label={`Eliminar ${att.name}`}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Eliminar adjunto</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        ¿Seguro? Esta acción no se puede deshacer.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => removeAttachment(att.id)}
                                                    >
                                                        Eliminar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        No hay archivos adjuntos.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// resources/js/pages/inventory/purchases/partials/show/EmailSection.tsx
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Mail, RefreshCw } from 'lucide-react'
import { EmailPurchaseModal } from './email-purchase-modal'
import type { Purchase } from '@/types'

export function EmailSection({ purchase }: { purchase: Purchase & { email_logs?: any[] } }) {
    const [open, setOpen] = React.useState(false)
    const last = purchase.email_logs?.[0] // asumiendo orden desc en servidor

    return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
                    <Mail className="h-4 w-4" /> Enviar por email
                </Button>
                {last && (
                    <Button variant="ghost" className="gap-2" onClick={() => setOpen(true)} title="Reenviar al último destinatario">
                        <RefreshCw className="h-4 w-4" /> Reenviar
                    </Button>
                )}
            </div>

            {purchase.email_logs && purchase.email_logs.length > 0 && (
                <div className="text-xs text-muted-foreground">
                    Último: <b>{last.to}</b> — {last.subject} — <span className={last.status === 'failed' ? 'text-red-600' : last.status === 'sent' ? 'text-green-600' : ''}>{last.status}</span>
                </div>
            )}

            <EmailPurchaseModal open={open} setOpen={setOpen} purchase={purchase} lastLog={last} />
        </div>
    )
}

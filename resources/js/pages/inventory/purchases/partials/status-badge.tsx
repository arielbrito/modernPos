import * as React from "react";

export function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        draft: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200",
        approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
        partially_received: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
        received: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
        cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
    };
    const cls = map[status] ?? map.draft;
    const label = (status || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls} border border-black/5`}>{label}</span>
    );
}
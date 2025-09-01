export const fmtDate = (s?: string | null) => (!s ? '—' : new Date(s).toLocaleDateString());

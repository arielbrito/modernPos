// resources/js/lib/withQuery.ts
export function withQuery(baseUrl: string, params: Record<string, string | undefined>) {
    const url = new URL(baseUrl, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== 'all') url.searchParams.set(k, v);
    });
    return url.toString();
}

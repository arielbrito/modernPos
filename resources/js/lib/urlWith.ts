type RouteLike = string | { url: () => string };

export function urlWith(route: RouteLike, paper?: string, copy?: boolean, download?: boolean) {
    const href = typeof route === 'string' ? route : route.url();
    const url = new URL(href, window.location.origin);

    if (paper && paper.trim()) url.searchParams.set('paper', paper);
    if (copy) url.searchParams.set('copy', '1');
    if (download) url.searchParams.set('download', '1');

    return url.toString();
}

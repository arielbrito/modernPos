import { useEffect, useRef } from 'react';

export function useIsInitialRender(): boolean {
    const isInitialRender = useRef(true);

    useEffect(() => {
        isInitialRender.current = false;
    }, []);

    return isInitialRender.current;
}

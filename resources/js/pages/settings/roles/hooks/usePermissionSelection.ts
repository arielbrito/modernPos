import { useCallback, useMemo, useRef } from 'react';

export function usePermissionSelection(initial: number[]) {
    const initialRef = useRef(new Set<number>(initial));
    const setRef = useRef(new Set<number>(initial));

    const values = useMemo(() => Array.from(setRef.current), []);
    // Nota: `values` inicial solo sirve para SSR; usa getters abajo.

    const getArray = useCallback(() => Array.from(setRef.current), []);
    const size = useCallback(() => setRef.current.size, []);

    const addMany = useCallback((list: number[]) => {
        const set = setRef.current;
        list.forEach((id) => set.add(id));
        return Array.from(set);
    }, []);

    const removeMany = useCallback((list: number[]) => {
        const set = setRef.current;
        list.forEach((id) => set.delete(id));
        return Array.from(set);
    }, []);

    const setOne = useCallback((id: number, nextChecked: boolean) => {
        const set = setRef.current;
        if (nextChecked) set.add(id);
        else set.delete(id);
        return Array.from(set);
    }, []);

    const reset = useCallback(() => {
        setRef.current = new Set(initialRef.current);
        return Array.from(setRef.current);
    }, []);

    const computeDiff = useCallback(() => {
        const cur = setRef.current;
        const ini = initialRef.current;
        const added: number[] = [];
        const removed: number[] = [];
        cur.forEach((id) => {
            if (!ini.has(id)) added.push(id);
        });
        ini.forEach((id) => {
            if (!cur.has(id)) removed.push(id);
        });
        return { added, removed };
    }, []);

    return {
        // getters
        get values() {
            return getArray();
        },
        get size() {
            return size();
        },

        // mutations
        addMany,
        removeMany,
        setOne,
        reset,

        // utils
        computeDiff,
        setRef,
        initialRef,
        getArray,
    };
}

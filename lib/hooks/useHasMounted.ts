import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};

/**
 * `false` pendant le SSR et l'hydratation, `true` ensuite côté client.
 *
 * Remplace le motif `useState(false)` + `useEffect(() => setMounted(true))`
 * (setState synchrone dans un effet → rendu en cascade) : React utilise
 * le snapshot serveur pendant l'hydratation, donc pas de mismatch.
 */
export function useHasMounted(): boolean {
    return useSyncExternalStore(
        subscribeNoop,
        () => true,
        () => false,
    );
}

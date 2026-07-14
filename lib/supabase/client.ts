import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour les Client Components (code qui tourne dans le
 * navigateur).
 *
 * `createBrowserClient` maintient un singleton interne : peu importe
 * le nombre d'appels à cette factory, une seule instance est créée
 * par onglet, avec un `fetch` configuré et l'écouteur onAuthStateChange
 * branché sur le storage.
 *
 * Les deux variables `NEXT_PUBLIC_*` sont inlinées au build par
 * Next.js — leur présence est donc garantie côté client.
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
}

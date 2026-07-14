import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase pour les Server Components, Server Actions et Route
 * Handlers.
 *
 * Le client doit être recréé à chaque requête serveur — il a besoin
 * des cookies de *cette* requête pour connaître la session. C'est
 * léger : côté serveur ce n'est qu'une configuration de `fetch`.
 *
 * `setAll` peut être appelé depuis un Server Component pur (typiquement
 * après un refresh de token). Dans ce contexte, `cookies()` de
 * Next.js interdit d'écrire — on catch l'erreur silencieusement car
 * le proxy (proxy.ts à la racine) se charge déjà d'écrire les cookies
 * refresh sur la réponse. Dans un Server Action ou un Route Handler
 * en revanche, l'écriture réussira normalement.
 *
 * Dans Next 16, `cookies()` renvoie une Promise → factory `async`.
 */
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        for (const { name, value, options } of cookiesToSet) {
                            cookieStore.set(name, value, options);
                        }
                    } catch {
                        // Server Component en cours de rendu → écriture
                        // interdite. Le proxy prendra le relais.
                    }
                },
            },
        },
    );
}

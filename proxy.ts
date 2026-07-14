import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (ex-middleware) Next.js.
 *
 * ⚠️ Next.js 16 a déprécié `middleware.ts` et l'a renommé en
 * `proxy.ts`, avec un export nommé `proxy` au lieu de `middleware`.
 * Le comportement à l'exécution est identique. Voir la note de
 * migration dans les docs Next livrées avec le paquet.
 *
 * Ce proxy rafraîchit automatiquement le token Supabase sur *chaque*
 * requête concernée par le matcher :
 *
 *  1. Il lit les cookies de la requête entrante.
 *  2. Appelle `supabase.auth.getClaims()` — qui vérifie la signature
 *     du JWT (via JWKS pour les projets à clefs asymétriques) et
 *     rafraîchit silencieusement le token si nécessaire.
 *  3. Réplique les nouveaux cookies sur (a) `request.cookies` pour
 *     que les Server Components voient déjà la session à jour, et
 *     (b) `response.cookies` pour que le navigateur remplace ses
 *     anciens cookies.
 *
 * NE JAMAIS remplacer `getClaims()` par `getSession()` ici : le
 * session objet n'est pas re-validé contre le serveur Auth et peut
 * être spoofé via les cookies.
 */
export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // (a) Miroir sur la requête in-flight — les Server
                    //     Components rendus après ce proxy verront la
                    //     nouvelle session.
                    for (const { name, value } of cookiesToSet) {
                        request.cookies.set(name, value);
                    }
                    // On doit recréer la Response après avoir muté
                    // `request` pour que Next inclue les cookies mis
                    // à jour dans les headers propagés.
                    response = NextResponse.next({ request });
                    // (b) Miroir sur la réponse renvoyée au navigateur
                    //     via Set-Cookie.
                    for (const { name, value, options } of cookiesToSet) {
                        response.cookies.set(name, value, options);
                    }
                },
            },
        },
    );

    // Déclenche le refresh du token si besoin. Le résultat n'est pas
    // utilisé ici — on veut juste l'effet de bord sur les cookies.
    await supabase.auth.getClaims();

    return response;
}

export const config = {
    matcher: [
        /*
         * Match toutes les routes SAUF :
         *  - _next/static (fichiers statiques Next)
         *  - _next/image (images optimisées)
         *  - favicon.ico
         *  - fichiers image publics (svg, png, jpg, jpeg, gif, webp)
         *
         * Le webhook Stripe (/api/webhooks/stripe) DOIT rester
         * accessible et n'a pas besoin d'une session Supabase, mais
         * traverser le proxy ne casse rien (le corps brut n'est pas
         * consommé ici).
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};

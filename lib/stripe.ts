import "server-only";

import Stripe from "stripe";

/**
 * Instance Stripe côté serveur uniquement.
 *
 * NE JAMAIS importer ce fichier depuis un Client Component : la clé
 * secrète fuiterait dans le bundle navigateur. Le `import "server-only"`
 * fait échouer le build si quelqu'un essaie.
 *
 * Pour Stripe côté client (Elements, redirectToCheckout…), utilisez
 * `@stripe/stripe-js` avec `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
 */

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
    throw new Error(
        "STRIPE_SECRET_KEY n'est pas définie dans l'environnement.",
    );
}

export const stripe = new Stripe(secretKey, {
    // Épingle la version d'API pour que le comportement soit reproductible :
    // Stripe garantit que cette version n'aura pas de breaking change tant
    // que vous ne la changez pas. Doit correspondre au type
    // `Stripe.LatestApiVersion` livré avec cette version du SDK (v22.x).
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
    appInfo: {
        name: "e-commerce-template",
    },
});

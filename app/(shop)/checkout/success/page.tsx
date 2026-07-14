"use client";

import Link from "next/link";
import { use, useEffect } from "react";

import { useCartStore } from "@/lib/store/cart";

/**
 * Page de confirmation après retour de Stripe Checkout.
 *
 * Stripe redirige ici avec ?session_id={CHECKOUT_SESSION_ID}. On :
 *   1. Lit le `session_id` depuis les searchParams (pour l'afficher /
 *      loguer — la vraie source de vérité reste le webhook Stripe).
 *   2. Vide le panier Zustand au montage, puisque le paiement est
 *      accepté par Stripe. Idempotent : rejouer l'effet ne casse rien.
 *
 * NB : cette page ne fait AUCUNE confirmation métier (création
 * d'Order, décrément du stock…). Cela doit être fait dans le webhook
 * `/api/webhooks/stripe`, seul chemin de confiance.
 */

interface SuccessPageProps {
    searchParams: Promise<{ session_id?: string | string[] }>;
}

export default function CheckoutSuccessPage({
    searchParams,
}: SuccessPageProps) {
    // `use()` déballe la promesse côté client — équivalent client de
    // `await searchParams` dans un Server Component.
    const params = use(searchParams);
    const rawSessionId = params.session_id;
    const sessionId = Array.isArray(rawSessionId)
        ? rawSessionId[0]
        : rawSessionId;

    // On sélectionne uniquement l'action pour éviter un re-render à
    // chaque changement de `items`.
    const clearCart = useCartStore((state) => state.clearCart);

    useEffect(() => {
        clearCart();
    }, [clearCart]);

    return (
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
            <div
                aria-hidden
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700"
            >
                <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                Merci pour votre commande !
            </h1>

            <p className="mt-4 text-base text-zinc-600">
                Votre paiement a bien été reçu. Vous recevrez sous peu un
                e-mail de confirmation avec le détail de votre commande.
            </p>

            {sessionId && (
                <p className="mt-6 rounded-md bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-600">
                    Référence :{" "}
                    <span className="font-semibold text-zinc-900">
                        {sessionId}
                    </span>
                </p>
            )}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                    href="/products"
                    className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
                >
                    Continuer mes achats
                </Link>
            </div>
        </main>
    );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useCartStore } from "@/lib/store/cart";

interface CartDrawerProps {
    open: boolean;
    onClose: () => void;
}

const priceFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
});

export function CartDrawer({ open, onClose }: CartDrawerProps) {
    const items = useCartStore((state) => state.items);
    const totalPrice = useCartStore((state) => state.getTotalPrice());
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const removeItem = useCartStore((state) => state.removeItem);

    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const portalTarget =
        typeof document === "undefined" ? null : document.body;

    const handleClose = useCallback(() => {
        setCheckoutError(null);
        onClose();
    }, [onClose]);

    const handleQuantityChange = (productId: string, quantity: number) => {
        setCheckoutError(null);
        updateQuantity(productId, quantity);
    };

    const handleRemoveItem = (productId: string) => {
        setCheckoutError(null);
        removeItem(productId);
    };

    const handleCheckout = async () => {
        if (isCheckingOut) return;
        setIsCheckingOut(true);
        setCheckoutError(null);

        try {
            const response = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // On n'envoie QUE productId + quantity ; le prix
                    // est relu côté serveur depuis la base.
                    items: items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                }),
            });

            const data: unknown = await response.json().catch(() => null);

            if (!response.ok) {
                const message =
                    (data &&
                        typeof data === "object" &&
                        "error" in data &&
                        typeof (data as { error: unknown }).error === "string" &&
                        (data as { error: string }).error) ||
                    "Impossible de démarrer le paiement. Réessayez.";
                setCheckoutError(message);
                return;
            }

            const url =
                data &&
                    typeof data === "object" &&
                    "url" in data &&
                    typeof (data as { url: unknown }).url === "string"
                    ? (data as { url: string }).url
                    : null;

            if (!url) {
                setCheckoutError(
                    "Réponse invalide du serveur de paiement.",
                );
                return;
            }

            // Redirection dure vers Stripe Checkout (domaine externe).
            window.location.href = url;
        } catch {
            setCheckoutError(
                "Erreur réseau. Vérifiez votre connexion et réessayez.",
            );
        } finally {
            // On garde le spinner tant que la navigation n'a pas
            // commencé — sauf en cas d'erreur, où on réactive le bouton.
            setIsCheckingOut(false);
        }
    };

    // Fermer avec Escape.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        window.addEventListener("keydown", onKey);
        // Bloquer le scroll du body pendant que le drawer est ouvert.
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, handleClose]);

    // Le drawer est rendu via un portal sur `document.body` pour
    // échapper au containing block du Header : `backdrop-blur` sur le
    // Header applique `backdrop-filter`, ce qui force le Header à
    // devenir le référentiel des descendants `position: fixed` — le
    // drawer se retrouverait alors contraint dans la barre du haut
    // au lieu de couvrir tout le viewport.
    const content = (
        <div
            aria-hidden={!open}
            // `overflow-hidden` clippe l'aside pendant sa transition
            // `translate-x-full` (sinon elle dépasse à droite et fait
            // apparaître une scrollbar horizontale sur la page).
            className={`fixed inset-0 z-50 overflow-hidden ${open ? "" : "pointer-events-none"}`}
        >
            {/* Backdrop */}
            <div
                onClick={handleClose}
                className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"
                    }`}
            />

            {/* Panel */}
            <aside
                role="dialog"
                aria-label="Panier"
                aria-modal="true"
                className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform ${open ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-zinc-900">
                        Panier ({items.length})
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Fermer le panier"
                        className="rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                        >
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                {items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                        <p className="text-zinc-500">Votre panier est vide.</p>
                        <Link
                            href="/products"
                            onClick={handleClose}
                            className="mt-4 text-sm font-medium text-zinc-900 underline underline-offset-4"
                        >
                            Voir les produits
                        </Link>
                    </div>
                ) : (
                    <>
                        <ul className="flex-1 divide-y divide-zinc-200 overflow-y-auto">
                            {items.map((item) => (
                                <li
                                    key={item.productId}
                                    className="flex gap-4 px-6 py-4"
                                >
                                    <Link
                                        href={`/products/${item.productId}`}
                                        onClick={handleClose}
                                        aria-label={`Voir ${item.name}`}
                                        className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-zinc-100 transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
                                    >
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            fill
                                            sizes="80px"
                                            className="object-cover"
                                        />
                                    </Link>

                                    <div className="flex flex-1 flex-col">
                                        <div className="flex justify-between gap-2">
                                            <h3 className="text-sm font-medium text-zinc-900 line-clamp-2">
                                                <Link
                                                    href={`/products/${item.productId}`}
                                                    onClick={handleClose}
                                                    className="rounded transition hover:text-zinc-600 hover:underline focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
                                                >
                                                    {item.name}
                                                </Link>
                                            </h3>
                                            <p className="whitespace-nowrap text-sm font-semibold text-zinc-900">
                                                {priceFormatter.format(
                                                    item.price * item.quantity,
                                                )}
                                            </p>
                                        </div>

                                        <p className="mt-1 text-xs text-zinc-500">
                                            {priceFormatter.format(item.price)} / unité
                                        </p>

                                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                                            <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.8"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                aria-hidden
                                                className="shrink-0"
                                            >
                                                <path d="M10 17h4" />
                                                <path d="M3 6h11v9H3z" />
                                                <path d="M14 10h4l3 3v2h-7" />
                                                <circle cx="7.5" cy="17.5" r="1.5" />
                                                <circle cx="17.5" cy="17.5" r="1.5" />
                                            </svg>
                                            Livraison estimée sous 3 à 5 jours ouvrés
                                        </p>

                                        <div className="mt-auto flex items-center justify-between pt-2">
                                            <div className="inline-flex items-center rounded-md border border-zinc-300">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleQuantityChange(
                                                            item.productId,
                                                            item.quantity - 1,
                                                        )
                                                    }
                                                    aria-label={`Diminuer la quantité de ${item.name}`}
                                                    className="px-2 py-1 text-zinc-600 transition hover:bg-zinc-100"
                                                >
                                                    −
                                                </button>
                                                <span
                                                    className="min-w-8 px-2 text-center text-sm font-medium text-zinc-900"
                                                    aria-live="polite"
                                                >
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleQuantityChange(
                                                            item.productId,
                                                            item.quantity + 1,
                                                        )
                                                    }
                                                    aria-label={`Augmenter la quantité de ${item.name}`}
                                                    className="px-2 py-1 text-zinc-600 transition hover:bg-zinc-100"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemoveItem(item.productId)
                                                }
                                                className="text-xs font-medium text-red-600 transition hover:text-red-800"
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <footer className="border-t border-zinc-200 px-6 py-4">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm text-zinc-600">
                                    Total
                                </span>
                                <span className="text-lg font-bold text-zinc-900">
                                    {priceFormatter.format(totalPrice)}
                                </span>
                            </div>

                            {checkoutError && (
                                <p
                                    role="alert"
                                    className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                                >
                                    {checkoutError}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={handleCheckout}
                                disabled={isCheckingOut}
                                aria-busy={isCheckingOut}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isCheckingOut && (
                                    <svg
                                        className="h-4 w-4 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden
                                    >
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            className="opacity-25"
                                        />
                                        <path
                                            d="M4 12a8 8 0 0 1 8-8"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            className="opacity-75"
                                        />
                                    </svg>
                                )}
                                {isCheckingOut
                                    ? "Redirection…"
                                    : "Passer au paiement"}
                            </button>
                        </footer>
                    </>
                )}
            </aside>
        </div>
    );

    // Avant hydratation (SSR / premier rendu client), on ne rend rien
    // — le drawer est purement interactif de toute façon.
    if (!portalTarget) return null;
    return createPortal(content, portalTarget);
}

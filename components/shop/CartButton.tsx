"use client";

import { useEffect, useState } from "react";

import { useCartStore } from "@/lib/store/cart";

import { CartDrawer } from "./CartDrawer";

/**
 * Bouton panier + drawer. Extrait en Client Component pour isoler la
 * partie interactive (état du drawer, écoute du store Zustand) du
 * Header qui est désormais un Server Component (pour récupérer la
 * session Supabase sans flash).
 */
export function CartButton() {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const totalItems = useCartStore((state) => state.getTotalItems());

    // Le store Zustand est hydraté depuis localStorage côté client
    // uniquement : sans ce garde, le SSR rendrait 0 et provoquerait un
    // mismatch d'hydratation avec la valeur réelle du navigateur.
    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Ouvrir le panier"
                className="relative rounded-md p-2 text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>

                {mounted && totalItems > 0 ? (
                    <span
                        aria-label={`${totalItems} article${totalItems > 1 ? "s" : ""} dans le panier`}
                        className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[11px] font-semibold text-white"
                    >
                        {totalItems}
                    </span>
                ) : null}
            </button>

            <CartDrawer open={open} onClose={() => setOpen(false)} />
        </>
    );
}

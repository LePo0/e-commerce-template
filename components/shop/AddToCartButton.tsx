"use client";

import { useState } from "react";

import { useCartStore, type CartProduct } from "@/lib/store/cart";

interface AddToCartButtonProps {
    product: CartProduct;
    stock: number;
}

export function AddToCartButton({ product, stock }: AddToCartButtonProps) {
    const addItem = useCartStore((state) => state.addItem);
    const [justAdded, setJustAdded] = useState(false);

    const inStock = stock > 0;

    const handleClick = () => {
        addItem(product, 1);
        setJustAdded(true);
        // Feedback visuel court, sans dépendance externe.
        window.setTimeout(() => setJustAdded(false), 1500);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={!inStock}
            aria-live="polite"
            className="w-full rounded-md bg-zinc-900 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
            {!inStock
                ? "Indisponible"
                : justAdded
                    ? "✓ Ajouté au panier"
                    : "Ajouter au panier"}
        </button>
    );
}

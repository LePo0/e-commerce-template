"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Ligne du panier. On duplique les infos produit (name, price, imageUrl)
 * pour ne pas dépendre de la DB à l'affichage et pour figer le prix au
 * moment de l'ajout — les prix côté DB peuvent changer.
 */
export interface CartItem {
    productId: string;
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
}

/**
 * Représentation minimale du produit acceptée par `addItem`.
 * Permet de passer soit un produit Prisma (après conversion Decimal → number)
 * soit n'importe quel objet compatible.
 */
export interface CartProduct {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
}

interface CartState {
    items: CartItem[];

    addItem: (product: CartProduct, quantity?: number) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;

    getTotalPrice: () => number;
    getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (product, quantity = 1) => {
                if (quantity <= 0) return;

                set((state) => {
                    const existing = state.items.find(
                        (item) => item.productId === product.id,
                    );

                    if (existing) {
                        return {
                            items: state.items.map((item) =>
                                item.productId === product.id
                                    ? { ...item, quantity: item.quantity + quantity }
                                    : item,
                            ),
                        };
                    }

                    return {
                        items: [
                            ...state.items,
                            {
                                productId: product.id,
                                name: product.name,
                                price: product.price,
                                imageUrl: product.imageUrl,
                                quantity,
                            },
                        ],
                    };
                });
            },

            removeItem: (productId) => {
                set((state) => ({
                    items: state.items.filter(
                        (item) => item.productId !== productId,
                    ),
                }));
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId);
                    return;
                }

                set((state) => ({
                    items: state.items.map((item) =>
                        item.productId === productId
                            ? { ...item, quantity }
                            : item,
                    ),
                }));
            },

            clearCart: () => set({ items: [] }),

            getTotalPrice: () =>
                get().items.reduce(
                    (total, item) => total + item.price * item.quantity,
                    0,
                ),

            getTotalItems: () =>
                get().items.reduce((total, item) => total + item.quantity, 0),
        }),
        {
            name: "cart-storage",
            // On ne persiste que les items ; les fonctions sont recréées à
            // chaque rehydratation par Zustand.
            partialize: (state) => ({ items: state.items }),
        },
    ),
);

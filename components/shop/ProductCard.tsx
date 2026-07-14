import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "./AddToCartButton";

/**
 * Shape minimale attendue par la carte : n'importe quel objet compatible
 * (produit Prisma converti, mock de test…) fonctionne.
 * `price` doit être un `number` — convertissez le `Decimal` de Prisma
 * en amont via `Number(product.price)`.
 */
export interface ProductCardProduct {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    stock: number;
}

interface ProductCardProps {
    product: ProductCardProduct;
    /**
     * Ratio approximatif de la carte par rapport à la viewport, transmis
     * à `next/image` via `sizes`. À adapter selon la grille du parent
     * (par défaut : 4 colonnes en xl → 25vw).
     */
    imageSizes?: string;
}

const priceFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
});

export function ProductCard({
    product,
    imageSizes = "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: ProductCardProps) {
    const detailHref = `/products/${product.id}`;

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
            <Link
                href={detailHref}
                aria-label={`Voir ${product.name}`}
                className="block aspect-square overflow-hidden bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zinc-900"
            >
                <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={400}
                    height={400}
                    sizes={imageSizes}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                />
            </Link>

            <div className="flex flex-1 flex-col p-4">
                <h3 className="text-base font-semibold text-zinc-900 line-clamp-2">
                    <Link
                        href={detailHref}
                        className="rounded transition hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
                    >
                        {product.name}
                    </Link>
                </h3>

                <p className="mt-2 text-lg font-bold text-zinc-900">
                    {priceFormatter.format(product.price)}
                </p>

                <div className="mt-4">
                    <AddToCartButton
                        product={{
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            imageUrl: product.imageUrl,
                        }}
                        stock={product.stock}
                    />
                </div>
            </div>
        </article>
    );
}

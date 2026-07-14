import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const priceFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
});

// Next.js 16 : `params` est un Promise, il faut l'await.
type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: PageProps) {
    const { id } = await params;

    const product = await prisma.product.findUnique({
        where: { id },
    });

    if (!product) {
        notFound();
    }

    const inStock = product.stock > 0;

    return (
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <nav className="mb-8 text-sm">
                <Link
                    href="/products"
                    className="text-zinc-500 transition hover:text-zinc-900"
                >
                    ← Retour aux produits
                </Link>
            </nav>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                <div className="aspect-square overflow-hidden rounded-lg bg-zinc-100">
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={800}
                        height={800}
                        priority
                        className="h-full w-full object-cover"
                        sizes="(min-width: 1024px) 50vw, 100vw"
                    />
                </div>

                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                        {product.name}
                    </h1>

                    <p className="mt-4 text-3xl font-semibold text-zinc-900">
                        {priceFormatter.format(Number(product.price))}
                    </p>

                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-500">
                        <svg
                            width="14"
                            height="14"
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

                    <div className="mt-6">
                        {inStock ? (
                            <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                                <span
                                    aria-hidden
                                    className="h-2 w-2 rounded-full bg-emerald-500"
                                />
                                En stock ({product.stock} disponible
                                {product.stock > 1 ? "s" : ""})
                            </p>
                        ) : (
                            <p className="inline-flex items-center gap-2 text-sm font-medium text-red-700">
                                <span
                                    aria-hidden
                                    className="h-2 w-2 rounded-full bg-red-500"
                                />
                                Rupture de stock
                            </p>
                        )}
                    </div>

                    <div className="mt-8 border-t border-zinc-200 pt-8">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                            Description
                        </h2>
                        <p className="mt-3 whitespace-pre-line text-base leading-7 text-zinc-700">
                            {product.description}
                        </p>
                    </div>

                    <div className="mt-auto pt-10">
                        <AddToCartButton
                            product={{
                                id: product.id,
                                name: product.name,
                                // Prisma renvoie Decimal ; on convertit en number
                                // pour pouvoir passer le produit à un Client
                                // Component sérialisable.
                                price: Number(product.price),
                                imageUrl: product.imageUrl,
                            }}
                            stock={product.stock}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}

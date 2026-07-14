import Link from "next/link";

import { ProductCard } from "@/components/shop/ProductCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const popularProducts = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="bg-gradient-to-b from-zinc-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 inline-flex items-center rounded-full bg-zinc-900/5 px-3 py-1 text-xs font-medium text-zinc-700">
              Nouvelle collection · Livraison offerte dès 50 €
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
              Des objets choisis,
              <br />
              livrés chez vous.
            </h1>

            <p className="mt-6 text-lg leading-8 text-zinc-600">
              Une sélection d&apos;articles pensés pour durer.
              Paiement sécurisé par Stripe, livraison rapide.
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
              >
                Voir le catalogue
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Produits populaires */}
      {popularProducts.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                Produits populaires
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Nos coups de cœur du moment.
              </p>
            </div>

            <Link
              href="/products"
              className="hidden text-sm font-medium text-zinc-900 underline underline-offset-4 transition hover:text-zinc-600 sm:block"
            >
              Tout voir →
            </Link>
          </div>

          <ul
            role="list"
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {popularProducts.map((product) => (
              <li key={product.id}>
                <ProductCard
                  product={{
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    imageUrl: product.imageUrl,
                    stock: product.stock,
                  }}
                  imageSizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

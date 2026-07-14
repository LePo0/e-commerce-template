import { ProductCard } from "@/components/shop/ProductCard";
import { prisma } from "@/lib/prisma";

// Prisma renvoie les prix en Decimal ; on force le rendu dynamique pour
// éviter que Next.js essaie de pré-rendre la page à la build sans DB.
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
    const products = await prisma.product.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <header className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                    Nos produits
                </h1>
                <p className="mt-2 text-sm text-zinc-600">
                    {products.length} produit{products.length > 1 ? "s" : ""} disponible
                    {products.length > 1 ? "s" : ""}
                </p>
            </header>

            {products.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-zinc-500">
                    Aucun produit disponible pour le moment.
                </p>
            ) : (
                <ul
                    role="list"
                    className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    {products.map((product) => (
                        <li key={product.id}>
                            <ProductCard
                                product={{
                                    id: product.id,
                                    name: product.name,
                                    price: Number(product.price),
                                    imageUrl: product.imageUrl,
                                    stock: product.stock,
                                }}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}

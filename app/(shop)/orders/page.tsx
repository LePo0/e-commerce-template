import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const moneyFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
});

function statusBadgeClasses(status: string): string {
    switch (status) {
        case "PAID":
            return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
        case "PENDING":
            return "bg-amber-50 text-amber-700 ring-amber-600/20";
        case "SHIPPED":
            return "bg-sky-50 text-sky-700 ring-sky-600/20";
        case "CANCELLED":
            return "bg-rose-50 text-rose-700 ring-rose-600/20";
        default:
            return "bg-zinc-100 text-zinc-700 ring-zinc-600/20";
    }
}

function formatOrderLabel(id: string): string {
    return id.length > 12 ? `${id.slice(0, 12)}...` : id;
}

export default async function OrdersPage() {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
        redirect("/login");
    }

    const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            imageUrl: true,
                        },
                    },
                },
            },
        },
    });

    return (
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <header className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                    Mes commandes
                </h1>
                <p className="mt-2 text-sm text-zinc-600">
                    {orders.length} commande{orders.length > 1 ? "s" : ""}
                </p>
            </header>

            {orders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
                    <p className="text-base text-zinc-700">
                        Aucune commande pour l&#39;instant.
                    </p>
                    <Link
                        href="/products"
                        className="mt-4 inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
                    >
                        Voir les produits
                    </Link>
                </div>
            ) : (
                <ul role="list" className="space-y-6">
                    {orders.map((order) => (
                        <li
                            key={order.id}
                            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
                        >
                            <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                        Commande
                                    </p>
                                    <p
                                        className="mt-1 font-mono text-sm text-zinc-900"
                                        title={order.id}
                                    >
                                        {formatOrderLabel(order.id)}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {dateFormatter.format(order.createdAt)}
                                    </p>
                                </div>

                                <span
                                    className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClasses(order.status)}`}
                                >
                                    {order.status}
                                </span>
                            </div>

                            <div className="mt-5 space-y-4">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3"
                                    >
                                        <div className="relative h-14 w-14 overflow-hidden rounded-md bg-zinc-100">
                                            <Image
                                                src={item.product.imageUrl}
                                                alt={item.product.name}
                                                fill
                                                sizes="56px"
                                                className="object-cover"
                                            />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-zinc-900">
                                                {item.product.name}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                Quantité: {item.quantity}
                                            </p>
                                        </div>

                                        <p className="text-sm font-medium text-zinc-700">
                                            {moneyFormatter.format(
                                                Number(item.priceAtPurchase),
                                            )}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                        Total payé
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-zinc-900">
                                        {moneyFormatter.format(Number(order.totalAmount))}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                        Adresse de livraison
                                    </p>
                                    <address className="mt-1 not-italic text-sm leading-6 text-zinc-700">
                                        <div>{order.shippingName}</div>
                                        <div>{order.shippingAddressLine1}</div>
                                        {order.shippingAddressLine2 && (
                                            <div>{order.shippingAddressLine2}</div>
                                        )}
                                        <div>
                                            {order.shippingPostalCode} {order.shippingCity}
                                        </div>
                                        <div>{order.shippingCountry}</div>
                                    </address>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}

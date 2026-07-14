import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/checkout
 *
 * Body attendu :
 *   { items: { productId: string; quantity: number }[] }
 *
 * Le client n'envoie JAMAIS les prix : ils sont relus depuis la base
 * de données pour empêcher toute manipulation côté navigateur.
 */

interface CheckoutItemInput {
    productId: string;
    quantity: number;
}

interface CheckoutBody {
    items: CheckoutItemInput[];
}

function isValidBody(value: unknown): value is CheckoutBody {
    if (!value || typeof value !== "object") return false;
    const { items } = value as { items?: unknown };
    if (!Array.isArray(items) || items.length === 0) return false;

    return items.every((item) => {
        if (!item || typeof item !== "object") return false;
        const { productId, quantity } = item as {
            productId?: unknown;
            quantity?: unknown;
        };
        return (
            typeof productId === "string" &&
            productId.length > 0 &&
            typeof quantity === "number" &&
            Number.isInteger(quantity) &&
            quantity > 0
        );
    });
}

/**
 * Reconstruit l'origine de la requête pour composer les URLs de
 * redirection Stripe. On préfère les en-têtes du proxy (x-forwarded-*)
 * quand ils sont présents (Vercel, reverse proxy…), sinon on retombe
 * sur l'URL de la requête.
 */
function getOrigin(request: Request): string {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedHost) {
        return `${forwardedProto ?? "https"}://${forwardedHost}`;
    }
    return new URL(request.url).origin;
}

export async function POST(request: Request) {
    // Auth d'abord : inutile d'aller taper la DB pour un anonyme.
    // On utilise `getClaims()` (JWT vérifié localement avec la clé
    // publique Supabase) — pas de round-trip auth-server sur chaque
    // checkout. Renvoyer 401 dès le début évite aussi de leaker la
    // structure d'erreur du body pour un utilisateur non connecté.
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) {
        return Response.json(
            { error: "Vous devez être connecté pour passer commande." },
            { status: 401 },
        );
    }

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return Response.json(
            { error: "Corps de requête JSON invalide." },
            { status: 400 },
        );
    }

    if (!isValidBody(payload)) {
        return Response.json(
            {
                error:
                    "Format invalide : attendu { items: { productId: string; quantity: number > 0 }[] }.",
            },
            { status: 400 },
        );
    }

    // On agrège les quantités si le même productId apparaît plusieurs
    // fois dans le body (défense en profondeur : le vrai check stock
    // doit se faire sur la somme demandée).
    const requested = new Map<string, number>();
    for (const item of payload.items) {
        requested.set(
            item.productId,
            (requested.get(item.productId) ?? 0) + item.quantity,
        );
    }

    const productIds = Array.from(requested.keys());
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
    });

    // Vérifie qu'aucun produit n'a disparu entre l'ajout au panier et
    // le checkout.
    if (products.length !== productIds.length) {
        const foundIds = new Set(products.map((p) => p.id));
        const missing = productIds.filter((id) => !foundIds.has(id));
        return Response.json(
            {
                error: "Certains produits n'existent plus.",
                missingProductIds: missing,
            },
            { status: 400 },
        );
    }

    // Contrôle de stock produit par produit.
    for (const product of products) {
        const wanted = requested.get(product.id) ?? 0;
        if (wanted > product.stock) {
            return Response.json(
                {
                    error: `Stock insuffisant pour « ${product.name} ». Demandé : ${wanted}, disponible : ${product.stock}.`,
                    productId: product.id,
                    requested: wanted,
                    available: product.stock,
                },
                { status: 400 },
            );
        }
    }

    // Construit les line_items Stripe à partir des données DB — jamais
    // à partir du body. On préserve l'ordre du panier client pour un
    // affichage cohérent sur la page Checkout Stripe.
    const productById = new Map(products.map((p) => [p.id, p]));
    const origin = getOrigin(request);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const [productId, quantity] of requested) {
        const product = productById.get(productId);
        if (!product) continue; // impossible ici mais rassure TS

        // Prisma Decimal → centimes (integer). On passe par toFixed(2)
        // pour éviter les erreurs d'arrondi binaire des floats.
        const unitAmount = Math.round(
            Number(product.price.toFixed(2)) * 100,
        );

        const isAbsoluteImage = /^https?:\/\//i.test(product.imageUrl);

        lineItems.push({
            quantity,
            price_data: {
                currency: "eur",
                unit_amount: unitAmount,
                product_data: {
                    name: product.name,
                    // Stripe exige des URLs absolues pour les images.
                    ...(isAbsoluteImage ? { images: [product.imageUrl] } : {}),
                },
            },
        });
    }

    // Metadata Stripe : limité à 50 clés / 500 caractères par valeur.
    // On sérialise donc le panier en JSON compact dans une seule clé,
    // ce qui permettra au webhook de reconstruire la commande.
    const metadataItems = Array.from(requested, ([productId, quantity]) => ({
        productId,
        quantity,
    }));

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        shipping_address_collection: {
            allowed_countries: ["FR", "BE", "CH", "LU"],
        },
        allow_promotion_codes: true,
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cart`,
        // `client_reference_id` est le champ Stripe standard pour lier
        // une session au client applicatif (repris tel quel dans
        // l'événement webhook `checkout.session.completed`).
        client_reference_id: userId,
        metadata: {
            items: JSON.stringify(metadataItems),
        },
    });

    if (!session.url) {
        return Response.json(
            { error: "Stripe n'a pas renvoyé d'URL de session." },
            { status: 502 },
        );
    }

    return Response.json({ url: session.url });
}

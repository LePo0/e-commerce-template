import "server-only";

import type Stripe from "stripe";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resend, resendFromEmail } from "@/lib/resend";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/webhooks/stripe
 *
 * Endpoint d'accusé de réception des événements Stripe.
 *
 * Sécurité : la signature de la requête est vérifiée avec
 * `stripe.webhooks.constructEvent` en utilisant le corps *brut*
 * (`req.text()`) — Stripe calcule le HMAC sur les octets exacts
 * envoyés, donc toute (dé)sérialisation JSON casse la vérification.
 *
 * On répond 200 dès que possible pour éviter les retries Stripe. Un
 * traitement métier qui échoue est loggé mais on renvoie tout de même
 * 200 quand l'erreur n'est pas récupérable (ex : métadonnées
 * malformées). Les erreurs *transitoires* (DB indisponible…) renvoient
 * 500 pour que Stripe rejoue.
 */

// Le SDK Stripe utilise `crypto` de Node — impossible sur l'edge runtime.
export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const resendDevFallbackTo = process.env.RESEND_DEV_FALLBACK_TO;

if (!webhookSecret) {
    throw new Error(
        "STRIPE_WEBHOOK_SECRET n'est pas définie dans l'environnement.",
    );
}

interface MetadataItem {
    productId: string;
    quantity: number;
}

interface ShippingDetails {
    shippingName: string;
    shippingAddressLine1: string;
    shippingAddressLine2: string | null;
    shippingCity: string;
    shippingPostalCode: string;
    shippingCountry: string;
}

interface PurchasedItem {
    name: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
}

interface OrderConfirmationEmail {
    orderId: string;
    recipientEmail: string;
    items: PurchasedItem[];
    totalAmount: Prisma.Decimal;
    shippingDetails: ShippingDetails;
}

const priceFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
});

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatMoney(value: Prisma.Decimal | number): string {
    const amount = typeof value === "number" ? value : Number(value);
    return priceFormatter.format(amount);
}

function buildShippingAddressLines(details: ShippingDetails): string[] {
    return [
        details.shippingName,
        details.shippingAddressLine1,
        details.shippingAddressLine2,
        `${details.shippingPostalCode} ${details.shippingCity}`,
        details.shippingCountry,
    ].filter((line): line is string => Boolean(line));
}

function buildOrderConfirmationEmail({
    orderId,
    items,
    totalAmount,
    shippingDetails,
}: OrderConfirmationEmail): { html: string; text: string } {
    const shippingAddressLines = buildShippingAddressLines(shippingDetails);
    const itemsRowsHtml = items
        .map((item) => {
            const lineTotal = item.unitPrice.mul(item.quantity);
            return `
                <tr>
                    <td style="padding: 14px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; font-size: 14px;">${escapeHtml(item.name)}</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #e4e4e7; color: #52525b; font-size: 14px; text-align: center;">${item.quantity}</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; font-size: 14px; text-align: right; white-space: nowrap;">${escapeHtml(formatMoney(lineTotal))}</td>
                </tr>`;
        })
        .join("");

    const shippingAddressHtml = shippingAddressLines
        .map((line) => `<div>${escapeHtml(line)}</div>`)
        .join("");

    const itemsText = items
        .map((item) => {
            const lineTotal = item.unitPrice.mul(item.quantity);
            return `- ${item.name} x${item.quantity} : ${formatMoney(lineTotal)}`;
        })
        .join("\n");

    const shippingText = shippingAddressLines.join("\n");

    return {
        html: `
            <div style="margin: 0; padding: 32px 16px; background: #f4f4f5; font-family: Arial, Helvetica, sans-serif; color: #18181b;">
                <div style="max-width: 640px; margin: 0 auto; overflow: hidden; border: 1px solid #e4e4e7; border-radius: 24px; background: #ffffff; box-shadow: 0 18px 40px rgba(24, 24, 27, 0.08);">
                    <div style="padding: 32px; border-bottom: 1px solid #e4e4e7; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);">
                        <div style="display: inline-block; padding: 6px 10px; border-radius: 999px; background: #18181b; color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Commande confirmée</div>
                        <h1 style="margin: 18px 0 8px; font-size: 28px; line-height: 1.15; color: #09090b;">Merci pour votre commande</h1>
                        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #52525b;">Votre paiement a bien été reçu. Nous préparons maintenant votre commande <strong style="color: #18181b;">#${escapeHtml(orderId)}</strong>.</p>
                    </div>
                    <div style="padding: 28px 32px;">
                        <table role="presentation" width="100%" style="border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th align="left" style="padding-bottom: 10px; border-bottom: 1px solid #d4d4d8; color: #71717a; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">Article</th>
                                    <th align="center" style="padding-bottom: 10px; border-bottom: 1px solid #d4d4d8; color: #71717a; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">Qté</th>
                                    <th align="right" style="padding-bottom: 10px; border-bottom: 1px solid #d4d4d8; color: #71717a; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">Montant</th>
                                </tr>
                            </thead>
                            <tbody>${itemsRowsHtml}</tbody>
                        </table>
                        <div style="margin-top: 24px; padding: 20px 22px; border-radius: 20px; background: #fafafa; border: 1px solid #e4e4e7;">
                            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: baseline;">
                                <span style="font-size: 14px; color: #71717a;">Total payé</span>
                                <strong style="font-size: 24px; color: #09090b;">${escapeHtml(formatMoney(totalAmount))}</strong>
                            </div>
                        </div>
                        <div style="margin-top: 24px; padding: 22px; border-radius: 20px; background: #ffffff; border: 1px solid #e4e4e7;">
                            <div style="margin-bottom: 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #71717a;">Adresse de livraison</div>
                            <div style="font-size: 15px; line-height: 1.7; color: #18181b;">${shippingAddressHtml}</div>
                        </div>
                        <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.7; color: #71717a;">Livraison estimée sous 3 à 5 jours ouvrés. Cet e-mail est envoyé automatiquement après la confirmation de votre paiement.</p>
                    </div>
                </div>
            </div>`,
        text: [
            `Commande confirmée #${orderId}`,
            "",
            "Merci pour votre commande. Votre paiement a bien été reçu.",
            "",
            "Articles :",
            itemsText,
            "",
            `Total payé : ${formatMoney(totalAmount)}`,
            "",
            "Adresse de livraison :",
            shippingText,
            "",
            "Livraison estimée sous 3 à 5 jours ouvrés.",
        ].join("\n"),
    };
}

async function sendOrderConfirmationEmail(
    payload: OrderConfirmationEmail,
): Promise<void> {
    if (!resend) {
        console.warn(
            "[stripe webhook] RESEND_API_KEY absente : e-mail de confirmation non envoyé.",
        );
        return;
    }

    const { html, text } = buildOrderConfirmationEmail(payload);
    const shouldRerouteInDev =
        process.env.NODE_ENV !== "production" &&
        typeof resendDevFallbackTo === "string" &&
        resendDevFallbackTo.length > 0;
    const recipientEmail = shouldRerouteInDev
        ? resendDevFallbackTo
        : payload.recipientEmail;

    if (shouldRerouteInDev && recipientEmail !== payload.recipientEmail) {
        console.warn(
            `[stripe webhook] mode dev: e-mail redirigé de ${payload.recipientEmail} vers ${recipientEmail} (RESEND_DEV_FALLBACK_TO).`,
        );
    }

    const sendResult = await resend.emails.send({
        from: resendFromEmail,
        to: recipientEmail,
        subject: `Commande confirmée #${payload.orderId}`,
        html,
        text,
    });

    if (sendResult.error) {
        if (
            sendResult.error.name === "validation_error" &&
            !shouldRerouteInDev
        ) {
            throw new Error(
                `[resend] ${sendResult.error.message}. En développement, définissez RESEND_DEV_FALLBACK_TO=<votre_email_autorisé_resend> pour rediriger les e-mails de test.`,
            );
        }

        throw new Error(
            `[resend] ${sendResult.error.name}: ${sendResult.error.message}`,
        );
    }

    console.info(
        `[stripe webhook] e-mail de confirmation envoyé (${sendResult.data?.id ?? "sans-id"}) à ${recipientEmail}.`,
    );
}

function parseMetadataItems(
    raw: string | null | undefined,
): MetadataItem[] | null {
    if (!raw) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const items: MetadataItem[] = [];
    for (const entry of parsed) {
        if (!entry || typeof entry !== "object") return null;
        const { productId, quantity } = entry as {
            productId?: unknown;
            quantity?: unknown;
        };
        if (typeof productId !== "string" || productId.length === 0) return null;
        if (
            typeof quantity !== "number" ||
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            return null;
        }
        items.push({ productId, quantity });
    }
    return items;
}

function parseShippingDetails(
    shippingDetails: any,
): ShippingDetails | null {
    if (!shippingDetails) return null;

    const { address, name } = shippingDetails;
    if (!address || typeof name !== "string" || name.length === 0) {
        return null;
    }

    if (
        typeof address.line1 !== "string" ||
        address.line1.length === 0 ||
        typeof address.city !== "string" ||
        address.city.length === 0 ||
        typeof address.postal_code !== "string" ||
        address.postal_code.length === 0 ||
        typeof address.country !== "string" ||
        address.country.length === 0
    ) {
        return null;
    }

    return {
        shippingName: name,
        shippingAddressLine1: address.line1,
        shippingAddressLine2: address.line2 ?? null,
        shippingCity: address.city,
        shippingPostalCode: address.postal_code,
        shippingCountry: address.country,
    };
}

async function handleCheckoutCompleted(
    partialSession: Stripe.Checkout.Session,
): Promise<void> {
    // Bonne pratique Stripe : si le payload du webhook ne contient pas
    // collected_information.shipping_details (format API récent), on
    // re-fetch la session complète pour obtenir les données à jour.
    // On ne re-fetch que si nécessaire pour éviter un appel réseau
    // inutile sur le chemin nominal.
    let session = partialSession;
    if (!session.collected_information?.shipping_details) {
        try {
            session = await stripe.checkout.sessions.retrieve(
                partialSession.id,
            );
        } catch (err) {
            console.error(
                `[stripe webhook] impossible de re-fetcher la session ${partialSession.id} :`,
                err,
            );
            // On continue avec la session partielle ; si
            // collected_information.shipping_details reste absent,
            // parseShippingDetails renverra null et on skipera.
        }
    }

    // Idempotence : Stripe peut rejouer un webhook (retries automatiques,
    // renvoi manuel depuis le Dashboard, etc.). Si une commande existe
    // déjà pour cette session, on sort immédiatement sans recréer
    // l'Order ni retoucher le stock.
    const existing = await prisma.order.findFirst({
        where: { stripeSessionId: session.id },
        select: { id: true },
    });
    if (existing) {
        console.info(
            `[stripe webhook] Webhook already processed for session ${session.id} (order ${existing.id}). Skipping.`,
        );
        return;
    }

    const items = parseMetadataItems(session.metadata?.items);
    if (!items) {
        console.error(
            `[stripe webhook] session ${session.id} ignorée : metadata.items manquant ou invalide.`,
        );
        return;
    }

    // `client_reference_id` est attaché par /api/checkout à partir
    // du sub JWT Supabase de l'utilisateur authentifié. Son absence
    // ne peut donc arriver que sur une session créée hors de notre
    // route (test manuel Stripe CLI, ancienne session pré-migration…) :
    // on log et on skip sans faire échouer le webhook.
    const userId = session.client_reference_id;
    if (!userId) {
        console.error(
            `[stripe webhook] session ${session.id} ignorée : client_reference_id absent.`,
        );
        return;
    }

    const shippingDetails = parseShippingDetails(
        session.collected_information?.shipping_details,
    );
    if (!shippingDetails) {
        console.error(
            `[stripe webhook] session ${session.id} ignorée : shipping_details manquant ou invalide.`,
        );
        return;
    }

    // Le prix payé (source de vérité) est côté Stripe. `amount_total`
    // est déjà en centimes. On divise par 100 → decimal pour la DB.
    const totalAmount = new Prisma.Decimal(
        (session.amount_total ?? 0) / 100,
    );

    let confirmationEmail: OrderConfirmationEmail | null = null;

    await prisma.$transaction(async (tx) => {
        // Verrouille les produits concernés pour la durée de la
        // transaction et re-vérifie le stock. Un autre paiement peut
        // avoir vidé le stock entre la création de la session et son
        // completion — on ne veut pas laisser le stock devenir négatif.
        const products = await tx.product.findMany({
            where: { id: { in: items.map((i) => i.productId) } },
            select: { id: true, price: true, stock: true, name: true },
        });

        const productById = new Map(products.map((p) => [p.id, p]));

        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (!user) {
            throw new Error(
                `Utilisateur ${userId} introuvable lors du traitement de la session ${session.id}.`,
            );
        }

        const checkoutCustomerEmail = session.customer_details?.email?.trim();
        const recipientEmail =
            checkoutCustomerEmail && checkoutCustomerEmail.length > 0
                ? checkoutCustomerEmail
                : user.email;

        for (const item of items) {
            const product = productById.get(item.productId);
            if (!product) {
                throw new Error(
                    `Produit ${item.productId} introuvable lors du traitement de la session ${session.id}.`,
                );
            }
            if (product.stock < item.quantity) {
                // Cas rare (oversell) : le paiement est déjà pris, il
                // faudra rembourser manuellement. On lève pour rollback
                // la transaction et surtout ne pas passer le stock en
                // négatif ni marquer la commande PAID.
                throw new Error(
                    `Stock insuffisant pour le produit ${product.name} (${item.productId}) lors du traitement de la session ${session.id}.`,
                );
            }
        }

        const createdOrder = await tx.order.create({
            data: {
                userId,
                status: "PAID",
                totalAmount,
                ...shippingDetails,
                // Ancre d'idempotence : contrainte UNIQUE en base, donc
                // si un second webhook se glisse entre le findFirst et
                // le create ci-dessus, Postgres lèvera une erreur de
                // violation d'unicité et la transaction sera rollbackée.
                stripeSessionId: session.id,
                items: {
                    create: items.map((item) => {
                        // Non-null garanti par la boucle de validation ci-dessus.
                        const product = productById.get(item.productId)!;
                        return {
                            productId: item.productId,
                            quantity: item.quantity,
                            // Prix au moment de l'achat, figé dans OrderItem.
                            priceAtPurchase: product.price,
                        };
                    }),
                },
            },
            select: { id: true },
        });

        confirmationEmail = {
            orderId: createdOrder.id,
            recipientEmail,
            items: items.map((item) => {
                const product = productById.get(item.productId)!;
                return {
                    name: product.name,
                    quantity: item.quantity,
                    unitPrice: product.price,
                };
            }),
            totalAmount,
            shippingDetails,
        };

        // Décrémente le stock produit par produit. `decrement` génère un
        // `UPDATE ... SET stock = stock - N` atomique côté Postgres.
        for (const item of items) {
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
            });
        }
    });

    if (confirmationEmail) {
        try {
            await sendOrderConfirmationEmail(confirmationEmail);
        } catch (error) {
            console.error(
                `[stripe webhook] commande créée pour la session ${session.id}, mais l'e-mail de confirmation a échoué :`,
                error,
            );
        }
    }

    console.info(
        `[stripe webhook] session ${session.id} traitée : commande créée pour l'utilisateur ${userId}.`,
    );
}

export async function POST(request: Request): Promise<Response> {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
        return new Response("Signature Stripe manquante.", { status: 400 });
    }

    // Corps *brut* obligatoire pour la vérification HMAC.
    const rawBody = await request.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            webhookSecret!,
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[stripe webhook] signature invalide : ${message}`);
        return new Response(`Webhook signature invalide : ${message}`, {
            status: 400,
        });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutCompleted(
                    event.data.object,
                );
                break;
            default:
                // Événement reçu mais non géré : on l'accuse à Stripe
                // pour éviter les retries — l'abonnement à cet event
                // doit être désactivé côté Dashboard si on n'en veut
                // pas.
                console.info(
                    `[stripe webhook] événement ignoré : ${event.type} (${event.id}).`,
                );
        }
    } catch (err) {
        // Erreur transitoire (DB, réseau…) : on renvoie 500 pour que
        // Stripe rejoue l'événement.
        console.error(
            `[stripe webhook] échec du traitement de ${event.type} (${event.id}) :`,
            err,
        );
        return new Response("Erreur interne lors du traitement du webhook.", {
            status: 500,
        });
    }

    return new Response(null, { status: 200 });
}

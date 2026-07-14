import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { POST } from "../app/api/webhooks/stripe/route.ts";

async function main() {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error("STRIPE_WEBHOOK_SECRET missing");
    }

    const user = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true },
    });
    if (!user) {
        throw new Error("No user found in public.users");
    }

    const products = await prisma.product.findMany({
        take: 2,
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, price: true },
    });
    if (products.length === 0) {
        throw new Error("No products found");
    }

    const items = products.map((product, index) => ({
        productId: product.id,
        quantity: index + 1,
    }));

    let amountTotal = 0;
    for (const item of items) {
        const product = products.find((entry) => entry.id === item.productId);
        if (!product) {
            throw new Error(`Missing product ${item.productId}`);
        }
        amountTotal += Math.round(Number(product.price.toFixed(2)) * 100) * item.quantity;
    }

    const sessionId = `cs_test_local_${Date.now()}`;
    const eventId = `evt_test_local_${Date.now()}`;
    const payloadObject = {
        id: eventId,
        type: "checkout.session.completed",
        livemode: false,
        api_version: "2026-06-24.dahlia",
        data: {
            object: {
                id: sessionId,
                object: "checkout.session",
                client_reference_id: user.id,
                metadata: {
                    items: JSON.stringify(items),
                },
                amount_total: amountTotal,
                shipping_details: {
                    name: "Vincent Test",
                    address: {
                        line1: "10 rue de la Paix",
                        line2: "Appartement 5B",
                        city: "Paris",
                        postal_code: "75002",
                        country: "FR",
                    },
                },
            },
        },
    };

    const payload = JSON.stringify(payloadObject);
    const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: webhookSecret,
    });

    const response = await POST(
        new Request("http://localhost/api/webhooks/stripe", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "stripe-signature": signature,
            },
            body: payload,
        }),
    );

    const order = await prisma.order.findFirst({
        where: { stripeSessionId: sessionId },
        select: {
            id: true,
            stripeSessionId: true,
            shippingName: true,
            shippingAddressLine1: true,
            shippingAddressLine2: true,
            shippingCity: true,
            shippingPostalCode: true,
            shippingCountry: true,
            totalAmount: true,
            items: {
                select: {
                    productId: true,
                    quantity: true,
                },
            },
        },
    });

    console.log(
        JSON.stringify(
            {
                responseStatus: response.status,
                responseBody: await response.text(),
                user,
                order,
            },
            null,
            2,
        ),
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

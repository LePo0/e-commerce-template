import fs from "node:fs";
import { Client } from "pg";
import Stripe from "stripe";

function loadEnvFile(filePath) {
    const raw = fs.readFileSync(filePath, "utf8");
    const env = {};

    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const equalsIndex = line.indexOf("=");
        if (equalsIndex < 0) continue;

        const key = line.slice(0, equalsIndex).trim();
        let value = line.slice(equalsIndex + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        env[key] = value;
    }

    return env;
}

const env = loadEnvFile(new URL("../.env.local", import.meta.url));
const requiredKeys = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "DATABASE_URL"];
for (const key of requiredKeys) {
    if (!env[key]) {
        throw new Error(`${key} missing from .env.local`);
    }
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia",
});
const client = new Client({ connectionString: env.DATABASE_URL });

await client.connect();

try {
    const userRes = await client.query(
        'select id, email from users order by "createdAt" asc limit 1',
    );
    if (userRes.rowCount === 0) {
        throw new Error("No user found in public.users");
    }

    const productRes = await client.query(
        'select id, name, price from products order by "createdAt" asc limit 2',
    );
    if (productRes.rowCount === 0) {
        throw new Error("No products found");
    }

    const user = userRes.rows[0];
    const products = productRes.rows;
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
        amountTotal +=
            Math.round(Number(product.price) * 100) * item.quantity;
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
        secret: env.STRIPE_WEBHOOK_SECRET,
    });

    const response = await fetch("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "stripe-signature": signature,
        },
        body: payload,
    });

    const responseBody = await response.text();
    const orderRes = await client.query(
        'select id, "stripeSessionId", "shippingName", "shippingAddressLine1", "shippingAddressLine2", "shippingCity", "shippingPostalCode", "shippingCountry", "totalAmount" from orders where "stripeSessionId"=$1 limit 1',
        [sessionId],
    );

    console.log(
        JSON.stringify(
            {
                responseStatus: response.status,
                responseBody,
                user,
                products,
                order: orderRes.rows[0] ?? null,
            },
            null,
            2,
        ),
    );
} finally {
    await client.end();
}

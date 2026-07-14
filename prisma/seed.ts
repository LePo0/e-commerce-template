import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import { PrismaClient } from "../app/generated/prisma/client";

// Charge .env.local (convention Next.js) puis .env en fallback,
// car `tsx prisma/seed.ts` ne les charge pas automatiquement.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const connectionString =
    process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error(
        "DIRECT_URL (ou DATABASE_URL) doit être défini pour exécuter le seed.",
    );
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

// Slug déterministe utilisé à la fois comme "seed" pour picsum.photos
// (pour obtenir toujours la même image) et comme identifiant lisible.
const products = [
    {
        slug: "casque-audio",
        name: "Casque audio sans fil",
        description:
            "Casque circum-aural Bluetooth 5.3 avec réduction active de bruit et 40 h d'autonomie.",
        price: 129.9,
        stock: 25,
    },
    {
        slug: "sac-a-dos-cuir",
        name: "Sac à dos en cuir",
        description:
            "Sac à dos artisanal en cuir pleine fleur, compartiment ordinateur 15 pouces.",
        price: 189.0,
        stock: 12,
    },
    {
        slug: "montre-connectee",
        name: "Montre connectée sport",
        description:
            "Écran AMOLED 1,4\", GPS intégré, suivi cardiaque et étanchéité 5 ATM.",
        price: 249.99,
        stock: 40,
    },
    {
        slug: "cafetiere-italienne",
        name: "Cafetière italienne 6 tasses",
        description:
            "Moka pot en aluminium poli, compatible tous feux sauf induction.",
        price: 34.5,
        stock: 60,
    },
    {
        slug: "lampe-design",
        name: "Lampe de bureau design",
        description:
            "Lampe LED articulée avec variateur tactile et port USB-C intégré.",
        price: 79.0,
        stock: 18,
    },
    {
        slug: "carnet-cuir",
        name: "Carnet de notes en cuir",
        description:
            "Carnet A5 rechargeable, 200 pages ivoire, couverture cuir végétal.",
        price: 42.0,
        stock: 80,
    },
];

async function main() {
    console.log("🌱 Seed en cours...");

    // On vide d'abord la table produit (les OrderItem qui pointent
    // dessus utilisent onDelete: Restrict, mais on n'a pas encore de
    // commandes en seed donc c'est sans risque).
    await prisma.product.deleteMany();

    const created = await prisma.product.createMany({
        data: products.map((p) => ({
            name: p.name,
            description: p.description,
            price: p.price,
            imageUrl: `https://picsum.photos/seed/${p.slug}/400/400`,
            stock: p.stock,
        })),
    });

    console.log(`✅ ${created.count} produits créés.`);
}

main()
    .catch((error) => {
        console.error("❌ Erreur pendant le seed :", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

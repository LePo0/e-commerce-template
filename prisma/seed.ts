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

// Le slug donne le nom du fichier image dans `public/products/`
// (photos Unsplash, licence libre — crédits dans le README).
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

    // Idempotent : impossible de vider la table produit dès qu'il existe
    // des commandes (OrderItem → Product en onDelete: Restrict). On met
    // donc à jour les produits existants (repérés par leur nom) et on
    // crée les manquants. Le stock d'un produit existant n'est pas
    // réinitialisé.
    let createdCount = 0;
    let updatedCount = 0;

    for (const p of products) {
        const data = {
            name: p.name,
            description: p.description,
            price: p.price,
            imageUrl: `/products/${p.slug}.jpg`,
        };

        const existing = await prisma.product.findFirst({
            where: { name: p.name },
            select: { id: true },
        });

        if (existing) {
            await prisma.product.update({ where: { id: existing.id }, data });
            updatedCount++;
        } else {
            await prisma.product.create({ data: { ...data, stock: p.stock } });
            createdCount++;
        }
    }

    console.log(
        `✅ ${createdCount} produit(s) créé(s), ${updatedCount} mis à jour.`,
    );
}

main()
    .catch((error) => {
        console.error("❌ Erreur pendant le seed :", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

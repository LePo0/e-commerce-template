import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/app/generated/prisma/client";

/**
 * Singleton Prisma Client pour Next.js App Router.
 *
 * En développement, Next.js recharge les modules à chaud (HMR) : sans
 * singleton on créerait une nouvelle instance à chaque hot-reload, ce
 * qui épuiserait le pool de connexions Postgres. On stocke donc
 * l'instance sur `globalThis` en dev pour la réutiliser.
 *
 * En production, on crée une seule instance par processus serverless.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL n'est pas définie dans l'environnement.");
}

const createPrismaClient = () =>
    new PrismaClient({
        // Prisma 7 : l'URL n'est plus dans schema.prisma, on passe un
        // driver adapter (ici node-postgres via @prisma/adapter-pg).
        adapter: new PrismaPg({ connectionString }),
        log:
            process.env.NODE_ENV === "development"
                ? ["query", "error", "warn"]
                : ["error"],
    });

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClientSingleton;
};

export const prisma: PrismaClientSingleton =
    globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

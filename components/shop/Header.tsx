import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { CartButton } from "./CartButton";
import { SignOutButton } from "./SignOutButton";

/**
 * Header du site. Server Component asynchrone : il récupère la
 * session Supabase côté serveur via `getClaims()` (validation JWT
 * locale, safe pour l'autorisation) avant de rendre l'HTML. Cela
 * évite tout flash « non connecté » au chargement — le HTML servi
 * contient déjà les liens Auth corrects.
 *
 * Les parties interactives (panier, déconnexion) sont extraites en
 * Client Components (`CartButton`, `SignOutButton`) pour ne pas
 * transformer tout le Header en Client Component.
 */
export async function Header() {
    const supabase = await createClient();

    // `getClaims()` vérifie la signature du JWT (JWKS local pour les
    // projets à clefs asymétriques) — c'est la seule méthode fiable
    // en Server Component. `getSession()` lit un storage non revalidé
    // et est spoofable via les cookies.
    const { data: claimsData } = await supabase.auth.getClaims();

    // `claims.email` est présent pour les utilisateurs Email/Password.
    const email = claimsData?.claims?.email ?? null;
    const isAuthenticated = Boolean(claimsData?.claims);

    return (
        <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <Link
                    href="/"
                    className="text-lg font-bold tracking-tight text-zinc-900"
                >
                    Ma Boutique
                </Link>

                <nav className="flex items-center gap-4 sm:gap-6">
                    <Link
                        href="/products"
                        className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
                    >
                        Produits
                    </Link>

                    {isAuthenticated ? (
                        <div className="flex items-center gap-3 sm:gap-4">
                            {email && (
                                <span
                                    className="hidden max-w-[200px] truncate text-sm text-zinc-600 sm:inline"
                                    title={email}
                                >
                                    {email}
                                </span>
                            )}
                            <Link
                                href="/orders"
                                className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
                            >
                                Mes commandes
                            </Link>
                            <SignOutButton />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 sm:gap-4">
                            <Link
                                href="/login"
                                className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
                            >
                                Connexion
                            </Link>
                            <Link
                                href="/signup"
                                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
                            >
                                Inscription
                            </Link>
                        </div>
                    )}

                    <CartButton />
                </nav>
            </div>
        </header>
    );
}

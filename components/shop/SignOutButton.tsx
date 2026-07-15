"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Bouton de déconnexion. Client Component parce qu'il doit :
 *  - appeler `supabase.auth.signOut()` côté navigateur (nettoie le
 *    storage local + révoque la session côté serveur Auth),
 *  - naviguer vers `/` puis déclencher `router.refresh()` pour que le
 *    Server Component parent (Header) re-render en mode « non connecté ».
 */
export function SignOutButton() {
    const router = useRouter();
    const supabase = createClient();
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function handleSignOut() {
        if (isSigningOut) return;
        setIsSigningOut(true);

        const { error } = await supabase.auth.signOut();
        if (error) {
            // Peu probable en pratique — on log et on tente quand même
            // le refresh, l'utilisateur pourra retenter au besoin.
            console.error("[signOut]", error.message);
        }

        router.replace("/");
        router.refresh();
    }

    return (
        <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-busy={isSigningOut}
            className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {isSigningOut ? "Déconnexion…" : "Déconnexion"}
        </button>
    );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Garde les Server Components synchronisés avec l'état auth Supabase
 * (connexion / déconnexion) sans rechargement manuel de la page.
 */
export function AuthStateSync() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        let isActive = true;
        let lastAuthState: boolean | null = null;

        async function syncWithServerState() {
            try {
                const response = await fetch("/api/auth/state", {
                    method: "GET",
                    cache: "no-store",
                });

                if (!response.ok) return;

                const data = (await response.json()) as { authenticated: boolean };
                if (!isActive) return;

                if (lastAuthState === null) {
                    lastAuthState = data.authenticated;
                    return;
                }

                if (lastAuthState !== data.authenticated) {
                    lastAuthState = data.authenticated;
                    router.refresh();
                }
            } catch {
                // En cas d'erreur réseau ponctuelle, on retentera au tick suivant.
            }
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
                router.refresh();
            }
        });

        const intervalId = window.setInterval(syncWithServerState, 2000);

        function handleVisibilityOrFocus() {
            void syncWithServerState();
        }

        window.addEventListener("focus", handleVisibilityOrFocus);
        document.addEventListener("visibilitychange", handleVisibilityOrFocus);

        void syncWithServerState();

        return () => {
            isActive = false;
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleVisibilityOrFocus);
            document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
            subscription.unsubscribe();
        };
    }, [router, supabase]);

    return null;
}
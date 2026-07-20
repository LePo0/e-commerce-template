import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/shop/ChangePasswordForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const email = claimsData?.claims?.email ?? null;

    if (!claimsData?.claims?.sub) {
        redirect("/login");
    }

    return (
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-6 py-16">
            <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                    Mon profil
                </h1>
                <p className="mt-2 text-sm text-zinc-600">
                    Gérez la sécurité de votre compte.
                </p>

                {email && (
                    <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                        Connecté avec: <span className="font-semibold text-zinc-900">{email}</span>
                    </p>
                )}

                <ChangePasswordForm />
            </div>
        </main>
    );
}

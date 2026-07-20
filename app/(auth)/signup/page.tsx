"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Page d'inscription email + mot de passe + confirmation.
 *
 * Selon la config du projet Supabase, `signUp` peut :
 *  - créer un compte + session immédiatement (email confirmation
 *    désactivée) → on redirige vers /.
 *  - créer un compte SANS session, en attendant que l'utilisateur
 *    clique sur le lien de confirmation reçu par mail → on affiche
 *    un message et on ne redirige pas.
 *
 * On distingue les deux cas via la présence de `data.session`.
 */
export default function SignupPage() {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;

        // Validation côté client — le serveur re-validera de toute façon.
        if (password !== passwordConfirm) {
            setError("Les deux mots de passe ne correspondent pas.");
            return;
        }
        if (password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError) {
            setError(signUpError.message);
            setIsSubmitting(false);
            return;
        }

        if (!data.session) {
            // Confirmation email activée dans le projet Supabase :
            // l'utilisateur doit cliquer sur le lien reçu avant de
            // pouvoir se connecter. Pas de redirection.
            setNeedsEmailConfirmation(true);
            setIsSubmitting(false);
            return;
        }

        // Compte créé + connecté d'un coup : même logique que login
        // pour ne pas rester sur un payload client obsolète.
        router.replace("/");
        router.refresh();
    }

    if (needsEmailConfirmation) {
        return (
            <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6 py-16">
                <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
                    <div
                        aria-hidden
                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-10 5L2 7" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                        Vérifiez votre e-mail
                    </h1>
                    <p className="mt-2 text-sm text-zinc-600">
                        Nous avons envoyé un lien de confirmation à{" "}
                        <span className="font-semibold text-zinc-900">
                            {email}
                        </span>
                        . Cliquez dessus pour activer votre compte.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6 py-16">
            <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                    Créer un compte
                </h1>
                <p className="mt-2 text-sm text-zinc-600">
                    Rejoignez-nous pour passer commande en un clic.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-zinc-900"
                        >
                            E-mail
                        </label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-zinc-900"
                        >
                            Mot de passe
                        </label>
                        <div className="relative mt-1">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-12 text-sm text-zinc-900 shadow-sm transition focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                            aria-pressed={showPassword}
                            className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-zinc-600 transition hover:text-zinc-900"
                        >
                            {showPassword ? (
                                <svg
                                    aria-hidden
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-5 w-5"
                                >
                                    <path
                                        d="M3 3l18 18"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M10.58 10.58a2 2 0 1 0 2.83 2.83"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M9.88 5.08A10.94 10.94 0 0 1 12 4.91c5.05 0 9.27 3.11 10.5 7.09a10.82 10.82 0 0 1-4.2 5.67"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M6.61 6.61A10.84 10.84 0 0 0 1.5 12c1.23 3.98 5.45 7.09 10.5 7.09 1.77 0 3.44-.38 4.94-1.06"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    aria-hidden
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-5 w-5"
                                >
                                    <path
                                        d="M1.5 12S5.73 4.91 12 4.91 22.5 12 22.5 12 18.27 19.09 12 19.09 1.5 12 1.5 12Z"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="3"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    />
                                </svg>
                            )}
                        </button>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                            Au moins 6 caractères.
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="passwordConfirm"
                            className="block text-sm font-medium text-zinc-900"
                        >
                            Confirmer le mot de passe
                        </label>
                        <div className="relative mt-1">
                        <input
                            id="passwordConfirm"
                            type={showPasswordConfirm ? "text" : "password"}
                            name="passwordConfirm"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-12 text-sm text-zinc-900 shadow-sm transition focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPasswordConfirm((prev) => !prev)}
                            aria-label={showPasswordConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                            aria-pressed={showPasswordConfirm}
                            className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-zinc-600 transition hover:text-zinc-900"
                        >
                            {showPasswordConfirm ? (
                                <svg
                                    aria-hidden
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-5 w-5"
                                >
                                    <path
                                        d="M3 3l18 18"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M10.58 10.58a2 2 0 1 0 2.83 2.83"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M9.88 5.08A10.94 10.94 0 0 1 12 4.91c5.05 0 9.27 3.11 10.5 7.09a10.82 10.82 0 0 1-4.2 5.67"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M6.61 6.61A10.84 10.84 0 0 0 1.5 12c1.23 3.98 5.45 7.09 10.5 7.09 1.77 0 3.44-.38 4.94-1.06"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    aria-hidden
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-5 w-5"
                                >
                                    <path
                                        d="M1.5 12S5.73 4.91 12 4.91 22.5 12 22.5 12 18.27 19.09 12 19.09 1.5 12 1.5 12Z"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="3"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    />
                                </svg>
                            )}
                        </button>
                        </div>
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        aria-busy={isSubmitting}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting && (
                            <svg
                                className="h-4 w-4 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    className="opacity-25"
                                />
                                <path
                                    d="M4 12a8 8 0 0 1 8-8"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    className="opacity-75"
                                />
                            </svg>
                        )}
                        {isSubmitting ? "Création…" : "Créer mon compte"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-zinc-600">
                    Déjà un compte ?{" "}
                    <Link
                        href="/login"
                        className="font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-700"
                    >
                        Se connecter
                    </Link>
                </p>
            </div>
        </main>
    );
}

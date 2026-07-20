"use client";

import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Formulaire de changement de mot de passe pour un utilisateur connecté.
 */
export function ChangePasswordForm() {
    const supabase = createClient();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;

        setError(null);
        setSuccessMessage(null);

        if (newPassword !== confirmPassword) {
            setError("Les deux mots de passe ne correspondent pas.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        setIsSubmitting(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (updateError) {
            setError(updateError.message);
            setIsSubmitting(false);
            return;
        }

        setNewPassword("");
        setConfirmPassword("");
        setSuccessMessage("Votre mot de passe a bien été mis à jour.");
        setIsSubmitting(false);
    }

    return (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div>
                <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-zinc-900"
                >
                    Nouveau mot de passe
                </label>
                <div className="relative mt-1">
                    <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-12 text-sm text-zinc-900 shadow-sm transition focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label={showNewPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        aria-pressed={showNewPassword}
                        className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-zinc-600 transition hover:text-zinc-900"
                    >
                        {showNewPassword ? (
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
                <p className="mt-1 text-xs text-zinc-500">Au moins 6 caractères.</p>
            </div>

            <div>
                <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-zinc-900"
                >
                    Confirmer le nouveau mot de passe
                </label>
                <div className="relative mt-1">
                    <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-12 text-sm text-zinc-900 shadow-sm transition focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        aria-pressed={showConfirmPassword}
                        className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-zinc-600 transition hover:text-zinc-900"
                    >
                        {showConfirmPassword ? (
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

            {successMessage && (
                <p
                    role="status"
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
                >
                    {successMessage}
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
                {isSubmitting ? "Mise à jour…" : "Mettre à jour le mot de passe"}
            </button>
        </form>
    );
}

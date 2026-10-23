import "server-only";

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const resendFromEmail =
    process.env.RESEND_FROM_EMAIL ?? "Boutique <onboarding@resend.dev>";

// Adresse de réponse (boîte réelle) : un expéditeur `noreply` avec un
// Reply-To valide est mieux noté par les filtres anti-spam.
export const resendReplyTo = process.env.RESEND_REPLY_TO || undefined;
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthStateSync } from "@/components/shop/AuthStateSync";
import { Header } from "@/components/shop/Header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ma Boutique — Démo e-commerce",
  description:
    "Boutique en ligne de démonstration : catalogue, panier, paiement Stripe (mode test) et suivi des commandes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthStateSync />
        <Header />
        {children}
      </body>
    </html>
  );
}

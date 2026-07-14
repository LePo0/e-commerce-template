# Demo E-commerce

Boutique en ligne full-stack construite comme projet de démonstration — catalogue produits, panier, paiement sécurisé et gestion de commandes.

🔗 **Démo live** : [e-commerce-template-va8r.vercel.app](https://e-commerce-template-va8r.vercel.app/)

> Ce projet est un template de démonstration à but de portfolio. Les données produits sont fictives, le paiement fonctionne en mode test Stripe (aucune transaction réelle).

## Aperçu

- Catalogue produits avec fiches détaillées
- Ajout rapide au panier depuis la liste (façon Amazon)
- Panier persistant côté client (survit au rechargement de page)
- Authentification (inscription / connexion)
- Paiement sécurisé via Stripe Checkout, avec adresse de livraison et code promo
- Historique des commandes par utilisateur
- Email de confirmation automatique après achat

## Stack technique

| Domaine | Choix | Pourquoi |
|---|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) + TypeScript | SSR/SSG pour le SEO, API routes intégrées pour les webhooks |
| Style | [Tailwind CSS](https://tailwindcss.com/) | Développement rapide, cohérence visuelle |
| Base de données | [Supabase](https://supabase.com/) (Postgres) | Relationnel, nécessaire pour la cohérence commandes/stock |
| ORM | [Prisma](https://www.prisma.io/) | Typage automatique, migrations versionnées |
| Auth | Supabase Auth | Intégrée nativement à la base Postgres |
| State panier | [Zustand](https://github.com/pmndrs/zustand) + localStorage | Léger, pas de re-renders inutiles |
| Paiement | [Stripe Checkout](https://stripe.com/checkout) | Mode hébergé, sécurité déléguée à Stripe |
| Emails | [Resend](https://resend.com/) | API email simple pour Next.js |
| Hébergement | [Vercel](https://vercel.com/) | Déploiement natif Next.js |

## Points d'architecture notables

- **Sécurité des prix** : les prix ne transitent jamais depuis le client. La route `/api/checkout` ne reçoit que des identifiants produit et recalcule chaque montant côté serveur via Prisma avant de créer la session Stripe.
- **Webhook idempotent** : le traitement des événements Stripe (`checkout.session.completed`) vérifie l'existence préalable d'une commande via un identifiant de session unique, pour éviter les doublons en cas de rejeu du webhook.
- **Synchronisation Auth → base applicative** : un trigger Postgres synchronise automatiquement `auth.users` (géré par Supabase) vers la table applicative `users`, quel que soit le mode de création du compte.
- **Séparation Server/Client Components** : l'interactivité (boutons, formulaires) est isolée dans des Client Components ciblés, le reste du rendu reste côté serveur.

## Structure du projet

```
/app
  /(shop)
    /products          # Catalogue et fiches produit
    /orders             # Historique des commandes (utilisateur connecté)
  /(auth)
    /login
    /signup
  /api
    /checkout           # Création de session Stripe (calcul serveur)
    /webhooks/stripe     # Traitement des paiements confirmés
/components
  /shop                 # ProductCard, CartDrawer, AddToCartButton...
  /ui                   # Composants génériques
/lib
  /supabase              # Clients Supabase (browser + server)
  /store                 # Store Zustand (panier)
  prisma.ts              # Client Prisma singleton
  stripe.ts              # Client Stripe
  resend.ts              # Client email
/prisma
  schema.prisma
  seed.ts
```

## Installation en local

### Prérequis
- Node.js 18+
- Un compte [Supabase](https://supabase.com/) (gratuit)
- Un compte [Stripe](https://stripe.com/) en mode test (gratuit)
- Un compte [Resend](https://resend.com/) (gratuit)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) pour tester les webhooks en local

### 1. Cloner et installer

```bash
git clone https://github.com/LePo0/e-commerce-template.git
cd e-commerce-template
npm install
```

### 2. Variables d'environnement

Crée un fichier `.env.local` à la racine :

```env
# Base de données (Supabase → Settings → Database)
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...pooler.supabase.com:5432/postgres"

# Supabase (Settings → API)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Stripe (mode test — Developers → API keys)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Resend
RESEND_API_KEY="re_..."
```

### 3. Base de données

```bash
npx prisma migrate dev
npx prisma db seed
```

### 4. Lancer le serveur de développement

```bash
npm run dev
```

Dans un second terminal, pour tester les paiements en local :

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Le site est accessible sur [http://localhost:3000](http://localhost:3000).

### Carte de test Stripe

```
Numéro : 4242 4242 4242 4242
Date : n'importe quelle date future
CVC : n'importe quel 3 chiffres
```

## Roadmap

- [ ] Panel admin (gestion des rôles, suivi des commandes)
- [ ] Suivi d'expédition avec notifications email par statut
- [ ] Domaine d'envoi email personnalisé

## Licence

Projet de démonstration à but de portfolio — libre de réutilisation à titre d'exemple.
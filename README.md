# Demo E-commerce

Boutique en ligne full-stack construite comme projet de démonstration : catalogue produits, panier, paiement sécurisé, commande avec ou sans compte et suivi des commandes.

🔗 **Démo live** : [demo-eshop.vincent-angoulvant.fr](https://demo-eshop.vincent-angoulvant.fr/)

> **Projet de démonstration (portfolio).** Les produits sont fictifs et Stripe fonctionne en **mode test** : aucune transaction réelle.
> Pour payer, utilisez la carte de test **`4242 4242 4242 4242`**, une date d'expiration future et un CVC quelconque (l'indication est aussi affichée sur la page de paiement).

## Fonctionnalités

- Catalogue produits avec fiches détaillées
- Ajout rapide au panier depuis la liste
- Panier persistant côté client (survit au rechargement de page)
- Inscription avec confirmation du compte par e-mail, connexion, déconnexion
- Profil utilisateur avec changement de mot de passe
- État de connexion synchronisé sans rechargement de page
- Paiement via Stripe Checkout, avec adresse de livraison et codes promo
- **Commande invité** (sans compte) : la commande est rattachée automatiquement au compte créé ensuite avec le même e-mail, une fois celui-ci confirmé
- Historique des commandes pour les utilisateurs connectés
- E-mail de confirmation de commande envoyé depuis un domaine personnalisé

## Stack technique

| Domaine | Choix | Pourquoi |
|---|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript | Server Components, routes API intégrées pour les webhooks |
| Style | [Tailwind CSS 4](https://tailwindcss.com/) | Développement rapide, cohérence visuelle |
| Base de données | [Supabase](https://supabase.com/) (Postgres) | Relationnel, nécessaire pour la cohérence commandes / stock |
| ORM | [Prisma 7](https://www.prisma.io/) | Typage automatique, migrations versionnées |
| Auth | Supabase Auth | Intégrée nativement à la base Postgres |
| State panier | [Zustand 5](https://github.com/pmndrs/zustand) + localStorage | Léger, pas de re-renders inutiles |
| Paiement | [Stripe Checkout](https://stripe.com/payments/checkout) | Page hébergée, conformité PCI déléguée à Stripe |
| E-mails | [Resend](https://resend.com/) | API simple, domaine d'envoi vérifié (DKIM / SPF / DMARC) |
| Hébergement | [Vercel](https://vercel.com/) | Déploiement natif Next.js |

## Points d'architecture notables

- **Sécurité des prix** : les prix ne transitent jamais depuis le client. `/api/checkout` ne reçoit que des identifiants produit et des quantités, et relit chaque prix en base avant de créer la session Stripe.
- **Webhook idempotent** : `checkout.session.completed` vérifie qu'aucune commande n'existe déjà pour la session Stripe (`stripeSessionId` unique en base). Un rejeu du webhook ne crée donc pas de doublon.
- **Pas de survente** : la commande est créée dans une transaction qui revérifie le stock avant de le décrémenter de façon atomique (`stock = stock - n`).
- **E-mail découplé de la commande** : l'e-mail de confirmation part après le commit de la transaction. S'il échoue, l'erreur est journalisée mais la commande reste valide.
- **Commande invité sécurisée** : une commande sans compte enregistre `userId = NULL` et l'e-mail du client. Des triggers Postgres sur `auth.users` la rattachent au compte correspondant **uniquement quand l'e-mail est confirmé**. Ainsi, personne ne peut voir les commandes d'un autre en s'inscrivant avec son adresse.
- **E-mail du compte verrouillé** : pour un utilisateur connecté, la session Stripe reçoit `customer_email`. Stripe affiche l'e-mail du compte, pas celui que le navigateur a mémorisé.
- **Synchronisation Auth → base applicative** : un trigger Postgres copie `auth.users` (géré par Supabase) vers la table applicative `users`.
- **Session vérifiée côté serveur** : `proxy.ts` (l'ex-`middleware.ts` de Next 16) rafraîchit la session Supabase avec `getClaims()`, qui vérifie la signature du JWT. `getSession()` n'est jamais utilisé côté serveur.
- **Séparation Server / Client Components** : l'interactivité (panier, formulaires) est isolée dans de petits Client Components, le reste est rendu côté serveur.

## Parcours de paiement

```
Panier (Zustand)
   │  POST { productId, quantity }[]
   ▼
/api/checkout ── relit prix + stock en base ──► Stripe Checkout (page hébergée)
                                                     │ paiement validé
                                                     ▼
/api/webhooks/stripe ◄── checkout.session.completed (signature vérifiée)
   │  transaction : contrôle stock → Order (PAID) + OrderItems → décrément stock
   ▼
Resend ──► e-mail de confirmation au client
```

## Structure du projet

```
/app
  /(auth)
    /login, /signup          # Connexion / inscription
  /(shop)
    /products                # Catalogue et fiches produit
    /checkout/success        # Retour de Stripe, vidage du panier
    /orders                  # Historique des commandes (connecté)
    /profile                 # Profil et changement de mot de passe
  /api
    /checkout                # Création de la session Stripe (prix recalculés)
    /webhooks/stripe         # Paiements confirmés → commande + e-mail
    /auth/state              # État de connexion (synchro client)
/components/shop             # Header, CartDrawer, ProductCard, AddToCartButton…
/lib
  /hooks                     # Hooks React partagés
  /store                     # Store Zustand (panier)
  /supabase                  # Clients Supabase (navigateur + serveur)
  prisma.ts                  # Client Prisma singleton
  stripe.ts                  # Client Stripe (serveur)
  resend.ts                  # Client e-mail
/prisma
  schema.prisma
  /migrations                # Dont triggers SQL sur auth.users
  seed.ts                    # Produits de démo (idempotent)
/public/products             # Photos produits
/scripts
  test-webhook-local.mjs     # Simule un webhook Stripe signé en local
proxy.ts                     # Rafraîchissement de session Supabase
prisma.config.ts             # Config Prisma (URL de migration, seed)
```

## Installation en local

### Prérequis

- Node.js 20.9 ou plus
- Un projet [Supabase](https://supabase.com/) (gratuit)
- Un compte [Stripe](https://stripe.com/) en mode test (gratuit)
- Un compte [Resend](https://resend.com/) (gratuit)
- [Stripe CLI](https://docs.stripe.com/stripe-cli) pour recevoir les webhooks en local

### 1. Cloner et installer

```bash
git clone https://github.com/LePo0/e-commerce-template.git
cd e-commerce-template
npm install
```

### 2. Variables d'environnement

```bash
cp .env.example .env.local
```

Renseigner les valeurs dans `.env.local`. Chaque variable est commentée dans [.env.example](.env.example).

| Variable | Rôle |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Postgres Supabase : pooler (runtime) et connexion directe (migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client Supabase |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clés Stripe (test) |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Envoi des e-mails de commande |
| `RESEND_REPLY_TO` | Optionnel : adresse de réponse |
| `RESEND_DEV_FALLBACK_TO` | Optionnel, dev uniquement : redirige tous les e-mails vers cette adresse |

### 3. Base de données

```bash
npx prisma migrate deploy
npx prisma db seed
```

> Le seed est idempotent : il met à jour les produits existants (sans toucher au stock) et crée les manquants. On peut le relancer même quand des commandes existent.
>
> Utiliser `migrate deploy` et non `migrate dev` : certaines migrations créent des triggers sur `auth.users`, un schéma propre à Supabase qui n'existe pas dans la shadow database de `migrate dev`.

### 4. Lancer le projet

```bash
npm run dev
```

Dans un second terminal, pour recevoir les webhooks Stripe :

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Le secret `whsec_…` affiché par cette commande va dans `STRIPE_WEBHOOK_SECRET`.

Le site est accessible sur [http://localhost:3000](http://localhost:3000).

Pour tester le webhook sans passer par Stripe Checkout :

```bash
npm run test:webhook              # commande d'un utilisateur existant
npm run test:webhook -- --guest   # commande invité
```

> Ce script crée une vraie commande en base et décrémente le stock.

## Configuration des services

**Supabase** (Authentication)
- *Sign In / Providers → Email* : activer **Confirm email**. Le rattachement des commandes invité en dépend.
- *URL Configuration* : Site URL = URL du site, et ajouter `https://<domaine>/**` aux Redirect URLs.
- *Emails → SMTP Settings* (optionnel) : SMTP personnalisé pour envoyer les e-mails d'auth depuis son domaine.

**Stripe** (Developers → Webhooks → Add destination)
- Événement : `checkout.session.completed`
- URL : `https://<domaine>/api/webhooks/stripe` (sans redirection)
- Copier le *Signing secret* dans `STRIPE_WEBHOOK_SECRET`.

**Resend**
- Ajouter et vérifier le domaine d'envoi (enregistrements DKIM, SPF et MX fournis par Resend), et ajouter un enregistrement DMARC.
- Désactiver le suivi des clics et des ouvertures pour améliorer la délivrabilité.

## Déploiement (Vercel)

1. Importer le dépôt dans Vercel et renseigner toutes les variables d'environnement (sans `RESEND_DEV_FALLBACK_TO`).
2. Appliquer les migrations depuis son poste avec `npx prisma migrate deploy`. Le build Vercel ne lance que `prisma generate`.
3. Configurer le webhook Stripe et les URLs Supabase avec le domaine de production.
4. Redéployer après chaque modification de variable d'environnement.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npm run test:webhook` | Simule un `checkout.session.completed` signé (`-- --guest` pour une commande invité) |

## Roadmap

- [ ] Panel admin (gestion des rôles, suivi des commandes)
- [ ] Suivi d'expédition avec notifications e-mail par statut
- [ ] Tests automatisés et CI (lint, typecheck, tests)
- [x] Commande invité avec rattachement sécurisé au compte
- [x] Domaine d'envoi e-mail personnalisé

## Licence

[MIT](LICENSE) © Vincent Angoulvant

Les photos produits (`public/products/`) proviennent d'[Unsplash](https://unsplash.com/) et sont utilisées sous la [licence Unsplash](https://unsplash.com/license).

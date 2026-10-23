# Instructions pour GitHub Copilot — Projet E-commerce Démo

## Contexte du projet

Site e-commerce vitrine (catalogue, panier, paiement) construit comme projet
de démonstration pour un portfolio freelance. Le persona client est fictif.
Priorité : code propre et représentatif des bonnes pratiques, pas de
sur-ingénierie pour des features qui ne seront jamais utilisées en prod réelle.

## Stack technique

- **Framework** : Next.js 16 (App Router), React 19, TypeScript strict
- **Style** : Tailwind CSS 4
- **ORM** : Prisma 7 (config dans `prisma.config.ts`, client généré dans
  `app/generated/prisma`)
- **Base de données / Auth** : Supabase (Postgres + Supabase Auth)
- **State panier** : Zustand (persist middleware, localStorage)
- **Paiement** : Stripe Checkout (mode hébergé, pas Stripe Elements)
- **Emails** : Resend
- **Hébergement** : Vercel

## Conventions et règles impératives

### Prisma / Base de données
- Toujours utiliser `Decimal @db.Decimal(10,2)` pour les champs monétaires,
  jamais `Float` (problèmes de précision sur les montants).
- Le client Prisma est un singleton dans `lib/prisma.ts` — toujours l'importer
  depuis là, ne jamais instancier un nouveau `PrismaClient`.
- Après toute modification de `schema.prisma`, exécuter `npx prisma generate`
  PUIS redémarrer le serveur Next.js (le client généré est mis en cache en
  mémoire par le process).
- Deux URLs de connexion sont utilisées : `DATABASE_URL` (pooler, port 6543,
  requêtes runtime) et `DIRECT_URL` (connexion directe, port 5432,
  migrations uniquement). `prisma.config.ts` utilise `DIRECT_URL` pour
  Prisma Migrate.
- Appliquer les migrations avec `npx prisma migrate deploy` (le build
  Vercel ne lance que `prisma generate`, pas les migrations).
- Toute migration touchant au schéma `auth` de Supabase (triggers, fonctions
  sur `auth.users`) échoue avec `prisma migrate dev` à cause de la shadow
  database (le schéma `auth` n'y existe pas). Dans ce cas : donner le SQL
  séparément pour exécution manuelle dans le SQL Editor Supabase, puis
  `npx prisma migrate resolve --applied [nom_migration]`.
- Attention lors de la génération de SQL avec délimiteurs `$$` (fonctions
  Postgres) : vérifier qu'aucun espace ne s'est glissé (`$ $`) avant de
  l'exécuter dans Supabase.

### Sécurité paiement (Stripe)
- Ne jamais faire confiance à un prix envoyé depuis le client. Les routes API
  liées au paiement reçoivent uniquement `productId` + `quantity` ; le prix
  est toujours recalculé côté serveur via Prisma.
- Utiliser `client_reference_id` (pas `metadata`) pour transporter l'ID
  utilisateur dans une Stripe Checkout Session, et `customer_email` pour
  préremplir l'e-mail du compte connecté.

### Commande invité
- L'authentification est facultative au checkout. Sans compte :
  `Order.userId` est NULL et `Order.customerEmail` (e-mail saisi sur
  Stripe) reste la source de vérité du destinataire.
- Le rattachement d'une commande invité à un compte se fait UNIQUEMENT en
  SQL (fonction `public.link_guest_orders()` + triggers sur `auth.users`),
  et seulement pour un e-mail CONFIRMÉ. Ne jamais rattacher sur simple
  inscription : quelqu'un pourrait s'inscrire avec l'adresse d'un autre.
- La route webhook (`app/api/webhooks/stripe/route.ts`) doit lire le body
  avec `await req.text()` (jamais `req.json()`) pour préserver le body brut
  nécessaire à la vérification de signature.
- Le webhook doit être idempotent : vérifier l'existence d'une `Order` via
  `stripeSessionId` (champ `@unique`) en tout début de traitement, avant de
  créer quoi que ce soit ou de décrémenter du stock.

### Architecture Next.js App Router
- Isoler l'interactivité dans de petits Client Components (`"use client"`)
  plutôt que de convertir des pages entières. Exemple : bouton
  "Ajouter au panier" extrait en composant dédié, page produit qui l'englobe
  reste un Server Component.
- Deux clients Supabase distincts : `lib/supabase/client.ts` (Client
  Components, navigateur) et `lib/supabase/server.ts` (Server Components,
  cookies via `next/headers`). Ne jamais utiliser le client browser dans un
  Server Component ou inversement.
- `proxy.ts` à la racine (ex-`middleware.ts`, renommé en Next 16, export
  `proxy`) gère le rafraîchissement de session Supabase via `getClaims()`.
  Ne jamais utiliser `getSession()` côté serveur.

### Panier
- State géré exclusivement côté client (Zustand + localStorage), pas de
  synchronisation en base. Décision assumée pour ce projet de démo — ne pas
  proposer de migrer vers un panier serveur sans demande explicite.

### Images
- Placeholders via `picsum.photos` (format
  `https://picsum.photos/seed/[nom]/400/400`), domaine autorisé dans
  `next.config.ts` via `images.remotePatterns`. Pas de Supabase Storage tant
  qu'il n'y a pas de vrai besoin d'upload d'images par un admin.

### Emails
- E-mail de confirmation de commande envoyé via Resend depuis le webhook,
  APRÈS le commit de la transaction : un échec d'envoi est loggé mais ne
  fait pas échouer la commande.
- Expéditeur : `RESEND_FROM_EMAIL` (domaine vérifié
  `demo-eshop.vincent-angoulvant.fr`), réponse via `RESEND_REPLY_TO`
  optionnel. En dev, `RESEND_DEV_FALLBACK_TO` redirige les envois.
- Les e-mails d'auth (inscription, mot de passe) sont gérés par Supabase
  Auth, pas par le code.

## Ce qui est hors scope pour l'instant

Ne pas proposer spontanément, sauf demande explicite :
- Panel admin avec gestion de rôles (chantier à part, sera fait séparément)
- Suivi d'expédition/livraison réel avec emails de statut
- React Email ou tout système de templates email avancé (un seul email
  actuellement, HTML simple suffisant)

## Style de réponse attendu

- Toujours signaler explicitement quand une décision de sécurité ou
  d'architecture importante est prise (ex: recalcul de prix serveur,
  idempotence webhook).
- Préférer la solution la plus simple qui reste représentative des bonnes
  pratiques réelles, plutôt que la plus complète. C'est un projet de
  démonstration, pas un produit en production.
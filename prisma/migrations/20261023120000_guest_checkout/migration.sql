-- Commande invité (checkout sans compte)
--
-- Cette migration :
--   1. Ajoute `orders.customerEmail` (destinataire de l'e-mail de
--      confirmation) et le backfill depuis `users.email` pour les
--      commandes existantes.
--   2. Rend `orders.userId` nullable : NULL = commande invité.
--   3. Crée `public.link_guest_orders()` : rattache les commandes
--      invité au compte qui possède le même e-mail. SECURITY DEFINER +
--      `search_path = ''`, comme `handle_new_user`.
--   4. Attache deux triggers sur `auth.users` qui ne se déclenchent
--      que pour un e-mail CONFIRMÉ — sinon n'importe qui pourrait
--      s'inscrire avec l'adresse d'un autre et voir ses commandes.

-- 1. customerEmail + backfill.
ALTER TABLE "orders" ADD COLUMN "customerEmail" TEXT;

UPDATE "orders" o
SET "customerEmail" = u."email"
FROM "users" u
WHERE o."userId" = u."id";

ALTER TABLE "orders" ALTER COLUMN "customerEmail" SET NOT NULL;

-- 2. userId nullable.
ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL;

CREATE INDEX "orders_customerEmail_idx" ON "orders"("customerEmail");

-- 3. Fonction trigger.
CREATE OR REPLACE FUNCTION public.link_guest_orders() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = '' AS $function$ BEGIN
    IF NEW.email IS NULL THEN RETURN NEW;

END IF;

UPDATE public.orders
SET
    "userId" = NEW.id,
    "updatedAt" = now()
WHERE
    "userId" IS NULL
    AND lower("customerEmail") = lower(NEW.email);

RETURN NEW;

END;

$function$;

REVOKE EXECUTE ON FUNCTION public.link_guest_orders()
FROM
    PUBLIC;

-- 4. Triggers.
--  - Confirmation d'e-mail activée : le compte est créé non confirmé,
--    on rattache au moment où `email_confirmed_at` passe à non-NULL.
--  - Confirmation désactivée : le compte est confirmé dès l'INSERT.
--    Postgres exécute les triggers d'un même événement par ordre
--    alphabétique : `on_auth_user_created_link_orders` passe donc
--    après `on_auth_user_created`, qui a créé la ligne public.users
--    (nécessaire pour la FK orders.userId).
DO $trigger$
BEGIN
    IF to_regclass('auth.users') IS NULL THEN
        RAISE NOTICE 'auth.users absent: skipping guest orders link triggers setup.';
        RETURN;
    END IF;

    DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
    DROP TRIGGER IF EXISTS on_auth_user_created_link_orders ON auth.users;

    CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE OF email_confirmed_at
        ON auth.users FOR EACH ROW
        WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
        EXECUTE FUNCTION public.link_guest_orders();

    CREATE TRIGGER on_auth_user_created_link_orders
    AFTER INSERT
        ON auth.users FOR EACH ROW
        WHEN (NEW.email_confirmed_at IS NOT NULL)
        EXECUTE FUNCTION public.link_guest_orders();
END;
$trigger$;

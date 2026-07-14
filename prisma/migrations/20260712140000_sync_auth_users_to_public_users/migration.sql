-- Synchronise auth.users → public.users
--
-- Supabase Auth stocke ses utilisateurs dans `auth.users`. Notre modèle
-- Prisma pointe sur `public.users` (avec FK depuis `orders.userId`).
-- Sans mécanisme de synchro, aucun signup Supabase n'apparaît côté
-- Prisma et toute création d'Order échoue en violation de FK.
--
-- Cette migration :
--   1. Fait un backfill des `auth.users` existants (dont votre compte).
--   2. Crée `public.handle_new_user()` : fonction trigger SECURITY
--      DEFINER, avec `search_path = ''` et tables entièrement
--      qualifiées, pour empêcher les attaques par search_path.
--   3. Révoque EXECUTE à PUBLIC (une fonction SECURITY DEFINER dans
--      `public` est appelable par anon/authenticated par défaut — on
--      ne veut pas qu'elle soit invocable en dehors du trigger).
--   4. Attache le trigger AFTER INSERT sur `auth.users`.
--
-- Note : les utilisateurs sans email (signups par téléphone / SSO
-- sans email vérifié) sont ignorés car `public.users.email` est
-- NOT NULL + UNIQUE dans notre schéma.
-- 1. Backfill (idempotent grâce à ON CONFLICT).
DO $backfill$
BEGIN
    IF to_regclass('auth.users') IS NULL THEN
        RAISE NOTICE 'auth.users absent: skipping auth -> public users backfill.';
        RETURN;
    END IF;

    INSERT INTO
        public.users ("id", "email", "createdAt", "updatedAt")
    SELECT
        au.id,
        au.email,
        COALESCE(au.created_at, now()),
        now()
    FROM
        auth.users au
    WHERE
        au.email IS NOT NULL ON CONFLICT ("id") DO NOTHING;
END;
$backfill$;

-- 2. Fonction trigger.
CREATE
OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = '' AS $function$ BEGIN -- Skip si pas d'email (ex: signup par téléphone). Sinon on
    -- violerait NOT NULL / UNIQUE sur public.users.email.
    IF NEW.email IS NULL THEN RETURN NEW;

END IF;

INSERT INTO
    public.users ("id", "email", "createdAt", "updatedAt")
VALUES
    (
        NEW.id,
        NEW.email,
        COALESCE(NEW.created_at, now()),
        now()
    ) ON CONFLICT ("id") DO NOTHING;

RETURN NEW;

END;

$function$;

-- 3. Verrouille l'exécution : trigger only, jamais appelée directement.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
FROM
    PUBLIC;

-- 4. Trigger. DROP IF EXISTS pour permettre la ré-exécution locale.
DO $trigger$
BEGIN
    IF to_regclass('auth.users') IS NULL THEN
        RAISE NOTICE 'auth.users absent: skipping on_auth_user_created trigger setup.';
        RETURN;
    END IF;

    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

    CREATE TRIGGER on_auth_user_created
    AFTER INSERT
        ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END;
$trigger$;
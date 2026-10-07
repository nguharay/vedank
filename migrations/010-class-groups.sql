-- Groups (teams) inside a class. A teacher splits the roster into a few
-- groups, can move children between them, and awards stars to a group.
-- A child belongs to at most one group per class (class_members.group_id);
-- deleting a group just leaves its children ungrouped.
-- Applied at build time by scripts/migrate.ts.
DO $$
BEGIN
  IF to_regclass('public.classrooms') IS NULL THEN RETURN; END IF;
  CREATE TABLE IF NOT EXISTS class_groups (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id   uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    name       text NOT NULL,
    emoji      text NOT NULL DEFAULT '⭐',
    color      text NOT NULL DEFAULT '#7a58c0',
    stars      integer NOT NULL DEFAULT 0,
    sort       integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS class_groups_class_idx ON class_groups(class_id);
  ALTER TABLE class_members ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES class_groups(id) ON DELETE SET NULL;
END
$$;

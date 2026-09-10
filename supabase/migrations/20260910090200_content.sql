-- ============================================================================
-- 0003 - Learning content.
--
-- Shape:  categories -> modules -> lessons -> content_blocks
--         learning_paths -> learning_path_items -> (module | assessment)
--
-- Naming note: the DB calls the top-level unit a "module" (§11). The UI calls
-- the same thing a "Material" because that is the word the sidebar uses (§7).
-- One concept, two audiences; the mapping lives in the service layer.
-- ============================================================================

-- ------------------------------------------------------------- categories --

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(trim(name)) between 1 and 80),
  description text not null default '',
  -- Token name, not a hex value: the theme resolves it, so dark mode keeps
  -- working and a category cannot introduce an off-palette colour.
  accent      text not null default 'slate'
                check (accent in ('green','blue','amber','violet','rose','slate')),
  icon        text not null default 'BookMarked',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index categories_sort_idx on public.categories (sort_order, name);

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- modules --

create table public.modules (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text not null check (length(trim(title)) between 1 and 160),
  description   text not null default '',
  category_id   uuid references public.categories (id) on delete set null,

  module_number int  not null default 0,
  status        public.content_status not null default 'draft',
  difficulty    public.difficulty     not null default 'foundation',
  duration_minutes int not null default 0 check (duration_minutes >= 0),

  -- Who may see it, and which teams it is aimed at. Empty audience would hide
  -- a module from everyone, which is never intended, so it is disallowed.
  audience      public.user_role[] not null default array['admin','sales']::public.user_role[]
                  check (cardinality(audience) > 0),
  teams         text[] not null default '{}',
  tags          text[] not null default '{}',

  thumbnail_url text,
  icon          text,

  -- §44: set when the body contains an earnings/ROI style claim that management
  -- has not signed off. The UI badges it; it does not block publishing.
  needs_claim_review boolean not null default false,

  version       int  not null default 1 check (version >= 1),
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,
  published_by  uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,

  -- A module cannot claim to be published without a publication timestamp;
  -- reports group by published_at and a null there would silently drop rows.
  constraint modules_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create index modules_status_idx     on public.modules (status);
create index modules_category_idx   on public.modules (category_id);
create index modules_number_idx     on public.modules (module_number);
create index modules_updated_idx    on public.modules (updated_at desc);
-- Serves the library list, which is always filtered to published first.
create index modules_status_cat_idx on public.modules (status, category_id);
create index modules_title_trgm_idx on public.modules using gin (title extensions.gin_trgm_ops);
create index modules_tags_idx       on public.modules using gin (tags);

create trigger modules_set_updated_at before update on public.modules
  for each row execute function public.set_updated_at();

-- Stamps published_at/published_by the first time a module goes live, and
-- bumps version on every content-affecting edit (§58). Doing this in the
-- database means the metadata is right regardless of which client wrote.
create or replace function public.modules_publish_metadata()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and coalesce(old.status, 'draft') <> 'published' then
    new.published_at := coalesce(new.published_at, now());
    new.published_by := coalesce(new.published_by, auth.uid());
  end if;

  -- Republishing an archived module should not reset its original date, so
  -- published_at is never cleared here - only archived status changes.
  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.status is distinct from old.status then
    new.version := old.version + 1;
  end if;

  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create trigger modules_publish_metadata
  before update on public.modules
  for each row execute function public.modules_publish_metadata();

-- ---------------------------------------------------------------- lessons --

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules (id) on delete cascade,
  title       text not null check (length(trim(title)) between 1 and 160),
  summary     text not null default '',
  -- Position within the module. Unique per module so two lessons can never
  -- occupy the same slot and render in an arbitrary order.
  sort_order  int  not null default 0,
  status      public.content_status not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint lessons_unique_order unique (module_id, sort_order) deferrable initially deferred
);

create index lessons_module_idx on public.lessons (module_id, sort_order);

create trigger lessons_set_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------- content_blocks --

-- One row per block (§14) rather than one HTML blob per lesson. The typed
-- column drives the renderer; `data` carries the shape that type requires.
-- Validation of `data` lives in the Zod schemas shared by editor and seed -
-- Postgres enforces the envelope, the application enforces the payload.
create table public.content_blocks (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  type       public.block_type not null,
  data       jsonb not null default '{}'::jsonb,
  sort_order int   not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint content_blocks_unique_order unique (lesson_id, sort_order) deferrable initially deferred
);

create index content_blocks_lesson_idx on public.content_blocks (lesson_id, sort_order);

create trigger content_blocks_set_updated_at before update on public.content_blocks
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------- learning paths --

create table public.learning_paths (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null check (length(trim(title)) between 1 and 160),
  description text not null default '',
  audience    public.user_role[] not null default array['admin','sales']::public.user_role[],
  accent      text not null default 'slate'
                check (accent in ('green','blue','amber','violet','rose','slate')),
  status      public.content_status not null default 'draft',
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  published_at timestamptz
);

create index learning_paths_status_idx on public.learning_paths (status);

create trigger learning_paths_set_updated_at before update on public.learning_paths
  for each row execute function public.set_updated_at();

-- A path step is either a module or an assessment, never both and never
-- neither - enforced below rather than left to the application.
create table public.learning_path_items (
  id         uuid primary key default gen_random_uuid(),
  path_id    uuid not null references public.learning_paths (id) on delete cascade,
  module_id  uuid references public.modules (id) on delete cascade,
  -- FK added in 0005, once assessments exists.
  assessment_id uuid,
  sort_order int not null default 0,
  required   boolean not null default true,

  constraint path_item_exactly_one_target check (
    (module_id is not null)::int + (assessment_id is not null)::int = 1
  ),
  constraint learning_path_items_unique_order unique (path_id, sort_order) deferrable initially deferred
);

create index learning_path_items_path_idx on public.learning_path_items (path_id, sort_order);

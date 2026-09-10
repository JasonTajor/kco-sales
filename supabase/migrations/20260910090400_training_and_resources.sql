-- ============================================================================
-- 0005 - Training activities, practice scenarios, and the sales resource
--        libraries (objections, scripts, wording, quick reference, Sales Bible,
--        competencies).
--
-- These are all admin-authored reference content with the same lifecycle as a
-- module, so they share the content_status enum and the published/draft rules.
-- ============================================================================

-- ----------------------------------------------------- training activities --

create table public.training_activities (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title            text not null check (length(trim(title)) between 1 and 160),
  objective        text not null default '',
  description      text not null default '',
  duration_minutes int  not null default 15 check (duration_minutes > 0),
  participants     text not null default '',
  difficulty       public.difficulty not null default 'foundation',
  instructions     text[] not null default '{}',
  facilitator_notes text[] not null default '{}',
  expected_outcome text not null default '',
  materials        text[] not null default '{}',
  tags             text[] not null default '{}',
  category_id      uuid references public.categories (id) on delete set null,
  status           public.content_status not null default 'draft',
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index training_activities_status_idx on public.training_activities (status);
create index training_activities_tags_idx   on public.training_activities using gin (tags);

create trigger training_activities_set_updated_at before update on public.training_activities
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------ practice scenarios --

-- §21: seeded with scripted branches today. `turns` is jsonb precisely so an
-- AI roleplay engine can later generate turns at runtime without a migration -
-- the table shape does not encode the assumption that they are pre-written.
create table public.practice_scenarios (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  channel     text not null check (channel in ('phone','chat','objection')),
  personality text not null,
  difficulty  public.difficulty not null default 'foundation',
  setup       text not null default '',
  goal        text not null default '',
  turns       jsonb not null default '[]'::jsonb,
  coaching    text[] not null default '{}',
  status      public.content_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index practice_scenarios_status_idx on public.practice_scenarios (status);

create trigger practice_scenarios_set_updated_at before update on public.practice_scenarios
  for each row execute function public.set_updated_at();

-- Records a run so "practice regular" progress and admin reporting have data.
create table public.scenario_runs (
  id          uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.practice_scenarios (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  best_count  int not null default 0,
  turn_count  int not null default 0,
  completed_at timestamptz not null default now()
);

create index scenario_runs_user_idx on public.scenario_runs (user_id, completed_at desc);

-- --------------------------------------------------------------- objections --

create table public.objections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  objection   text not null,
  -- The concern underneath the words - the thing the rep actually answers.
  translation text not null default '',
  category    text not null default 'price'
                check (category in ('price','risk','capability','competition','capital','timing','market')),
  frequency   text not null default 'medium'
                check (frequency in ('very-high','high','medium','low')),
  difficulty  public.difficulty not null default 'foundation',

  -- A.C.A.C. (§23). Stored as four columns rather than one blob because the
  -- resource page renders them as four labelled steps and admins edit them
  -- individually.
  acknowledge text not null default '',
  clarify     text not null default '',
  address     text not null default '',
  close       text not null default '',

  pitfalls    text[] not null default '{}',
  notes       text not null default '',
  -- §44: the answer touches earnings/ROI and must stay illustrative.
  claim_sensitive boolean not null default false,
  status      public.content_status not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index objections_category_idx on public.objections (category);
create index objections_status_idx   on public.objections (status);
create index objections_trgm_idx     on public.objections using gin (objection extensions.gin_trgm_ops);

create trigger objections_set_updated_at before update on public.objections
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ scripts --

-- §24: scripts live in the database, never inside a React component, so an
-- admin can fix wording without a deploy.
create table public.scripts (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  kind       text not null check (kind in
               ('phone','chat','closing','qualification','follow-up','complaint','wording')),
  channel    text not null default 'both' check (channel in ('phone','chat','both')),
  situation  text not null default '',
  language   text not null default 'mixed' check (language in ('en','fil','mixed')),
  lines      text[] not null default '{}',
  notes      text not null default '',
  tags       text[] not null default '{}',
  status     public.content_status not null default 'published',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scripts_kind_idx   on public.scripts (kind, sort_order);
create index scripts_status_idx on public.scripts (status);
create index scripts_trgm_idx   on public.scripts using gin (title extensions.gin_trgm_ops);

create trigger scripts_set_updated_at before update on public.scripts
  for each row execute function public.set_updated_at();

-- Avoid/use pairs for professional wording.
create table public.wording_pairs (
  id      uuid primary key default gen_random_uuid(),
  avoid   text not null,
  use     text not null,
  context text not null default 'both' check (context in ('phone','chat','both')),
  note    text not null default '',
  tags    text[] not null default '{}',
  sort_order int not null default 0,
  status  public.content_status not null default 'published'
);

-- ---------------------------------------------------------- quick reference --

create table public.quick_reference_items (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  kicker     text not null default '',
  kind       text not null check (kind in ('script','formula','checklist','rule')),
  channel    text not null default 'both' check (channel in ('phone','chat','both')),
  -- Same block vocabulary as a lesson, so the renderer is shared.
  blocks     jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  status     public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quick_reference_status_idx on public.quick_reference_items (status, sort_order);

create trigger quick_reference_set_updated_at before update on public.quick_reference_items
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- sales bible --

-- §45/§78. Sections are seeded; entries are deliberately allowed to be empty
-- so the UI can show "Content not yet configured" instead of an invented price.
create table public.sales_bible_sections (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  summary    text not null default '',
  sort_order int not null default 0
);

create table public.sales_bible_entries (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sales_bible_sections (id) on delete cascade,
  label      text not null,
  -- Null (not empty string) means "no verified value has been supplied".
  -- The distinction matters: it is what the UI keys off to render the
  -- "Admin content required" state rather than a blank line (§78).
  value      text,
  detail     text not null default '',
  -- True once management has confirmed the value is accurate and publishable.
  verified   boolean not null default false,
  requires_approval boolean not null default false,
  sort_order int not null default 0,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index sales_bible_entries_section_idx on public.sales_bible_entries (section_id, sort_order);

create trigger sales_bible_entries_set_updated_at before update on public.sales_bible_entries
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ competencies --

-- §31/§32: the 1-5 scale is a property of the framework, so the level labels
-- live in their own table rather than being hard-coded in the report page.
create table public.competency_levels (
  level int primary key check (level between 1 and 5),
  label text not null,
  description text not null default ''
);

create table public.competencies (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  definition  text not null default '',
  cluster     text not null default 'sales'
                check (cluster in ('core','sales','chat','service')),
  behavioral_indicators text[] not null default '{}',
  sort_order  int not null default 0,
  status      public.content_status not null default 'published'
);

create table public.user_competencies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  competency_id uuid not null references public.competencies (id) on delete cascade,
  level         int  not null check (level between 1 and 5),
  assessed_by   uuid references public.profiles (id) on delete set null,
  note          text not null default '',
  assessed_at   timestamptz not null default now(),

  constraint user_competencies_unique unique (user_id, competency_id)
);

create index user_competencies_user_idx on public.user_competencies (user_id);

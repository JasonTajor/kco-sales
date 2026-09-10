-- Emits a Supabase-shaped `Database` type by reading the catalog.
-- Consumed by scripts/gen-db-types.sh; not part of the migration set.
\pset tuples_only on
\pset format unaligned

with
-- Map Postgres types onto TypeScript. Anything unrecognised becomes unknown
-- rather than any, so a new column type shows up as a compile error instead
-- of silently widening the model.
ts as (
  select 'uuid' as pg, 'string' as ts union all
  select 'text', 'string' union all
  select 'character varying', 'string' union all
  select 'integer', 'number' union all
  select 'bigint', 'number' union all
  select 'smallint', 'number' union all
  select 'numeric', 'number' union all
  select 'double precision', 'number' union all
  select 'boolean', 'boolean' union all
  select 'timestamp with time zone', 'string' union all
  select 'timestamp without time zone', 'string' union all
  select 'date', 'string' union all
  select 'jsonb', 'Json' union all
  select 'json', 'Json'
),
cols as (
  select
    c.table_name,
    c.column_name,
    c.ordinal_position,
    c.is_nullable = 'YES' as nullable,
    -- A column with a default or an identity may be omitted on insert.
    (c.column_default is not null or c.is_identity = 'YES') as has_default,
    case
      when c.data_type = 'ARRAY' then
        coalesce(
          (select t.ts from ts t where t.pg = ltrim(c.udt_name, '_')),
          case when exists (select 1 from pg_type pt
                             where pt.typname = ltrim(c.udt_name, '_') and pt.typtype = 'e')
               then format('Database["public"]["Enums"][%L]', ltrim(c.udt_name, '_'))
               else 'unknown' end
        ) || '[]'
      else
        coalesce(
          (select t.ts from ts t where t.pg = c.data_type),
          case when exists (select 1 from pg_type pt
                             where pt.typname = c.udt_name and pt.typtype = 'e')
               then format('Database["public"]["Enums"][%L]', c.udt_name)
               else 'unknown' end
        )
    end as ts_type
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public'
    and t.table_type in ('BASE TABLE', 'VIEW')
),
rels as (
  select
    src.relname as table_name,
    string_agg(
      format(E'          {\n            foreignKeyName: %L\n            columns: [%s]\n            isOneToOne: %s\n            referencedRelation: %L\n            referencedColumns: [%s]\n          }',
        c.conname,
        (select string_agg(format('%L', a.attname), ', ' order by k.ord)
           from unnest(c.conkey) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum),
        -- One-to-one when the referencing columns are themselves unique.
        case when exists (
          select 1 from pg_index i
           where i.indrelid = c.conrelid and i.indisunique
             and i.indnatts = cardinality(c.conkey)
             and i.indkey::int2[] @> c.conkey and c.conkey @> i.indkey::int2[]
        ) then 'true' else 'false' end,
        tgt.relname,
        (select string_agg(format('%L', a.attname), ', ' order by k.ord)
           from unnest(c.confkey) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum)
      ), E',\n' order by c.conname) as body
  from pg_constraint c
  join pg_class src on src.oid = c.conrelid
  join pg_class tgt on tgt.oid = c.confrelid
  join pg_namespace n on n.oid = src.relnamespace
  where c.contype = 'f' and n.nspname = 'public'
  group by src.relname
),
kinds as (
  select table_name, table_type from information_schema.tables
   where table_schema = 'public'
),
tables as (
  select table_name,
    string_agg(format('          %s%s: %s%s',
        column_name,
        case when nullable or has_default then '?' else '' end,
        ts_type,
        case when nullable then ' | null' else '' end),
      E'\n' order by ordinal_position) filter (where true) as insert_body,
    string_agg(format('          %s: %s%s',
        column_name, ts_type, case when nullable then ' | null' else '' end),
      E'\n' order by ordinal_position) as row_body,
    string_agg(format('          %s?: %s%s',
        column_name, ts_type, case when nullable then ' | null' else '' end),
      E'\n' order by ordinal_position) as update_body
  from cols group by table_name
),
base_tables as (
  select t.* from tables t
   join kinds k on k.table_name = t.table_name and k.table_type = 'BASE TABLE'
),
views as (
  select t.* from tables t
   join kinds k on k.table_name = t.table_name and k.table_type = 'VIEW'
),
-- Callable RPCs. Without these, supabase-js types every rpc() argument as
-- `undefined` and a wrong parameter name compiles cleanly.
funcs as (
  select
    p.proname,
    case
      when p.proretset then 'unknown[]'
      else coalesce(
        (select t.ts from ts t where t.pg = format_type(p.prorettype, null)),
        'unknown')
    end as ret,
    coalesce(
      string_agg(
        format('          %s%s: %s',
          a.argname,
          case when a.has_default then '?' else '' end,
          coalesce((select t.ts from ts t where t.pg = a.argtype),
                   case when exists (select 1 from pg_type pt
                                      where pt.typname = a.argudt and pt.typtype = 'e')
                        then format('Database["public"]["Enums"][%L]', a.argudt)
                        when a.argtype like '%[]' then 'string[]'
                        else 'unknown' end)
      || ' | null'),
        E'\n' order by a.ord) filter (where a.ord is not null),
      '') as args
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  left join lateral (
    select
      i as ord,
      coalesce(p.proargnames[i], 'arg' || i) as argname,
      format_type(p.proargtypes[i - 1], null) as argtype,
      (select typname from pg_type where oid =
         coalesce((select typelem from pg_type where oid = p.proargtypes[i - 1] and typelem <> 0),
                  p.proargtypes[i - 1])) as argudt,
      i > (p.pronargs - p.pronargdefaults) as has_default
    from generate_series(1, p.pronargs) i
  ) a on true
  where n.nspname = 'public'
    and p.prokind = 'f'
    -- Trigger functions are fired by the database, never called by a client.
    and p.prorettype <> 'trigger'::regtype
    and p.proname not in ('set_updated_at')
  group by p.proname, p.pronargs, p.proretset, p.prorettype
),
enums as (
  select t.typname,
    string_agg(format('%L', e.enumlabel), ' | ' order by e.enumsortorder) as labels
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  group by t.typname
)
select
E'/* ---------------------------------------------------------------------------\n   GENERATED FILE - do not edit by hand.\n\n   Produced from the migrations in supabase/migrations by:\n       ./scripts/gen-db-types.sh\n\n   Regenerate after any schema change so the client and the database cannot\n   drift apart.\n--------------------------------------------------------------------------- */\n\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]\n\nexport interface Database {\n  public: {\n    Tables: {\n'
|| (select string_agg(
     format(E'      %s: {\n        Row: {\n%s\n        }\n        Insert: {\n%s\n        }\n        Update: {\n%s\n        }\n        Relationships: [%s]\n      }',
            t.table_name, t.row_body, t.insert_body, t.update_body,
            coalesce((select E'\n' || r.body || E'\n        ' from rels r
                       where r.table_name = t.table_name), '')),
     E'\n' order by t.table_name) from base_tables t)
|| E'\n    }\n'
|| E'    Views: {\n'
|| coalesce((select string_agg(
     format(E'      %s: {\n        Row: {\n%s\n        }\n        Relationships: []\n      }',
            table_name, row_body),
     E'\n' order by table_name) from views), '')
|| E'\n    }\n'
|| E'    Functions: {\n'
|| (select string_agg(
     format(E'      %s: {\n        Args: %s\n        Returns: %s\n      }',
            proname,
            case when args = '' then 'Record<string, never>'
                 else E'{\n' || args || E'\n        }' end,
            ret),
     E'\n' order by proname) from funcs)
|| E'\n    }\n'
|| E'    Enums: {\n'
|| (select string_agg(format('      %s: %s', typname, labels), E'\n' order by typname) from enums)
|| E'\n    }\n'
|| E'    CompositeTypes: Record<string, never>\n'
|| E'  }\n}\n'
|| E'\n'
|| E'/** Convenience aliases so call sites read as domain types, not table lookups. */\n'
|| E'export type Tables<T extends keyof Database[\'public\'][\'Tables\']> =\n'
|| E'  Database[\'public\'][\'Tables\'][T][\'Row\']\n'
|| E'export type Insertable<T extends keyof Database[\'public\'][\'Tables\']> =\n'
|| E'  Database[\'public\'][\'Tables\'][T][\'Insert\']\n'
|| E'export type Updatable<T extends keyof Database[\'public\'][\'Tables\']> =\n'
|| E'  Database[\'public\'][\'Tables\'][T][\'Update\']\n'
|| E'export type Enums<T extends keyof Database[\'public\'][\'Enums\']> =\n'
|| E'  Database[\'public\'][\'Enums\'][T]\n';

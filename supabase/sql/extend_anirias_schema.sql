-- Schema extension for ANIRIAS (non-destructive)
alter table public.animes
  add column if not exists slug text,
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

create unique index if not exists animes_slug_unique on public.animes (slug);

alter table public.seasons
  add column if not exists anilist_id integer,
  add column if not exists title_override text,
  add column if not exists year integer,
  add column if not exists episode_count integer;

alter table public.episodes
  add column if not exists season_number integer,
  add column if not exists video_url text,
  add column if not exists duration integer;

update public.episodes e
set season_number = s.season_number
from public.seasons s
where e.season_id = s.id
  and e.season_number is null;

update public.episodes
set duration = duration_seconds
where duration is null
  and duration_seconds is not null;

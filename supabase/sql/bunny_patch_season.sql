-- Function: bunny_patch_season(anime_id uuid, season_number int, overwrite bool default false) -> integer (rows updated)
create or replace function public.bunny_patch_season(
  p_anime_id uuid,
  p_season_number integer,
  p_overwrite boolean default false
)
returns integer
language plpgsql
as $$
declare
  updated_count integer := 0;
begin
  update episodes e
  set
    video_url = format(
      'https://anirias-videos.b-cdn.net/%s/season-%s/episode-%s.mp4',
      a.slug,
      s.season_number,
      lpad(e.episode_number::text, 2, '0')
    ),
    updated_at = now()
  from seasons s
  join animes a on a.id = s.anime_id
  where e.season_id = s.id
    and e.anime_id = p_anime_id
    and s.season_number = p_season_number
    and a.slug is not null
    and (
      p_overwrite = true
      or e.video_url is null
    );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

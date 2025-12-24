-- Function: patch_episode_videos(anime_id uuid) -> integer (rows updated)
create or replace function public.patch_episode_videos(p_anime_id uuid)
returns integer
language plpgsql
as $$
declare
  updated_count integer := 0;
  v1 integer := 0;
  v2 integer := 0;
begin
  -- Build expected path pattern
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
    and a.slug is not null
    and (
      e.video_url is null
      or e.video_url not like concat('https://anirias-videos.b-cdn.net/', a.slug, '/season-', s.season_number::text, '/episode-', lpad(e.episode_number::text, 2, '0'), '.mp4')
      or e.video_url like '%//%'
    );

  get diagnostics v1 = row_count;

  -- Patch stream_url from video_url
  update episodes
  set stream_url = video_url,
      updated_at = now()
  where anime_id = p_anime_id
    and stream_url is null
    and video_url is not null;

  get diagnostics v2 = row_count;

  updated_count := coalesce(v1,0) + coalesce(v2,0);

  return updated_count;
end;
$$;

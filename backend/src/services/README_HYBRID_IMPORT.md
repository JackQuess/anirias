# Hybrid Anime Import System

## Overview

This hybrid import system uses **AniList + MyAnimeList** with **Supabase as the SINGLE SOURCE OF TRUTH**.

### Data Sources

1. **AniList**:
   - Metadata (title, description, cover, banner, genres, year, format)
   - Episode ranges (episode_start/episode_end) for season detection
   - Relations (SEQUEL/PREQUEL) for multi-season detection

2. **MyAnimeList**:
   - Episode count validation ONLY
   - Soft validation (logs warnings, doesn't modify data)

3. **Supabase**:
   - Authoritative source for all seasons and episodes
   - Frontend MUST render from Supabase only

## Critical Rules

✅ **DO:**
- Fetch episodes by `anime_id` only
- Group episodes by `season_number` in frontend
- Create seasons in Supabase first
- Use AniList ranges as helpers only
- Log MAL validation mismatches

❌ **DON'T:**
- Trust external APIs for season/episode counts
- Create episodes with NULL `season_number`
- Hide episodes based on `video_url` being NULL
- Derive seasons from AniList in frontend
- Auto-modify Supabase based on MAL mismatches

## Import Flow

### STEP 1: Anime Creation
- Create/update anime in Supabase
- Save `anilist_id` and `animely_slug`
- Store metadata from AniList

### STEP 2: Season Resolution (Priority)
1. **Existing seasons in Supabase** (highest priority)
2. **AniList episode ranges** (if no existing seasons)

### STEP 3: Episode Generation
- Generate episodes for each season using AniList ranges
- Insert into Supabase `episodes` table
- Never skip episode creation based on CDN checks

### STEP 4: MAL Validation (Soft Check)
- Fetch MAL episode_count
- Compare with Supabase total
- Log warnings if mismatch
- **DO NOT** modify Supabase automatically

## API Usage

### POST `/api/admin/hybrid-import`

```json
{
  "anilistId": 12345,
  "malId": 67890,  // optional
  "animelySlug": "naruto"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "animeId": "uuid",
  "seasonsCreated": 1,
  "episodesCreated": 12,
  "warnings": [],
  "malValidation": {
    "isValid": true,
    "malCount": 12,
    "supabaseCount": 12
  }
}
```

## Frontend Integration

The frontend already renders correctly:
- ✅ Episodes fetched by `anime_id` only
- ✅ Grouped by `season_number` in frontend
- ✅ Season tabs generated from episode data
- ✅ Empty state only shows when `episodes.length === 0`

## Notes

- MAL ID storage is commented out (column may not exist in schema)
- AniList relations detection can be enhanced to fetch related media
- Season 0 (prequels) is supported but normalized to start from Season 1
- Specials, ONA, OVA are filtered unless explicitly selected


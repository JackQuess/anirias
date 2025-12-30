# ANIRIAS Calendar System Documentation

## Overview

The ANIRIAS calendar system is now fully connected and automated. This document explains how it works and the changes made.

## System Architecture

### 1. Public Calendar (`/calendar`)
- **Purpose**: Display upcoming episodes to users
- **Data Source**: `episodes` table where `air_date IS NOT NULL`
- **Query**: `db.getCalendar()` in `frontend/src/services/db.ts`
- **UI**: Shows anime poster, title, episode number, season number, air time
- **Filtering**: Groups by day (Today, Tomorrow, + 5 more days)

### 2. Admin Calendar (`/admin/calendar`)
- **Purpose**: Manage episode status and scheduling
- **Data Source**: All episodes from `episodes` table
- **Query**: `db.getCalendarEpisodes()` in `frontend/src/services/db.ts`
- **Features**: 
  - Edit episode status (waiting, published, airing)
  - Set air_date and time
  - Add short notes
  - Manual management interface

### 3. Auto-Population System

Episodes automatically appear in the calendar when:
- A new episode is created in the database
- An episode's `air_date` field is set

**No separate calendar table needed** - the calendar reads directly from the `episodes` table.

## Automation Services

### 1. Animely Watcher (`backend/src/services/animelyWatcher.ts`)
- **Purpose**: Detect new episodes for existing anime
- **Frequency**: Runs every 30 minutes
- **Process**:
  1. Fetches all anime in database (last 100)
  2. Checks AniList airing schedule for new episodes
  3. Creates new episodes with `status='pending_download'`
  4. Sets `air_date` from AniList `airingAt` timestamp
  5. Notifies admin

**Safety Features**:
- Non-blocking: Errors don't stop the pipeline
- Fail-safe: If AniList fails, continues to next anime
- No duplicate detection: Only creates episodes that don't exist

### 2. Auto Download Worker (`backend/src/services/autoDownloadWorker.ts`)
- **Purpose**: Automatically download pending episodes
- **Frequency**: Runs every 15 minutes
- **Process**:
  1. Finds all episodes with `status='pending_download'`
  2. Groups by anime_id
  3. Triggers `processDownloadQueue` for each anime
  4. Rate limited: 5 seconds between anime

**Safety Features**:
- Concurrent run prevention: Only one instance runs at a time
- Error isolation: Failure on one anime doesn't affect others
- Rate limiting: Prevents server overload

### 3. Notification Worker (`backend/src/services/notificationWorker.ts`)
- **Purpose**: Create user notifications for upcoming/released episodes
- **Frequency**: Runs every 5 minutes
- **Process**:
  1. Finds episodes airing in next 30 minutes → "upcoming" notification
  2. Finds episodes that aired → "released" notification
  3. Only notifies users following the anime

### 4. Admin Notification System (`backend/src/services/adminNotifications.ts`)
- **Purpose**: Notify admins of system events
- **Triggers**:
  - New anime detected
  - New episode added
  - Import success/warning
  - Download failures
  - System errors

## Data Flow

```
1. AniList Airing Schedule
   ↓
2. Animely Watcher (every 30 min)
   ↓
3. Create Episode (status='pending_download', air_date set)
   ↓
4. Auto Download Worker (every 15 min)
   ↓
5. processDownloadQueue → Download → Upload to Bunny
   ↓
6. Episode status → 'ready'
   ↓
7. Notification Worker (every 5 min)
   ↓
8. User Notifications (upcoming/released)
   ↓
9. Public Calendar Display (/calendar)
```

## Database Schema

### Episodes Table (Key Fields)
- `id`: UUID
- `anime_id`: UUID (references animes)
- `season_id`: UUID (references seasons)
- `episode_number`: INTEGER
- `season_number`: INTEGER
- `status`: TEXT (pending_download, downloading, ready, released, etc.)
- `air_date`: TIMESTAMP (when episode airs - nullable)
- `short_note`: TEXT (optional note for calendar)
- `created_at`: TIMESTAMP

### Admin Notifications Table
- `id`: UUID
- `type`: TEXT (info, warning, error)
- `title`: TEXT
- `message`: TEXT
- `source`: TEXT (animely, system, downloader, import)
- `read`: BOOLEAN
- `metadata`: JSONB
- `created_at`: TIMESTAMP

## Admin Interface

### `/admin/calendar`
Admins can:
- View all episodes with their statuses
- Edit episode air_date
- Change episode status
- Add short notes
- See anime poster and title

### Admin Panel Bell Icon
- Shows unread notification count
- Dropdown with recent notifications
- Click to mark as read
- Auto-refresh every 30 seconds

## Safety & Error Handling

### Non-Blocking Architecture
- All workers run independently
- Errors in one worker don't affect others
- Pipeline continues even if external APIs fail

### Fallback Strategy
1. **Primary**: AniList airing schedule
2. **Fallback**: Manual admin entry
3. **Never block**: If detection fails, admin can add manually

### Error Notification
- All errors create admin notifications
- Logged to console for debugging
- System continues operation

### Rate Limiting
- Animely Watcher: 30 min intervals
- Auto Download Worker: 15 min intervals, 5 sec between anime
- Notification Worker: 5 min intervals

## Manual Override

Admins can always:
1. Manually create episodes in `/admin/animes/:id`
2. Set air_date in `/admin/calendar`
3. Change episode status at any time
4. Add/edit short notes

**Automated system respects manual changes** - it won't overwrite existing episodes.

## Configuration

### Environment Variables
- `VITE_BACKEND_URL`: Backend API URL (frontend)
- `PORT`: Backend port (default: 3001)
- `DOWNLOAD_TMP_ROOT`: Temp download directory
- `MAX_CONCURRENT_DOWNLOADS`: Max parallel downloads (default: 2)

### Worker Intervals (in code)
- `notificationWorker.ts`: 5 minutes (`5 * 60 * 1000`)
- `animelyWatcher.ts`: 30 minutes (`30 * 60 * 1000`)
- `autoDownloadWorker.ts`: 15 minutes (`15 * 60 * 1000`)

## Testing

### Verify Calendar Connection
```sql
-- Run in Supabase SQL Editor
SELECT 
  e.id,
  e.episode_number,
  e.air_date,
  e.status,
  a.title
FROM episodes e
INNER JOIN seasons s ON e.season_id = s.id
INNER JOIN animes a ON s.anime_id = a.id
WHERE e.air_date IS NOT NULL
ORDER BY e.air_date DESC
LIMIT 20;
```

These episodes will appear in `/calendar`.

### Verify Workers Running
Check backend logs for:
```
[NotificationWorker] Running...
[AnimelyWatcher] Starting episode scan...
[AutoDownloadWorker] Starting...
```

### Verify Admin Notifications
1. Go to `/admin`
2. Check bell icon for notifications
3. Should see "Yeni bölüm eklendi" when watcher finds new episodes

## Troubleshooting

### Public calendar is empty
- Check if episodes have `air_date` set
- Run verification query above
- Check if `air_date` is in the future

### Episodes not downloading
- Check Auto Download Worker logs
- Verify episodes have `status='pending_download'`
- Check if `page_url` or `animely_slug` is set

### No admin notifications
- Check if `admin_notifications` table exists
- Run `supabase/sql/create_admin_notifications.sql`
- Verify admin user has `role='admin'` in profiles table

### Workers not running
- Check backend logs on server start
- Verify imports in `backend/src/index.ts`
- Check for TypeScript compilation errors

## Files Modified/Created

### Backend
- ✅ `backend/src/services/animelyWatcher.ts` (NEW)
- ✅ `backend/src/services/autoDownloadWorker.ts` (NEW)
- ✅ `backend/src/services/adminNotifications.ts` (already created)
- ✅ `backend/src/index.ts` (modified - added worker imports)

### Frontend
- ✅ `frontend/src/pages/Calendar.tsx` (already connected)
- ✅ `frontend/src/pages/AdminCalendar.tsx` (already exists)
- ✅ `frontend/src/components/AdminNotificationBell.tsx` (already created)

### Database
- ✅ `supabase/sql/create_admin_notifications.sql` (already created)
- ✅ `supabase/sql/add_episode_auto_calendar.sql` (documentation only)

## Summary

✅ **Public calendar is connected** - reads from episodes table  
✅ **Admin calendar works** - manual management interface  
✅ **Auto-population** - episodes automatically appear when `air_date` is set  
✅ **Episode detection** - Animely Watcher checks AniList every 30 min  
✅ **Auto download** - Auto Download Worker processes pending episodes every 15 min  
✅ **Admin notifications** - Bell icon shows system events  
✅ **Safety rules** - Non-blocking, fail-safe, no user input required  

The system is now **fully automated and production-ready**.


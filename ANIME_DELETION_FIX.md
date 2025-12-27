# Anime Deletion Fix - Complete Solution

## Problem
When an admin deleted an anime from the admin panel, it still appeared in:
- Desktop app
- Frontend lists (Yeni Bölümler, Katalog, search)
- This meant the anime was NOT fully deleted from Supabase

## Root Cause
The original `deleteAnime` function in `frontend/src/services/db.ts` only deleted from the `animes` table:
```typescript
deleteAnime: async (id: string) => {
  const { error } = await supabase!.from('animes').delete().eq('id', id);
  if (error) throw error;
}
```

**Why it failed:**
1. **RLS (Row Level Security)**: Supabase RLS policies might block cascade deletes when using the client SDK
2. **No verification**: No check to ensure deletion actually succeeded
3. **No related data cleanup**: Even with CASCADE, RLS can prevent proper deletion
4. **Frontend caching**: Deleted anime might still appear due to cached queries

## Solution

### 1. Backend API Endpoint (`backend/src/routes/admin/deleteAnime.ts`)
- **Route**: `POST /api/admin/delete-anime`
- **Authentication**: Requires `X-ADMIN-TOKEN` header
- **Functionality**:
  - Verifies admin token
  - Uses Supabase Admin Client (bypasses RLS)
  - Counts related data before deletion
  - Deletes anime (CASCADE handles related tables)
  - Verifies deletion succeeded
  - Returns detailed deletion report

**Deleted Data:**
- ✅ Anime (1)
- ✅ Seasons (cascade)
- ✅ Episodes (cascade)
- ✅ Watchlist entries (cascade)
- ✅ Watch progress (cascade)
- ✅ Watch history (cascade)
- ✅ Comments (cascade)

### 2. Frontend Updates

#### `frontend/src/services/db.ts`
- Updated `deleteAnime` to use backend API
- Requires admin token
- Returns success status and deletion details

#### `frontend/src/pages/AdminAnimes.tsx`
- Added proper confirmation modal
- Shows detailed warning about what will be deleted
- Requires admin token input
- Shows deletion summary after success
- Automatically reloads list after deletion

### 3. Database Schema
The schema already has `ON DELETE CASCADE` configured:
- `seasons.anime_id` → `animes.id` (CASCADE)
- `episodes.anime_id` → `animes.id` (CASCADE)
- `episodes.season_id` → `seasons.id` (CASCADE)
- `watchlist.anime_id` → `animes.id` (CASCADE)
- `watch_progress.anime_id` → `animes.id` (CASCADE)
- `watch_progress.episode_id` → `episodes.id` (CASCADE)
- `watch_history.anime_id` → `animes.id` (CASCADE)
- `watch_history.episode_id` → `episodes.id` (CASCADE)
- `comments.anime_id` → `animes.id` (CASCADE)
- `comments.episode_id` → `episodes.id` (CASCADE)

**Note**: If CASCADE is not working, run `supabase/sql/ensure_cascade_delete.sql` to verify/update constraints.

## Implementation Details

### Backend Endpoint
```typescript
POST /api/admin/delete-anime
Headers: { 'X-ADMIN-TOKEN': string }
Body: { animeId: string }
Response: {
  success: boolean,
  message: string,
  deleted: {
    anime: number,
    seasons: number,
    episodes: number,
    watchlist: number,
    watch_progress: number,
    watch_history: number,
    comments: number
  }
}
```

### Frontend Flow
1. User clicks "SİL" button
2. Confirmation modal appears
3. User enters admin token
4. User confirms deletion
5. Backend API called with token
6. Deletion performed (atomic)
7. Success message with deletion summary
8. List automatically reloaded

## Safety Features

1. **Admin Verification**: Requires admin token
2. **Confirmation Modal**: Prevents accidental deletion
3. **Atomic Operation**: All or nothing (transaction-like)
4. **Verification**: Checks that anime was actually deleted
5. **Detailed Logging**: Returns counts of deleted items
6. **Error Handling**: Proper error messages

## Storage Cleanup

**Note**: This implementation does NOT delete physical video files from Bunny CDN. Reasons:
1. Video files may be shared/reused
2. Deletion is expensive and slow
3. Orphaned files can be cleaned up separately

**Future Enhancement**: Add a cleanup job that:
- Marks anime as deleted (soft delete)
- Schedules physical file deletion
- Or: Implement soft delete + cleanup job

## Testing

1. **Test Deletion**:
   - Create test anime with seasons/episodes
   - Delete via admin panel
   - Verify: Anime removed from all lists
   - Verify: Related data deleted (check Supabase)

2. **Test Error Cases**:
   - Invalid admin token → Should fail
   - Non-existent anime → Should return 404
   - Network error → Should show error message

3. **Test Frontend**:
   - Deleted anime should NOT appear in:
     - Admin list (after reload)
     - New Episodes page
     - Browse/Search
     - Watch page

## Files Changed

1. `backend/src/routes/admin/deleteAnime.ts` (NEW)
2. `backend/src/index.ts` (updated - added route)
3. `frontend/src/services/db.ts` (updated - uses backend API)
4. `frontend/src/pages/AdminAnimes.tsx` (updated - confirmation modal)
5. `supabase/sql/ensure_cascade_delete.sql` (NEW - verification script)

## Environment Variables Required

- `VITE_API_BASE_URL`: Backend API URL (frontend)
- `ADMIN_TOKEN`: Admin authentication token (backend)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase admin key (backend)

## Why This Works

1. **Supabase Admin Client**: Bypasses RLS, ensures deletion works
2. **CASCADE Constraints**: Database handles related data automatically
3. **Backend Verification**: Ensures deletion actually succeeded
4. **Frontend Reload**: Clears cached data immediately
5. **Atomic Operation**: All deletions happen in one transaction

## Next Steps (Optional)

1. **Soft Delete**: Implement soft delete for recovery
2. **Storage Cleanup**: Add job to delete orphaned video files
3. **Audit Log**: Log all deletions for audit trail
4. **Bulk Delete**: Support deleting multiple anime at once


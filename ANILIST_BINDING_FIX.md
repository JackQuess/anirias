# AniList Season Binding Fix - Transactional & Error Handling

## Problem Summary

### Before Fix:
1. **Silent Failures**: Admin tried to bind season → AniList search worked → Binding failed silently
2. **Generic Errors**: UI showed only "AniList bağlama başarısız" with no reason
3. **Inconsistent State**: Season remained "bağlı değil" even though AniList media existed
4. **No Validation**: No checks before attempting database update
5. **Non-Transactional**: Partial updates could leave data in inconsistent state

### Root Cause:
- Frontend called `db.updateSeason()` which was **deprecated** and threw an error
- Error was caught but only showed generic alert
- No backend validation or transactional guarantees
- Frontend tried to update Supabase directly (which is blocked for admin operations)

## Solution Implemented

### 1. Backend Endpoint: `POST /api/admin/anilist/bind-season`

**Location**: `backend/src/routes/admin/bindAniListSeason.ts`

**Features**:
- ✅ Admin token authentication
- ✅ Validates season exists
- ✅ Validates AniList media exists and matches
- ✅ Validates media type (TV, TV_SHORT, OVA, ONA, MOVIE)
- ✅ Checks episode count compatibility (warning, not blocking)
- ✅ Prevents duplicate bindings
- ✅ **Transactional update** (single atomic UPDATE operation)

**Request Body**:
```json
{
  "season_id": "uuid",
  "anilist_media_id": 12345,
  "anilist_media": {
    "id": 12345,
    "format": "TV",
    "episodes": 12,
    "seasonYear": 2024
  }
}
```

**Response (Success)**:
```json
{
  "success": true,
  "season": { ... },
  "message": "Season 1 successfully bound to AniList ID 12345"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "errorCode": "ERROR_CODE",
  "details": "Additional error details"
}
```

### 2. Structured Error Codes

| Error Code | Meaning | User Message |
|------------|---------|-------------|
| `ANILIST_MEDIA_NOT_FOUND` | AniList media doesn't exist or doesn't match | "AniList medya bulunamadı. Lütfen geçerli bir medya seçin." |
| `EPISODE_COUNT_MISMATCH` | Episode counts differ significantly (warning only) | "Bölüm sayısı uyuşmuyor. Sezon: X, AniList: Y" |
| `INVALID_MEDIA_TYPE` | Media format not allowed | "Geçersiz medya tipi: X. Sadece TV, TV_SHORT, OVA, ONA veya MOVIE desteklenir." |
| `SEASON_NOT_FOUND` | Season doesn't exist in database | "Sezon bulunamadı. Sayfayı yenileyip tekrar deneyin." |
| `SEASON_ALREADY_BOUND` | Season already bound to different AniList ID | "Bu sezon zaten AniList ID X ile bağlı." |
| `DB_UPDATE_FAILED` | Database update failed | "Veritabanı güncelleme hatası. Lütfen tekrar deneyin." |
| `UNAUTHORIZED` | Admin token invalid or missing | "Yetkisiz erişim. Admin token geçersiz." |

### 3. Frontend Improvements

**Location**: `frontend/src/pages/AdminEpisodes.tsx`

**Changes**:
- ✅ Uses new `db.bindAniListSeason()` function
- ✅ Shows loading state during binding
- ✅ Handles specific error codes with user-friendly messages
- ✅ Only updates UI state on success
- ✅ Clears search/results on success
- ✅ Reloads seasons after successful bind

**Error Handling**:
```typescript
try {
  const updatedSeason = await db.bindAniListSeason(...);
  // Success - update UI
} catch (err: any) {
  // Handle specific error codes
  switch (err?.errorCode) {
    case 'ANILIST_MEDIA_NOT_FOUND': ...
    case 'INVALID_MEDIA_TYPE': ...
    // etc.
  }
}
```

### 4. Data Consistency Guarantees

**Transactional Update**:
- Single atomic `UPDATE` operation in PostgreSQL
- All validations happen **before** the update
- If any validation fails, **no database changes** are made
- If update succeeds, all fields are updated together:
  - `anilist_id`
  - `year`
  - `episode_count`
  - `updated_at`

**No Partial Updates**:
- Either all fields update together, or nothing updates
- No risk of `anilist_id` being set but `year` being null due to error
- Database constraints ensure data integrity

## Why It Was Failing Before

1. **Deprecated Function**: `db.updateSeason()` was deprecated and threw an error immediately
2. **No Backend Validation**: Frontend tried to update directly, which is blocked
3. **Generic Error Handling**: Caught error but only showed "başarısız" with no details
4. **No State Management**: UI state wasn't properly managed on failure

## How Consistency Is Guaranteed Now

1. **Backend Validation**: All checks happen server-side before any database changes
2. **Atomic Operation**: Single UPDATE statement ensures all-or-nothing
3. **Error Codes**: Structured errors allow frontend to handle each case appropriately
4. **State Management**: UI only updates on confirmed success
5. **Transaction-like Behavior**: PostgreSQL UPDATE is atomic, so no partial updates possible

## Testing

### Success Case:
1. Select AniList media
2. Click bind
3. Enter admin token
4. ✅ Season updates with AniList data
5. ✅ UI shows "Bağlandı" status
6. ✅ Modal closes, search clears

### Error Cases:
1. **Invalid Media Type**: Shows "Geçersiz medya tipi" message
2. **Season Not Found**: Shows "Sezon bulunamadı" message
3. **Already Bound**: Shows "Bu sezon zaten bağlı" message
4. **Database Error**: Shows "Veritabanı güncelleme hatası" message

## Migration Notes

- Old code: `db.updateSeason()` → **Deprecated, throws error**
- New code: `db.bindAniListSeason()` → **Use this for AniList binding**
- Backend endpoint: `/api/admin/anilist/bind-season` → **Required for binding**

## Future Improvements

1. Store admin token in context/state (avoid repeated prompts)
2. Add optimistic UI updates (update UI immediately, rollback on error)
3. Add batch binding (bind multiple seasons at once)
4. Add binding history/audit log


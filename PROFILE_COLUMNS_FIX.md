# Profile Columns Fix - Database Migration

## Problem
Profile update fails with error:
```
"Could not find the 'bio' column of 'profiles' in the schema cache"
```

**Root Cause:**
- Frontend tries to update `profiles.bio`, `profiles.avatar_id`, `profiles.banner_id`
- Supabase `profiles` table is missing `avatar_id` and `banner_id` columns
- `bio` column may exist but schema cache might be stale

## Solution

### 1. Database Migration (`supabase/sql/add_profile_columns.sql`)
Adds missing columns to `profiles` table:
- `avatar_id` (text, nullable) - Stores selected avatar ID
- `banner_id` (text, nullable) - Stores selected banner ID
- `bio` (text, nullable) - Ensures bio column exists

**Migration SQL:**
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;
```

### 2. Frontend Safety Updates (`frontend/src/services/db.ts`)
- **Safe field filtering**: Only includes defined fields in update
- **Better error messages**: Detects missing column errors and provides helpful message
- **Graceful handling**: Doesn't fail if optional fields are empty

**Key Changes:**
```typescript
// Filter out undefined/null values
const safeUpdates: Record<string, any> = {};
if (updates.bio !== undefined) safeUpdates.bio = updates.bio;
if (updates.avatar_id !== undefined) safeUpdates.avatar_id = updates.avatar_id;
if (updates.banner_id !== undefined) safeUpdates.banner_id = updates.banner_id;
// ... other fields

// Helpful error for missing columns
if (error.message?.includes('column') && error.message?.includes('schema cache')) {
  throw new Error('Profil sütunları eksik. Lütfen veritabanı migration\'ını çalıştırın: supabase/sql/add_profile_columns.sql');
}
```

## How to Apply

### Step 1: Run Migration
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run `supabase/sql/add_profile_columns.sql`
4. Wait a few seconds for schema cache to refresh

### Step 2: Verify
Check that columns exist:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('bio', 'avatar_id', 'banner_id');
```

### Step 3: Test
1. Go to Profile page
2. Edit bio/avatar/banner
3. Save
4. Verify changes persist immediately
5. Check navbar avatar updates

## Expected Behavior After Fix

✅ Profile edit (bio/avatar/banner) persists immediately
✅ UI reflects changes after save
✅ Navbar avatar updates without page refresh
✅ No schema cache errors
✅ Graceful handling of missing optional fields

## Files Changed

1. `supabase/sql/add_profile_columns.sql` (NEW) - Migration script
2. `frontend/src/services/db.ts` - Safe field filtering and error handling

## Notes

- Migration uses `ADD COLUMN IF NOT EXISTS` to be safe for existing databases
- Frontend now handles missing columns gracefully
- Schema cache should refresh automatically, but may take a few seconds
- If columns still don't appear, manually refresh in Supabase Dashboard


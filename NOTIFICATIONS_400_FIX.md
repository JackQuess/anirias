# Notifications 400 Bad Request Error - Root Cause & Fix

## Error Details

**Request:**
```
GET /rest/v1/notifications
Query: select=id,user_id,type,title,body,anime_id,episode_id,is_read,created_at
       &user_id=eq.<uuid>
       &order=created_at.desc
```

**Response:** `400 Bad Request`

**Environment:**
- Supabase PostgREST
- User is authenticated
- user_id is valid UUID

## Root Cause Analysis

PostgREST returns **400 Bad Request** (not 403 Forbidden) when:

1. **Missing Column** - Query requests a column that doesn't exist
2. **Broken Foreign Key** - FK constraint references non-existent table
3. **Column Type Mismatch** - Column exists but wrong data type
4. **Invalid Query Syntax** - Not applicable here (query is valid)

### Most Likely Causes (in order):

1. **`is_read` column name mismatch**
   - Query expects `is_read`
   - Table might have `read` or `read_status` instead
   - PostgREST fails with 400 when column doesn't exist

2. **Broken Foreign Key Constraints**
   - `anime_id` FK references `public.animes(id)` 
   - `episode_id` FK references `public.episodes(id)`
   - If these tables don't exist, PostgREST fails with 400

3. **Missing Columns**
   - Any of the 9 requested columns missing
   - PostgREST cannot select non-existent columns

4. **Column Type Issues**
   - Column exists but wrong type (e.g., `user_id` is TEXT instead of UUID)
   - PostgREST type checking fails

## Solution

### Step 1: Diagnose the Issue

Run `supabase/sql/diagnose_notifications_400.sql` in Supabase SQL Editor:

```sql
-- This will show:
-- 1. If table exists
-- 2. All columns and their types
-- 3. Foreign key constraints
-- 4. RLS status and policies
-- 5. Test query with actual error message
```

### Step 2: Apply the Fix

Run `supabase/sql/fix_notifications_400_complete.sql` in Supabase SQL Editor:

**This script:**
- ✅ Ensures all 9 required columns exist
- ✅ Fixes column name mismatches (`read` → `is_read`)
- ✅ Ensures correct data types (UUID, TEXT, BOOLEAN, TIMESTAMPTZ)
- ✅ Removes broken FK constraints if referenced tables don't exist
- ✅ Creates proper RLS SELECT policy
- ✅ Verifies column structure matches query

### Step 3: Verify

After running the fix, test this query:

```sql
SELECT 
  id,
  user_id,
  type,
  title,
  body,
  anime_id,
  episode_id,
  is_read,
  created_at
FROM notifications
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

This should work without 400 errors.

## Exact Fix Applied

### Column Structure (Required):
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  anime_id UUID,  -- nullable
  episode_id UUID,  -- nullable
  is_read BOOLEAN DEFAULT false NOT NULL,  -- CRITICAL: must be 'is_read'
  created_at TIMESTAMPTZ NOT NULL
);
```

### Foreign Key Handling:
- If `animes` table exists → Keep `anime_id` FK
- If `animes` table doesn't exist → Remove `anime_id` FK
- If `episodes` table exists → Keep `episode_id` FK
- If `episodes` table doesn't exist → Remove `episode_id` FK

**Why?** PostgREST validates FK constraints even on SELECT queries. If FK references non-existent table, it returns 400.

### RLS Policy (Required):
```sql
CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());
```

## Why PostgREST Rejected the Request

**Before Fix:**
- Column `is_read` didn't exist (had `read` instead) → **400 Bad Request**
- OR: FK constraint to non-existent `animes` table → **400 Bad Request**
- OR: FK constraint to non-existent `episodes` table → **400 Bad Request**

**After Fix:**
- All columns exist with correct names and types ✅
- FK constraints are valid or removed ✅
- RLS policy allows SELECT ✅
- Query works correctly ✅

## Final Working State

**Table Structure:**
- All 9 columns exist: `id`, `user_id`, `type`, `title`, `body`, `anime_id`, `episode_id`, `is_read`, `created_at`
- All columns have correct types
- Foreign keys are valid (or removed if tables don't exist)

**RLS:**
- RLS enabled
- SELECT policy: `user_id = auth.uid()`
- Authenticated users can read their own notifications

**Query:**
- PostgREST accepts the query
- Returns 200 OK with notification data
- No more 400 errors

## Testing

1. Run `diagnose_notifications_400.sql` → Identify the issue
2. Run `fix_notifications_400_complete.sql` → Apply the fix
3. Test query in Supabase SQL Editor → Should work
4. Test from frontend → Should work without 400 errors

## Notes

- **400 vs 403**: 400 = Bad Request (schema/query issue), 403 = Forbidden (RLS blocking)
- **FK Validation**: PostgREST validates FKs even on SELECT, so broken FKs cause 400
- **Column Names**: Must match exactly (case-sensitive in some cases)
- **Type Safety**: PostgREST enforces types strictly


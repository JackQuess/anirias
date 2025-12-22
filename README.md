
# ANIRIAS Monorepo (Frontend + Backend)

## Yapı
- `frontend/`: Vite/React istemci. API çağrıları için `VITE_API_BASE_URL` kullanır. Vercel’e deploy edilir.
- `backend/`: Express tabanlı API (yt-dlp, Bunny, Supabase Service Role). Railway’e deploy edilir. Giriş: `src/index.ts`, rota: `POST /api/admin/auto-import-all`.
- `supabase/`: SQL ve yardımcı dosyalar.
- **Not:** Backend Node.js 20+ gerektirir.

## Env Dosyaları
- `frontend/.env.example`: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, vb.
- `backend/.env.example`: `ADMIN_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BUNNY_STORAGE_*`, `PORT`, `YTDLP_PATH`, `MAX_CONCURRENCY`.

## Çalıştırma
- Frontend: `cd frontend && npm install && npm run dev` (veya `npm run build`).
- Backend: `cd backend && npm install && npm run dev` (veya `npm run build`).

## Deploy
- Vercel: `frontend/` dizinini hedefleyin; `VITE_API_BASE_URL` olarak Railway backend URL’sini verin.
- Railway: `backend/` dizinini Node 18+ ile deploy edin; .env.example’daki değişkenleri tanımlayın.
- Railway: `backend/` dizinini Node 20+ ile deploy edin (Dockerfile Node 20-slim).

# ANIRIAS - Production SQL Schema

Bu SQL komutlarını Supabase SQL Editöründe (SQL Editor) çalıştırarak veritabanınızı oluşturun.

## 1. Temel Tablolar ve Profiller

```sql
-- Profil Tablosu (Kullanıcılar)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text,
  role text default 'user' check (role in ('user', 'admin')),
  avatar_url text,
  banner_url text,
  bio text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Yeni kullanıcı kaydolduğunda otomatik profil oluşturan tetikleyici
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, role, avatar_url)
  values (
    new.id, 
    new.raw_user_meta_data->>'username', 
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 2. İçerik Yönetimi (Anime, Sezon, Bölüm)

```sql
-- Animeler
create table public.animes (
  id uuid default gen_random_uuid() primary key,
  anilist_id integer,
  title jsonb not null, -- Örn: {"romaji": "Naruto", "english": "Naruto"}
  description text,
  cover_image text,
  banner_image text,
  score numeric default 0,
  year integer,
  genres text[],
  view_count integer default 0,
  is_featured boolean default false,
  ai_summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sezonlar
create table public.seasons (
  id uuid default gen_random_uuid() primary key,
  anime_id uuid references public.animes(id) on delete cascade not null,
  season_number integer not null,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bölümler
create table public.episodes (
  id uuid default gen_random_uuid() primary key,
  anime_id uuid references public.animes(id) on delete cascade not null,
  season_id uuid references public.seasons(id) on delete cascade,
  episode_number integer not null,
  title text,
  duration_seconds integer default 1440,
  stream_url text not null,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## 3. Kullanıcı Etkileşimleri (İzleme Listesi, Geçmiş, Yorumlar)

```sql
-- İzleme Listesi (Watchlist)
create table public.watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  anime_id uuid references public.animes(id) on delete cascade not null,
  status text check (status in ('watching', 'planning', 'completed', 'dropped', 'paused')),
  score integer,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, anime_id)
);

-- İzleme İlerlemesi (Kaldığın yerden devam et)
create table public.watch_progress (
  user_id uuid references auth.users on delete cascade not null,
  anime_id uuid references public.animes(id) on delete cascade not null,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  progress_seconds integer default 0,
  duration_seconds integer default 0,
  updated_at timestamp with time zone default now() not null,
  primary key (user_id, episode_id)
);

-- İzleme Geçmişi (History)
create table public.watch_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  anime_id uuid references public.animes(id) on delete cascade not null,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  completed_at timestamp with time zone default now() not null
);

-- Yorumlar
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  anime_id uuid references public.animes(id) on delete cascade not null,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  text text not null,
  created_at timestamp with time zone default now() not null
);
```

## 4. Güvenlik Politikaları (RLS)

Aşağıdaki komutlar verilerinizi korur. Herkes okuyabilir ama sadece yetkililer düzenleyebilir.

```sql
-- RLS Aktifleştirme
alter table profiles enable row level security;
alter table animes enable row level security;
alter table seasons enable row level security;
alter table episodes enable row level security;
alter table watchlist enable row level security;
alter table watch_progress enable row level security;
alter table watch_history enable row level security;
alter table comments enable row level security;

-- PROFİLLER
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- İÇERİK (Anime, Sezon, Bölüm)
-- Herkes görebilir
create policy "Content is viewable by everyone." on animes for select using (true);
create policy "Seasons viewable by everyone." on seasons for select using (true);
create policy "Episodes viewable by everyone." on episodes for select using (true);

-- Sadece Adminler ekleyebilir/düzenleyebilir/silebilir
create policy "Admins can insert content" on animes for insert with check (auth.uid() in (select id from profiles where role = 'admin'));
create policy "Admins can update content" on animes for update using (auth.uid() in (select id from profiles where role = 'admin'));
create policy "Admins can delete content" on animes for delete using (auth.uid() in (select id from profiles where role = 'admin'));

-- (Benzer admin kurallarını seasons ve episodes tabloları için de ekleyin)
create policy "Admins manage seasons" on seasons for all using (auth.uid() in (select id from profiles where role = 'admin'));
create policy "Admins manage episodes" on episodes for all using (auth.uid() in (select id from profiles where role = 'admin'));

-- KULLANICI VERİLERİ (Sadece sahibi görebilir ve yönetebilir)
create policy "Users manage own watchlist" on watchlist for all using (auth.uid() = user_id);
create policy "Users manage own progress" on watch_progress for all using (auth.uid() = user_id);
create policy "Users manage own history" on watch_history for all using (auth.uid() = user_id);

-- YORUMLAR
create policy "Comments are viewable by everyone" on comments for select using (true);
create policy "Users can insert comments" on comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on comments for delete using (auth.uid() = user_id);
```

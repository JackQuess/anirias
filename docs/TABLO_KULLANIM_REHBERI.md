# ANIRIAS – Tablo Kullanım Rehberi

Her tablonun nerede kullanıldığı (sayfa, API, servis).

---

## 1. `animes`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | |
| `db.ts` | getFeaturedAnimes, getAllAnimes, getAnimeById, getAnimeByIdOrSlug, getAnimeBySlug, searchAnimes, getAdminDashboardCounts, getAnimeViewsSum |
| **Sayfalar** | Ana sayfa (hero, top 10, popüler, yeni sezonlar), Katalog (Browse), Anime detay, Yeni bölümler (episode→anime join), Profil (watchlist/history join), Admin (anime listesi, toggle featured) |
| **Backend API** | |
| `GET /api/anime/public/featured` | is_featured=true anime listesi |
| `GET /api/anime/public/list` | sortBy/limit ile anime listesi |
| `GET /api/anime/public/latest-episodes` | episodes join (anime bilgisi) |
| `GET /api/anime/public/item/:slug` | slug ile tek anime |
| `GET /api/anime/public/:id/episodes` | anime + seasons + episodes |
| **Backend admin** | createAnime, updateAnime, deleteAnime, createSeason, toggleFeatured, bunnyPatch, watchPage, hybridImport, fixSeasons, animelyWatcher, airingSchedule, supabaseAdmin (slug/url helpers) |
| **Vercel API** | `pages/api/admin/toggle-featured.ts` |

---

## 2. `seasons`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | getSeasonsByAnimeId, getEpisodesBySeasonId (join), getLatestEpisodes (episodes→seasons→animes), getWatchPagePayload (API) |
| **Sayfalar** | Anime detay (sezon listesi), Watch sayfası (sezon/bölüm), Admin bölümler (sezon seçimi) |
| **Backend API** | `GET /api/watch/:slug/:season/:episode` (watchPage) – anime + seasons + episodes |
| **Backend admin** | createSeason, deleteAnime (cascade), bindAniListSeason, createEpisode (season bilgisi), hybridImport, fixSeasons, moveEpisodes, animelyWatcher, bunnyPatch, supabaseAdmin |

---

## 3. `episodes`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | getLatestEpisodes, getEpisodesBySeasonId, getWatchPagePayload, saveWatchProgress/getWatchProgress (episode_id), getContinueWatching (join), getWatchHistory (join), getComments (episode_id), Admin dashboard son eklenenler |
| **Sayfalar** | Ana sayfa (Yeni Bölümler), Yeni Bölümler sayfası (/new-episodes), Watch sayfası (video/bölüm bilgisi), Anime detay (bölüm listesi), Profil (izleme geçmişi), Yorumlar |
| **Backend API** | `GET /api/anime/public/latest-episodes`, watchPage (bölüm detayı) |
| **Backend admin** | createEpisode, updateEpisode, deleteEpisode, deleteAnime (cascade), createSeason (placeholder bölümler), bunnyPatch (video URL), videoBasePatch (link dönüşümü), hybridImport, fixSeasons, moveEpisodes, downloadQueue, autoDownloadWorker, animelyWatcher |

---

## 4. `watchlist`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | getWatchlist, updateWatchlist |
| **Sayfalar** | Ana sayfa (Favori listem = watching/planning), Anime detay (listeye ekle/çıkar, durum), Profil → MY LIST sekmesi |
| **Backend** | deleteAnime (anime silinince ilgili watchlist satırları silinir) |

---

## 5. `watch_progress`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | saveWatchProgress, getWatchProgress, getWatchProgressForAnime, getContinueWatching |
| **Sayfalar** | Watch sayfası (kaldığın yer, İzlemeye Devam Et kartı), Ana sayfa (İzlemeye Devam Et), Profil (devam et butonu) |
| **Backend** | deleteAnime (cascade) |

---

## 6. `watch_history`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | addToWatchHistory, getWatchHistory |
| **Sayfalar** | Profil → İzleme geçmişi sekmesi, bölüm bitince kayıt |
| **Backend** | deleteAnime (cascade) |

---

## 7. `profiles`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | getProfile, updateProfile (bio, avatar_id, banner_id), authHelpers (get_email_by_username – giriş), yorumlarda profiles(username, avatar_id), getFeedback (user bilgisi), Admin kullanıcılar |
| **Sayfalar** | Navbar (avatar, kullanıcı adı), Profil sayfası (düzenle), Giriş (kullanıcı adı→e-posta), Yorumlar (avatar), Admin kullanıcılar |
| **Backend** | updateProfileRole (admin rol) |
| **Supabase** | auth.users sonrası trigger ile otomatik profil oluşturma (handle_new_user) |

---

## 8. `comments`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | getComments, addComment |
| **Sayfalar** | Watch sayfası (Comments bileşeni) |
| **Backend** | deleteAnime (cascade) |

---

## 9. `notifications`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | getNotifications, markNotificationRead |
| **Sayfalar** | Navbar bildirim ikonu / dropdown |
| **Backend** | Yeni bölüm eklendiğinde create_episode_notifications (trigger/function) ile kayıt eklenebilir |

---

## 10. `anime_follows`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | notifications.ts – takip edilen anime’ler için bildirim filtreleme (follows listesi) |
| **Sayfalar** | Dolaylı: hangi anime’ler için “yeni bölüm” bildirimi gösterileceği |

---

## 11. `feedback`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | FeedbackCard (form gönderimi), db.getFeedback (admin) |
| **Sayfalar** | Geri bildirim floating buton → FeedbackCard modal, Admin → Geri bildirimler |

---

## 12. `admin_notifications`

| Nerede | Ne için |
|--------|--------|
| **Backend** | adminNotifications servisi, GET/POST /api/admin/notifications (okuma / oluşturma) |
| **Sayfalar** | Admin paneli – sistem bildirimleri (kullanıcıya değil, admin’e) |

---

## 13. `site_settings`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | getSiteSetting, setSiteSetting (db.ts) |
| **Sayfalar** | Site ayarları (mascot vb.) – Admin veya genel ayar sayfaları |

---

## 14. `announcements`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | getActiveAnnouncement, getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement |
| **Sayfalar** | AnnouncementBanner (üst duyuru), Admin duyuru yönetimi |

---

## 15. `error_logs`

| Nerede | Ne için |
|--------|--------|
| **Frontend** | logClientError, getErrorLogs, markErrorResolved (db.ts) |
| **Sayfalar** | Hata yakalandığında kayıt, Admin hata listesi |

---

## 16. `airing_schedule`

| Nerede | Ne için |
|--------|--------|
| **Backend** | airingSchedule servisi – takvim senkronizasyonu, haftalık yayın çizelgesi |
| **Sayfalar** | Takvim sayfası (Calendar) – API veya cache üzerinden |

---

## 17. `weekly_calendar_cache`

| Nerede | Ne için |
|--------|--------|
| **Backend** | airingSchedule – haftalık takvim önbelleği (okuma/yazma/silme) |
| **Sayfalar** | Takvim sayfası (cache’ten hızlı veri) |

---

## 18. `jobs` (automation / worker)

| Nerede | Ne için |
|--------|--------|
| **Backend** | automation.ts, admin jobs route |
| **Vercel** | pages/api/admin/jobs.ts, reclaim-stale.ts |
| **Sayfalar** | Admin – iş kuyruğu / job listesi |

---

## 19. `job_logs`

| Nerede | Ne için |
|--------|--------|
| **Vercel** | pages/api/admin/job-logs.ts |
| **Sayfalar** | Admin – job logları |

---

## 20. `worker_controls`

| Nerede | Ne için |
|--------|--------|
| **Vercel** | pages/api/admin/worker-controls.ts |
| **Sayfalar** | Admin – worker aç/kapa vb. |

---

## Özet: Sayfa → Tablolar

| Sayfa / Özellik | Kullandığı tablolar |
|------------------|---------------------|
| Ana sayfa | animes (featured, list), watch_progress (+ animes, episodes), watchlist, episodes+seasons+animes (yeni bölümler) |
| Katalog (Browse) | animes |
| Anime detay | animes, seasons, episodes, watchlist |
| Watch | animes, seasons, episodes, watch_progress, watch_history, comments, profiles |
| Yeni Bölümler | episodes, seasons, animes |
| Profil | profiles, watchlist (animes), watch_history (animes, episodes) |
| Takvim | airing_schedule, weekly_calendar_cache, animes |
| Giriş/Kayıt | auth.users + profiles (get_email_by_username) |
| Navbar | profiles, notifications |
| Yorumlar | comments, profiles |
| Admin (genel) | animes, episodes, comments, profiles, view counts |
| Admin (bölümler) | animes, seasons, episodes, videoBasePatch |
| Admin (kullanıcılar) | profiles |
| Admin (geri bildirim) | feedback |
| Admin (duyurular) | announcements |
| Admin (hata logları) | error_logs |
| Admin (işler) | jobs, job_logs, worker_controls |

---

*Son güncelleme: proje taramasına göre derlendi.*

---

## Ek: Kullanıcı adıyla giriş nasıl çalışır?

**Tablo:** `profiles` (+ Supabase `auth.users`)

**Akış:**

1. Kullanıcı girişte **"E-POSTA VEYA KULLANICI ADI"** alanına ya e-posta ya da kullanıcı adı yazar.
2. **Frontend** (`Login.tsx`):
   - Girdi `@` içeriyorsa → **e-posta** kabul edilir, doğrudan `signInWithPassword({ email, password })` çağrılır.
   - Girdi e-posta formatında değilse → **kullanıcı adı** kabul edilir:
     - `supabase.rpc('get_email_by_username', { username_input: ... })` çağrılır.
     - RPC **e-posta** döndürürse bu e-posta ile `signInWithPassword({ email: foundEmail, password })` yapılır.
     - RPC `null` dönerse veya zaman aşımına uğrarsa: "Kullanıcı bulunamadı" hatası gösterilir.
3. **Veritabanı fonksiyonu** `get_email_by_username(username_input)`:
   - **Kullandığı tablolar:** `public.profiles` ve `auth.users`.
   - `profiles.username` (büyük/küçük harf duyarsız, trim) = `username_input` olan satırı bulur.
   - Bu satırın `profiles.id` ile eşleşen `auth.users.id` üzerinden `auth.users.email` değerini döndürür.
   - Yani: **username → profiles → auth.users → email**.

**Özet:**

| Adım | Nerede | Ne yapılıyor |
|------|--------|----------------|
| 1 | Login formu | Kullanıcı "levissei" veya "a@b.com" yazar |
| 2 | Login.tsx | E-posta formatı yoksa `get_email_by_username("levissei")` RPC çağrılır |
| 3 | Supabase (DB) | `profiles` + `auth.users` join: username = "levissei" → email |
| 4 | Login.tsx | Dönen e-posta + şifre ile `signInWithPassword` |
| 5 | Supabase Auth | Normal e-posta/şifre doğrulaması |

**Kullanılan tablolar:**
- **`profiles`** – `username` sütunu (kullanıcı adı burada; kayıtta da buraya yazılıyor).
- **`auth.users`** – Supabase’in kendi tablosu; `id` (profiles.id ile aynı), `email`, şifre hash’i.

**Performans:** `profiles` üzerinde `idx_profiles_username_lower_trim` index’i (lower(trim(username))) kullanıcı adı sorgusunu hızlandırır; yoksa RPC yavaşlayıp zaman aşımına düşebilir.

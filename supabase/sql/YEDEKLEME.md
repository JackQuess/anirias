# Veritabanı Yedekleme (Supabase)

## 1. Supabase Dashboard ile

- **Supabase Dashboard** → Projeni seç → **Settings** (sol alt) → **Database**
- **Database password** bölümündeki bağlantı bilgilerini kullanabilirsin.
- **Backups**: Pro plan’da otomatik günlük yedekler açılır. Free planda yok; aşağıdaki yöntemleri kullan.

## 2. SQL ile tablo verisi dışa aktarma

Supabase **SQL Editor**’da çalıştırarak sonuçları kopyalayıp bir `.sql` dosyasına yapıştırabilirsin (INSERT formatında değil, sadece veriyi görmek için):

```sql
-- Örnek: animes tablosundaki veriyi göster (yedek için kopyala)
SELECT * FROM public.animes ORDER BY created_at;
```

Her tablo için `SELECT * FROM public.<tablo_adi>;` çalıştırıp sonucu kopyalayabilirsin.  
Tam yedek için aşağıdaki **pg_dump** yöntemi daha uygundur.

## 3. pg_dump ile tam yedek (bilgisayarından)

1. Supabase **Settings** → **Database** → **Connection string** → **URI** kopyala.
2. Şifreyi URI’da yerine yaz (örn. `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`).
3. Terminalde:

```bash
pg_dump "postgresql://postgres:SIFRE@db.PROJE_REF.supabase.co:5432/postgres" \
  --schema=public \
  --no-owner \
  --no-acl \
  -f anirias_backup_$(date +%Y%m%d).sql
```

Oluşan `anirias_backup_YYYYMMDD.sql` dosyası public şemanın tam yedeğidir; aynı Supabase (veya başka Postgres) veritabanına geri yükleyebilirsin.

## 4. Sadece şema (tablolar, RLS, fonksiyonlar) yedekleme

Zaten `full_schema_reset.sql` sıfırdan şema kurar. Mevcut şemayı dışa almak için:

```bash
pg_dump "CONNECTION_URI" --schema=public --no-owner --no-acl --schema-only -f schema_only.sql
```

---

**Özet:** Giriş yaptıktan sonra sayfa yenilenince düşme için auth tarafında düzenleme yaptık. Yedek için: Free planda pg_dump veya SQL Editor’dan tabloları tek tek export et; Pro’da Dashboard’daki Backups’ı kullan.

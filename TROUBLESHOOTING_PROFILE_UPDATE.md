# Profile Update Troubleshooting

## Sorun
Migration çalıştırıldı, sütunlar var ama hala hata alınıyor.

## Adım Adım Kontrol

### 1. Sütunların Varlığını Doğrula
Supabase SQL Editor'da çalıştır:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('bio', 'avatar_id', 'banner_id');
```

**Beklenen:** 3 satır dönmeli (bio, avatar_id, banner_id)

### 2. Schema Cache Yenileme
Supabase otomatik yeniler ama bazen gecikebilir:
- 10-30 saniye bekle
- Tarayıcıyı yenile (hard refresh: Ctrl+Shift+R / Cmd+Shift+R)
- Supabase Dashboard'da Table Editor'da profiles tablosunu aç, sütunları görüyor musun?

### 3. RLS Politikalarını Kontrol Et
```sql
-- Mevcut politikaları görüntüle
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Update politikası olmalı:
-- "Users can update own profile" using (auth.uid() = id)
```

Eğer yoksa ekle:
```sql
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);
```

### 4. Manuel Test
SQL Editor'da kendi profilinizi test edin:
```sql
-- Önce user ID'ni al
SELECT auth.uid();

-- Sonra manuel update dene
UPDATE profiles 
SET bio = 'test bio', 
    avatar_id = 'test_avatar', 
    banner_id = 'test_banner'
WHERE id = auth.uid();

-- Sonucu kontrol et
SELECT bio, avatar_id, banner_id FROM profiles WHERE id = auth.uid();
```

### 5. Konsol Loglarını Kontrol Et
1. Tarayıcıda F12'ye bas (Developer Tools)
2. Console sekmesine git
3. Profil güncellemeyi dene
4. Şu logları ara:
   - `[db.updateProfile] Full Error:`
   - `[db.updateProfile] Error Code:`
   - `[db.updateProfile] Error Message:`
   - `[db.updateProfile] Update Payload:`

### 6. Olası Hata Kodları

**42703** - Column does not exist
- Çözüm: Migration'ı tekrar çalıştır

**42P01** - Relation does not exist  
- Çözüm: Tablo adını kontrol et

**42501** - Permission denied
- Çözüm: RLS politikasını kontrol et

**PGRST116** - Schema cache error
- Çözüm: 30 saniye bekle, Supabase otomatik yeniler

### 7. Supabase Dashboard Kontrolleri

1. **Table Editor** → `profiles` tablosu
   - Sütunlar görünüyor mu? (bio, avatar_id, banner_id)
   - Bir satırı düzenlemeyi dene

2. **Authentication** → Users
   - Kendi kullanıcını bul
   - ID'yi kopyala

3. **SQL Editor** → Yeni sorgu
   ```sql
   -- Kendi ID'n ile test et
   SELECT id, username, bio, avatar_id, banner_id 
   FROM profiles 
   WHERE id = 'YOUR_USER_ID_HERE';
   ```

### 8. Frontend Debug

Konsolda şunları kontrol et:
```javascript
// Profile.tsx'te
console.log('PROFILE DATA', profile);
console.log('EDIT FORM', editForm);

// db.ts'te (zaten var)
console.log('[db.updateProfile] Update Payload:', safeUpdates);
```

### 9. Yaygın Sorunlar ve Çözümler

**Sorun:** "Column does not exist" ama sütunlar var
- **Çözüm:** Supabase Dashboard'da Table Editor'ı aç, sütunları görüyor musun? Eğer görünmüyorsa migration başarısız olmuş olabilir.

**Sorun:** "Permission denied"
- **Çözüm:** RLS politikası eksik veya yanlış. Yukarıdaki RLS kontrolünü yap.

**Sorun:** "Schema cache" hatası
- **Çözüm:** 30 saniye bekle, Supabase otomatik yeniler. Hala olmazsa Supabase support'a başvur.

**Sorun:** Update başarılı görünüyor ama değişiklikler kayboluyor
- **Çözüm:** `refreshProfile()` çağrısı çalışmıyor olabilir. Konsolda hata var mı kontrol et.

### 10. Son Çare

Eğer hiçbiri işe yaramazsa:

1. Supabase Dashboard → Database → Tables → profiles
2. "Add Column" butonuna tıkla
3. Manuel olarak ekle:
   - `avatar_id` (text, nullable)
   - `banner_id` (text, nullable)
   - `bio` (text, nullable) - eğer yoksa

4. Sonra tekrar dene

## Hata Mesajını Paylaş

Eğer hala çalışmıyorsa, lütfen şunları paylaş:
1. Konsoldaki tam hata mesajı
2. Error code (varsa)
3. SQL Editor'da sütun sorgusunun sonucu
4. RLS politikalarının listesi


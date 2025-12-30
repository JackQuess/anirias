# Username Görünmüyor Sorunu - Çözüm

## ❌ Sorun

Profil sayfasında kullanıcı adı **"KULLANICI_546C8BE"** gibi rastgele bir string olarak görünüyor. Kayıt sırasında username giriliyor ama profilde düzgün gözükmüyor.

---

## 🔍 Kök Neden

1. **Kayıt sırasında:** Username, Supabase Auth'un `raw_user_meta_data` alanına kaydediliyor
2. **Profile trigger eksik:** Yeni kullanıcı kaydolduğunda, username'i `profiles` tablosuna kopyalayan trigger çalıştırılmamış
3. **Sonuç:** `auth.users` tablosunda username var, ama `profiles` tablosunda yok → Profil sayfası boş username gösteriyor

---

## ✅ Çözüm: SQL Migration Çalıştır

### Adım 1: Supabase Dashboard'a Git

1. [Supabase Dashboard](https://supabase.com/dashboard) → Project seç
2. **SQL Editor** → **New Query**

### Adım 2: Migration'ı Çalıştır

Aşağıdaki dosyayı kopyala-yapıştır ve **Run** tıkla:

```
supabase/sql/fix_missing_profiles.sql
```

### Adım 3: Sonuçları Kontrol Et

Migration başarıyla çalıştıktan sonra şu mesajları göreceksin:

```
NOTICE:  ====================================
NOTICE:  PROFILE FIX COMPLETED
NOTICE:  ====================================
NOTICE:  Total auth.users: X
NOTICE:  Total profiles: X
NOTICE:  Fixed missing profiles: X
NOTICE:  ====================================
NOTICE:  Trigger: on_auth_user_created - ACTIVE
NOTICE:  Function: handle_new_user() - ACTIVE
NOTICE:  ====================================
```

Ve iki tablo göreceksin:
- **CHECK:** All users have profiles → ✅ PASSED
- **Recent Users:** Son 5 kullanıcının username'leri

---

## 🧪 Test Et

1. **Mevcut kullanıcı:** Sayfayı yenile → Username düzgün görünmeli
2. **Yeni kullanıcı:** Kayıt ol → Username otomatik profiles'a eklenecek

---

## 📋 Migration Ne Yapıyor?

### 1️⃣ Trigger'ı Etkinleştir

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Ne yapar?**
- Yeni kullanıcı kaydolduğunda otomatik çalışır
- Username'i `auth.users.raw_user_meta_data` içinden alır
- `profiles` tablosuna ekler

### 2️⃣ Mevcut Kullanıcılar İçin Düzeltme

```sql
INSERT INTO public.profiles (id, username, role, avatar_url, created_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', 'user_' || substr(au.id::text, 1, 8)),
  COALESCE(au.raw_user_meta_data->>'role', 'user'),
  NULL,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL; -- Sadece profiles'da olmayan kullanıcıları ekle
```

**Ne yapar?**
- `auth.users` tablosundaki tüm kullanıcıları kontrol eder
- `profiles` tablosunda kaydı olmayan kullanıcıları bulur
- Username'lerini metadata'dan alıp profiles'a ekler

### 3️⃣ Doğrulama

```sql
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASSED - All users have profiles'
    ELSE '❌ FAILED - ' || COUNT(*) || ' users missing profiles'
  END AS result
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

**Ne yapar?**
- Her `auth.users` kaydının `profiles`'da karşılığı olduğunu doğrular

---

## 🔄 Nasıl Çalışıyor?

### Kayıt Akışı (ÖNCESİ)
```
1. User → Signup Form (email, password, username)
2. supabase.auth.signUp()
   ↓
3. auth.users tablosu
   - id: c358824c-a552-48c5-aa79-6cde237b6313
   - raw_user_meta_data: { username: "kayraalkan", role: "user" }
   ↓
4. ❌ profiles tablosu (BOŞ - trigger yok)
   ↓
5. Profil sayfası → username yok → "KULLANICI_546C8BE" göster
```

### Kayıt Akışı (SONRASI - Trigger Aktif)
```
1. User → Signup Form (email, password, username)
2. supabase.auth.signUp()
   ↓
3. auth.users tablosu
   - id: c358824c-a552-48c5-aa79-6cde237b6313
   - raw_user_meta_data: { username: "kayraalkan", role: "user" }
   ↓
4. ✅ TRIGGER: on_auth_user_created çalışır
   ↓
5. profiles tablosu
   - id: c358824c-a552-48c5-aa79-6cde237b6313
   - username: "kayraalkan"
   - role: "user"
   ↓
6. Profil sayfası → username "kayraalkan" göster ✅
```

---

## 🛡️ Güvenlik

- **SECURITY DEFINER:** Function, `auth.users` tablosuna erişim için admin yetkisiyle çalışır
- **RLS Policies:** Kullanıcılar sadece kendi profillerini görebilir/düzenleyebilir
- **ON CONFLICT DO NOTHING:** Duplicate kayıt hatası önlenir

---

## 🆘 Sorun Giderme

### Sorun 1: Migration'da hata alıyorum

```
ERROR: permission denied for schema auth
```

**Çözüm:**
- Supabase Dashboard'da **SQL Editor** kullanıyorsun, değil mi?
- `Service Role Key` ile çalıştığından emin ol (otomatik aktiftir)

### Sorun 2: Username hala görünmüyor

**Kontrol adımları:**

1. **Auth metadata'yı kontrol et:**
```sql
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'username' AS username_in_metadata
FROM auth.users
WHERE email = 'SENIN_EMAILIN@example.com';
```

2. **Profile kaydını kontrol et:**
```sql
SELECT * FROM profiles 
WHERE id = 'USER_ID_BURAYA';
```

3. **Eğer profile'da kayıt yoksa, manuel ekle:**
```sql
INSERT INTO public.profiles (id, username, role, created_at)
VALUES (
  'USER_ID_BURAYA',
  'ISTEDIGIN_USERNAME',
  'user',
  NOW()
);
```

### Sorun 3: Trigger çalışmıyor mu?

**Trigger'ı kontrol et:**
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Beklenen sonuç:**
```
trigger_name: on_auth_user_created
event_manipulation: INSERT
event_object_table: users
action_statement: EXECUTE FUNCTION public.handle_new_user()
```

---

## 📊 Özet

| Ne | Önce | Sonra |
|---|------|-------|
| **Trigger** | ❌ Yok | ✅ Aktif |
| **Mevcut kullanıcılar** | ❌ profiles'da yok | ✅ profiles'a eklendi |
| **Yeni kayıtlar** | ❌ Manuel ekleme gerekir | ✅ Otomatik eklenir |
| **Username görünümü** | ❌ "KULLANICI_546C8BE" | ✅ Gerçek username |

---

## ✅ Checklist

- [ ] `supabase/sql/fix_missing_profiles.sql` dosyasını oluştur
- [ ] Supabase SQL Editor'da migration'ı çalıştır
- [ ] Migration başarılı mesajını gör
- [ ] ✅ PASSED - All users have profiles
- [ ] Frontend'i yenile (Ctrl+Shift+R)
- [ ] Profil sayfasında username'i kontrol et
- [ ] Çıkış yap → Yeni kullanıcı kaydet → Test et

---

**Dosya:** `supabase/sql/fix_missing_profiles.sql`  
**Status:** ⚠️ Supabase'de çalıştırılması gerekiyor  
**Tahmini Süre:** 30 saniye


# 🔴 ACİL: Notifications 403 Hatası Düzeltme

## Sorun
Frontend'de notifications tablosuna erişirken `403 Forbidden` hatası alınıyor.

## Çözüm

### 1. Supabase SQL Editor'de Script Çalıştırın

1. Supabase Dashboard'a gidin: https://supabase.com/dashboard
2. Projenizi seçin
3. Sol menüden **SQL Editor**'e tıklayın
4. **New Query** butonuna tıklayın
5. Aşağıdaki script'i kopyalayıp yapıştırın:

```sql
-- Bu script'i çalıştırın: supabase/sql/fix_notifications_rls_complete.sql
```

Veya doğrudan `supabase/sql/fix_notifications_rls_complete.sql` dosyasının içeriğini kopyalayıp çalıştırın.

### 2. Script Ne Yapıyor?

- ✅ Tüm mevcut policy'leri kaldırır (temiz başlangıç)
- ✅ RLS'yi aktif eder
- ✅ Doğru SELECT, UPDATE, INSERT, DELETE policy'lerini oluşturur
- ✅ `anime_follows` tablosunu da düzeltir
- ✅ Policy'leri doğrular

### 3. Script Çalıştıktan Sonra

1. **Sayfayı yenileyin** (hard refresh: Cmd+Shift+R / Ctrl+Shift+R)
2. **Tekrar deneyin** - 403 hatası düzelmiş olmalı
3. Hala hata alıyorsanız:
   - Supabase Dashboard > Authentication > Policies
   - `notifications` tablosu için policy'lerin oluşturulduğunu kontrol edin
   - Kullanıcının authenticated olduğundan emin olun

### 4. Doğrulama

Script çalıştıktan sonra şu sorguyu çalıştırarak test edebilirsiniz:

```sql
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY cmd, policyname;
```

Şu policy'ler görünmeli:
- `Users can read own notifications` (SELECT)
- `Users can update own notifications` (UPDATE)
- `Service role can insert notifications` (INSERT)
- `Users can delete own notifications` (DELETE)

## Önemli Notlar

- ⚠️ Script'i **bir kez** çalıştırmanız yeterli
- ✅ Script idempotent (birden fazla kez çalıştırılabilir)
- ✅ Mevcut verileri etkilemez
- ✅ Sadece RLS policy'lerini düzeltir

## Hala Çalışmıyorsa

1. **Authentication kontrolü**: Kullanıcı giriş yapmış mı?
2. **User ID eşleşmesi**: `notifications.user_id` = `auth.uid()` olmalı
3. **Supabase Logs**: Dashboard > Logs > Postgres Logs'u kontrol edin
4. **Browser Console**: Network tab'ında tam hata mesajını kontrol edin

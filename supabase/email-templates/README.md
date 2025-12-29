# ANIRIAS - Supabase Email Templates

Bu klasörde ANIRIAS için özelleştirilmiş Supabase Auth email template'leri bulunmaktadır.

## 📧 Email Template'leri

1. **confirm-signup.html** - Email doğrulama (Kayıt)
2. **magic-link.html** - Magic link giriş
3. **reset-password.html** - Şifre sıfırlama

## 🚀 Kurulum

### 1. Supabase Dashboard'a Git

1. [Supabase Dashboard](https://app.supabase.com) → Projenizi seçin
2. **Authentication** → **Email Templates** sekmesine gidin

### 2. Template'leri Yükle

Her template için:

1. İlgili email tipini seçin (Confirm signup, Magic Link, Reset Password)
2. HTML template'i kopyalayın
3. Supabase'in HTML editor'üne yapıştırın
4. **Save** butonuna tıklayın

### 3. URL Configuration (ÇOK ÖNEMLİ!)

**Authentication** → **URL Configuration** bölümüne gidin:

#### Site URL:
```
https://anirias.vercel.app
```

#### Redirect URLs:
```
https://anirias.vercel.app/**
https://anirias.vercel.app/#/**
```

**⚠️ ÖNEMLİ:**
- ❌ `localhost` eklemeyin
- ❌ `vercel.app` subdomain'leri eklemeyin (sadece production domain)
- ✅ Sadece production domain kullanın

### 4. Email Subject'leri

Her email tipi için subject (konu) ayarlayın:

#### Confirm Signup:
```
🎌 Anirias | Hesabını Doğrula
```

#### Magic Link:
```
🎌 Anirias | Giriş Bağlantın
```

#### Reset Password:
```
🔐 Anirias | Şifre Sıfırlama
```

## 📝 Template Değişkenleri

Supabase template'lerinde kullanılan değişkenler:

- `{{ .ConfirmationURL }}` - Doğrulama/giriş/şifre sıfırlama linki
- `{{ .Email }}` - Kullanıcı email adresi
- `{{ .Token }}` - Token (bazı durumlarda)
- `{{ .SiteURL }}` - Site URL'i

## 🎨 Tasarım Özellikleri

- **Tema:** Koyu (anime temalı)
- **Ana Renk:** #e50914 (Anirias kırmızısı)
- **Font:** System fonts (okunabilir)
- **Layout:** Tek kolon, mobile responsive
- **Branding:** ANIRIAS logo ve marka renkleri

## ✅ Test Etme

1. Test email gönderin (Supabase Dashboard → Authentication → Users → Test Email)
2. Email'in doğru göründüğünü kontrol edin
3. Linklerin çalıştığını test edin
4. Mobile email client'larda görünümü kontrol edin

## 🔒 Güvenlik

- Tüm linkler HTTPS kullanır
- Token'lar 1 saat içinde geçersiz olur
- Kullanıcıya güvenlik uyarıları gösterilir
- Otomatik email olduğu belirtilir

## 📱 Mobile Uyumluluk

Template'ler şu email client'larda test edilmiştir:
- ✅ Gmail (Mobile + Desktop)
- ✅ Apple Mail (iOS + macOS)
- ✅ Outlook (Mobile + Desktop)
- ✅ Yahoo Mail

## 🐛 Sorun Giderme

### Linkler çalışmıyor
- URL Configuration'ı kontrol edin
- Redirect URLs'e `https://anirias.vercel.app/**` ekleyin

### Email görünmüyor
- Spam klasörünü kontrol edin
- Email provider ayarlarını kontrol edin

### Template render edilmiyor
- HTML syntax'ını kontrol edin
- Supabase'in template editor'ünde preview yapın

## 📞 Destek

Sorun yaşarsanız:
1. Supabase Dashboard'da template preview'ı kontrol edin
2. Browser console'da hataları kontrol edin
3. Email provider loglarını inceleyin


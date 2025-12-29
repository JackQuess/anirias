/**
 * Username Validation Utility
 * 
 * Kullanıcı adı için etik kurallar ve içerik kontrolü
 */

// Uygunsuz kelimeler listesi (Türkçe + İngilizce)
const INAPPROPRIATE_WORDS = [
  // Türkçe uygunsuz kelimeler
  'sik', 'sikeyim', 'sikim', 'am', 'amcık', 'amk', 'orospu', 'piç', 'pezevenk',
  'göt', 'götveren', 'ibne', 'nonos', 'yarrak', 'yarrrak',
  // İngilizce uygunsuz kelimeler
  'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'cock',
  'nigger', 'nigga', 'retard', 'fag', 'faggot',
  // +18 içerik
  'porn', 'porno', 'xxx', 'sex', 'seks', 'erotic', 'erotik', 'nude', 'nü',
  'hentai', 'pornhub', 'xvideos', 'onlyfans',
  // Diğer uygunsuz içerik
  'kill', 'öl', 'intihar', 'suicide', 'bomb', 'bomba', 'terör', 'terror'
];

// Yasaklı karakterler ve desenler
const FORBIDDEN_PATTERNS = [
  /[<>{}[\]\\\/]/g, // HTML/script karakterleri
  /(.)\1{4,}/g, // 5+ tekrar eden karakter (aaaaa)
  /^[0-9]+$/, // Sadece sayı
  /^admin$/i, // Admin kelimesi
  /^root$/i, // Root kelimesi
  /^system$/i, // System kelimesi
];

/**
 * Username validation kuralları
 */
export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Username'i kontrol et
 */
export const validateUsername = (username: string): UsernameValidationResult => {
  // Boş kontrolü
  if (!username || username.trim().length === 0) {
    return {
      isValid: false,
      error: 'Kullanıcı adı boş olamaz.',
    };
  }

  const trimmed = username.trim();
  const lower = trimmed.toLowerCase();

  // Uzunluk kontrolü (3-20 karakter)
  if (trimmed.length < 3) {
    return {
      isValid: false,
      error: 'Kullanıcı adı en az 3 karakter olmalıdır.',
    };
  }

  if (trimmed.length > 20) {
    return {
      isValid: false,
      error: 'Kullanıcı adı en fazla 20 karakter olabilir.',
    };
  }

  // Uygunsuz kelime kontrolü
  for (const word of INAPPROPRIATE_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return {
        isValid: false,
        error: 'Kullanıcı adı uygunsuz içerik içeremez.',
      };
    }
  }

  // Yasaklı desen kontrolü
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: 'Kullanıcı adı geçersiz karakterler içeremez.',
      };
    }
  }

  // Sadece harf, sayı, alt çizgi ve tire kabul et
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Kullanıcı adı sadece harf, sayı, alt çizgi (_) ve tire (-) içerebilir.',
    };
  }

  // Başlangıç ve bitiş kontrolü (sayı veya özel karakter ile başlayamaz)
  if (/^[0-9_-]/.test(trimmed) || /[_-]$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Kullanıcı adı harf ile başlamalı ve bitmelidir.',
    };
  }

  return {
    isValid: true,
  };
};

/**
 * Username'i temizle (güvenli hale getir)
 */
export const sanitizeUsername = (username: string): string => {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '') // Sadece harf, sayı, alt çizgi, tire
    .replace(/^[0-9_-]+/, '') // Baştan sayı ve özel karakterleri temizle
    .replace(/[_-]+$/, '') // Sondan özel karakterleri temizle
    .substring(0, 20); // Maksimum 20 karakter
};


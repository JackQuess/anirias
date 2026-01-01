// Genre/Tür çeviri mapping'i
// Database'de İngilizce tutulan türler UI'da Türkçe gösterilir

export const genreTranslations: Record<string, string> = {
  // Ana türler
  'Action': 'Aksiyon',
  'Adventure': 'Macera',
  'Comedy': 'Komedi',
  'Drama': 'Dram',
  'Ecchi': 'Ecchi',
  'Fantasy': 'Fantastik',
  'Horror': 'Korku',
  'Mahou Shoujo': 'Büyülü Kız',
  'Mecha': 'Mecha',
  'Music': 'Müzik',
  'Mystery': 'Gizem',
  'Psychological': 'Psikolojik',
  'Romance': 'Romantizm',
  'Sci-Fi': 'Bilim Kurgu',
  'Slice of Life': 'Yaşamdan Kesitler',
  'Sports': 'Spor',
  'Supernatural': 'Doğaüstü Güçler',
  'Thriller': 'Gerilim',
  
  // Demografik türler
  'Shounen': 'Shounen',
  'Seinen': 'Seinen',
  'Shoujo': 'Shoujo',
  'Josei': 'Josei',
  
  // Özel türler
  'Isekai': 'Isekai',
  'Harem': 'Harem',
  'School': 'Okul',
  'Military': 'Askeri',
  'Historical': 'Tarihi',
  'Martial Arts': 'Dövüş Sanatları',
  'Super Power': 'Süper Güç',
  'Vampire': 'Vampir',
  'Game': 'Oyun',
  'Parody': 'Parodi',
  'Samurai': 'Samuray',
  'Police': 'Polisiye',
  'Space': 'Uzay',
  'Dementia': 'Dementia',
  'Demons': 'Şeytanlar',
  'Magic': 'Büyü',
  'Kids': 'Çocuklar',
  'Cars': 'Arabalar',
  
  // Adult türler
  'Hentai': 'Hentai',
  'Erotica': 'Erotik',
  'Adult': 'Yetişkin',
};

/**
 * İngilizce tür adını Türkçe'ye çevirir
 * Çeviri yoksa orijinal değeri döndürür
 */
export const translateGenre = (genre: string): string => {
  return genreTranslations[genre] || genre;
};

/**
 * Türkçe tür adını İngilizce'ye çevirir (database sorguları için)
 * Çeviri yoksa orijinal değeri döndürür
 */
export const translateGenreToEnglish = (genreTr: string): string => {
  const reverseMap = Object.entries(genreTranslations).find(([_, tr]) => tr === genreTr);
  return reverseMap ? reverseMap[0] : genreTr;
};

/**
 * Tür listesini Türkçe'ye çevirir
 */
export const translateGenres = (genres: string[]): string[] => {
  return genres.map(translateGenre);
};



import React, { useState } from 'react';
import { db } from '@/services/db';
import { useNavigate } from 'react-router-dom';
import LoadingSkeleton from '../components/LoadingSkeleton';

const ANILIST_API = 'https://graphql.anilist.co';

// Genişletilmiş AniList Sorgusu
const SEARCH_QUERY = `
query ($search: String) {
  Page(perPage: 10) {
    media(search: $search, type: ANIME) {
      id
      title { romaji english native }
      description
      coverImage { extraLarge large }
      bannerImage
      averageScore
      seasonYear
      genres
      episodes
      status
      streamingEpisodes {
        title
        thumbnail
      }
    }
  }
}
`;

const AdminAutoImport: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // 1. Aşama: AniList API ile Arama Yapma
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setPreviewData(null);
    setSearchResults([]);

    try {
      const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: SEARCH_QUERY,
          variables: { search: searchTerm }
        })
      });
      const json = await response.json();
      setSearchResults(json.data.Page.media || []);
    } catch (error) {
      alert("AniList bağlantı hatası!");
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Aşama: Seçilen Anime Verisini Hazırlama (AI Olmadan Doğrudan)
  const handleSelectAnime = (anilistData: any) => {
    setPreviewData({
      anilist_id: anilistData.id,
      title: anilistData.title.romaji,
      description: anilistData.description || 'Açıklama bulunamadı.',
      year: anilistData.seasonYear || new Date().getFullYear(),
      score: anilistData.averageScore ? (anilistData.averageScore / 10).toFixed(1) : "0.0",
      genres: anilistData.genres || [],
      cover_image: anilistData.coverImage.extraLarge,
      banner_image: anilistData.bannerImage || anilistData.coverImage.extraLarge
    });
    setSearchResults([]);
  };

  // 3. Aşama: Veritabanına Kaydetme
  const handleFinalImport = async () => {
    if (!previewData) return;
    setIsSaving(true);
    try {
      await db.createAnime({
        anilist_id: previewData.anilist_id,
        title: { romaji: previewData.title, english: previewData.title },
        description: previewData.description,
        year: previewData.year,
        score: parseFloat(previewData.score),
        genres: previewData.genres,
        cover_image: previewData.cover_image,
        banner_image: previewData.banner_image,
        view_count: 0
      });

      alert(`'${previewData.title}' başarıyla içe aktarıldı! (Sezon/Bölüm yok)`);
      navigate('/admin/animes');
    } catch (error) {
      console.error(error);
      alert('Kayıt sırasında bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">ANILIST <span className="text-brand-red">IMPORT</span></h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Resmi AniList veritabanından doğrudan içe aktarma yapın</p>
        </div>
      </div>

      {/* Arama Barı */}
      <div className="bg-brand-dark border border-brand-border p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row gap-6">
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ANİME ARA (Örn: Jujutsu Kaisen)..."
            className="flex-grow bg-white/5 border border-white/10 rounded-2xl px-8 py-5 text-white font-black uppercase tracking-widest outline-none focus:border-brand-red transition-all"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-brand-red hover:bg-brand-redHover text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl shadow-brand-red/20"
          >
            {isSearching ? 'ARANIYOR...' : 'ANILIST\'TE ARA'}
          </button>
        </div>
      </div>

      {/* Arama Sonuçları */}
      {searchResults.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 animate-fade-in">
          {searchResults.map((item) => (
            <button 
              key={item.id}
              onClick={() => handleSelectAnime(item)}
              className="group flex flex-col text-left space-y-3"
            >
              <div className="relative aspect-[2/3] rounded-[1.5rem] overflow-hidden border border-white/5 group-hover:border-brand-red transition-all shadow-xl">
                <img src={item.coverImage.large} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                <div className="absolute bottom-3 left-3 right-3">
                   <p className="text-[10px] font-black text-white uppercase line-clamp-2">{item.title.romaji}</p>
                </div>
                {item.averageScore && (
                  <div className="absolute top-3 right-3 bg-brand-red text-white text-[9px] font-black px-2 py-1 rounded shadow-lg">
                    {item.averageScore}%
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isSearching && (
        <div className="py-20 flex flex-col items-center justify-center">
           <div className="w-12 h-12 border-4 border-brand-red/20 border-t-brand-red rounded-full animate-spin mb-4" />
           <p className="text-[10px] font-black text-white uppercase tracking-widest">Veritabanı taranıyor...</p>
        </div>
      )}

      {/* Önizleme ve Onay Ekranı */}
      {previewData && (
        <div className="animate-fade-in space-y-10 pb-20">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">İÇE AKTARMA <span className="text-brand-red">ÖNİZLEME</span></h2>
            <button onClick={() => setPreviewData(null)} className="text-[10px] font-black text-gray-600 hover:text-white uppercase underline">Vazgeç</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-brand-dark border border-brand-border rounded-[3rem] p-10 space-y-8">
                <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-tight">{previewData.title}</h3>
                <div dangerouslySetInnerHTML={{ __html: previewData.description }} className="text-gray-400 leading-relaxed text-sm italic" />
                
                <div className="grid grid-cols-3 gap-6">
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center">
                      <p className="text-[10px] font-black text-gray-600 uppercase mb-1">YAYIN YILI</p>
                      <p className="text-2xl font-black text-white">{previewData.year}</p>
                   </div>
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center">
                      <p className="text-[10px] font-black text-gray-600 uppercase mb-1">PUAN</p>
                      <p className="text-2xl font-black text-brand-red">{previewData.score}</p>
                   </div>
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center">
                      <p className="text-[10px] font-black text-gray-600 uppercase mb-1">BÖLÜMLER</p>
                      <p className="text-2xl font-black text-white">0</p>
                   </div>
                </div>

                <div className="flex flex-wrap gap-2">
                   {previewData.genres.map((g: string) => (
                     <span key={g} className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black text-gray-500 uppercase border border-white/5">{g}</span>
                   ))}
                </div>
              </div>

              <div className="bg-brand-dark border border-brand-border rounded-[3rem] p-10">
                <h3 className="text-sm font-black text-white uppercase tracking-widest italic mb-4 border-l-4 border-brand-red pl-4">BÖLÜM OLUŞTURMA</h3>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                  AniList import sadece anime metadata kaydeder. Sezon ve bölüm eklemek için admin panelinden sezon oluştur.
                </p>
              </div>
            </div>

            <div className="space-y-8">
               <div className="bg-brand-dark border border-brand-border p-8 rounded-[3rem] space-y-6 shadow-2xl">
                  <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">AFİŞ VE BANNER</h3>
                  <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border border-white/10">
                    <img src={previewData.cover_image} className="w-full h-full object-cover" alt="Cover" />
                  </div>
                  <div className="aspect-video rounded-2xl overflow-hidden border border-white/10">
                    <img src={previewData.banner_image} className="w-full h-full object-cover" alt="Banner" />
                  </div>
               </div>

               <button 
                onClick={handleFinalImport}
                disabled={isSaving}
                className="w-full bg-brand-red hover:bg-brand-redHover text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-sm shadow-2xl shadow-brand-red/40 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
               >
                 {isSaving ? (
                   <>
                     <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                     AKTARILIYOR...
                   </>
                 ) : 'PLATFORMA AKTAR'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAutoImport;

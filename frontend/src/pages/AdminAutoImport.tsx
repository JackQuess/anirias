
import React, { useState, useEffect } from 'react';
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
  const [matchCandidates, setMatchCandidates] = useState<any[]>([]);
  const [selectedAnimeId, setSelectedAnimeId] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'existing' | 'new'>('new');
  const [nextSeasonNumber, setNextSeasonNumber] = useState<number>(1);

  const normalizeTitle = (title: string) => {
    return title
      .toLowerCase()
      .replace(/\bseason\s*\d+\b/g, '')
      .replace(/\b\d+(st|nd|rd|th)\s*season\b/g, '')
      .replace(/\b(sezon|sezonu)\s*\d+\b/g, '')
      .replace(/\b(part|cour)\s*\d+\b/g, '')
      .replace(/\b(iii|ii|iv|v|vi|vii|viii|ix|x|i)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  };

  useEffect(() => {
    const loadMatches = async () => {
      if (!previewData) return;
      try {
        const allAnimes = await db.getAllAnimes('created_at');
        const baseTitle = normalizeTitle(previewData.title);
        const matches = allAnimes.filter((a) => normalizeTitle(a.title?.romaji || a.title?.english || '') === baseTitle);
        setMatchCandidates(matches);
        if (matches.length > 0) {
          setImportMode('existing');
          setSelectedAnimeId(matches[0].id);
          const seasons = await db.getSeasons(matches[0].id);
          const seasonNumber = seasons.length > 0 ? Math.max(...seasons.map((s) => s.season_number)) + 1 : 1;
          setNextSeasonNumber(seasonNumber);
        } else {
          setImportMode('new');
          setSelectedAnimeId(null);
          setNextSeasonNumber(1);
        }
      } catch {
        setMatchCandidates([]);
      }
    };
    loadMatches();
  }, [previewData]);

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
    // AniList'ten gelen bölümleri işle
    // streamingEpisodes varsa isimleri al, yoksa placeholder oluştur
    const episodeCount = anilistData.episodes || 12;
    const episodes = [];

    for (let i = 1; i <= episodeCount; i++) {
      const streamEp = anilistData.streamingEpisodes?.find((se: any) => se.title.includes(`Episode ${i} `) || se.title.endsWith(`Episode ${i}`));
      episodes.push({
        number: i,
        title: streamEp ? streamEp.title.split('-').pop()?.trim() : `Bölüm ${i}`
      });
    }

    setPreviewData({
      anilist_id: anilistData.id,
      title: anilistData.title.romaji,
      description: anilistData.description || 'Açıklama bulunamadı.',
      year: anilistData.seasonYear || new Date().getFullYear(),
      score: anilistData.averageScore ? (anilistData.averageScore / 10).toFixed(1) : "0.0",
      genres: anilistData.genres || [],
      cover_image: anilistData.coverImage.extraLarge,
      banner_image: anilistData.bannerImage || anilistData.coverImage.extraLarge,
      episodes: episodes
    });
    setMatchCandidates([]);
    setSelectedAnimeId(null);
    setImportMode('new');
    setNextSeasonNumber(1);
    setSearchResults([]);
  };

  // 3. Aşama: Veritabanına Kaydetme
  const handleFinalImport = async () => {
    if (!previewData) return;
    setIsSaving(true);
    try {
      let anime = null;
      if (importMode === 'existing') {
        anime = selectedAnimeId ? await db.getAnimeById(selectedAnimeId) : null;
      }
      if (!anime) {
        anime = await db.createAnime({
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
      }
      const seasonNumber = importMode === 'existing' ? nextSeasonNumber : 1;
      const season = await db.createSeason({
        anime_id: anime.id,
        season_number: seasonNumber,
        title: `Sezon ${seasonNumber}`,
        anilist_id: previewData.anilist_id,
        year: previewData.year
      });

      // Bölümleri toplu veya sıralı oluştur
      for (const ep of previewData.episodes) {
        await db.createEpisode({
          anime_id: anime.id,
          season_id: season.id,
          season_number: seasonNumber,
          episode_number: ep.number,
          title: ep.title,
          duration_seconds: 1440,
          status: 'missing'
        });
      }

      alert(`'${previewData.title}' başarıyla sezona bağlandı!`);
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
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sezon Bağlantısı</p>
                  <div className="flex flex-col md:flex-row gap-4">
                    <button
                      onClick={() => setImportMode('existing')}
                      className={`flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        importMode === 'existing' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : 'bg-white/5 text-gray-500 border-white/10'
                      }`}
                    >
                      Mevcut Animeye Sezon Ekle
                    </button>
                    <button
                      onClick={() => setImportMode('new')}
                      className={`flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        importMode === 'new' ? 'bg-brand-red/20 text-white border-brand-red/40' : 'bg-white/5 text-gray-500 border-white/10'
                      }`}
                    >
                      Yeni Anime Oluştur
                    </button>
                  </div>
                  {importMode === 'existing' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Anime Seç</label>
                        <select
                          value={selectedAnimeId || ''}
                          onChange={(e) => setSelectedAnimeId(e.target.value)}
                          className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-brand-red"
                        >
                          <option value="">Seçiniz</option>
                          {matchCandidates.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.title?.romaji || a.title?.english || a.id}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Sezon No</label>
                        <input
                          type="number"
                          min={1}
                          value={nextSeasonNumber}
                          onChange={(e) => setNextSeasonNumber(parseInt(e.target.value) || 1)}
                          className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-brand-red"
                        />
                      </div>
                    </div>
                  )}
                  {importMode === 'new' && (
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Yeni anime olarak kaydedilecek</p>
                  )}
                </div>
                
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
                      <p className="text-2xl font-black text-white">{previewData.episodes.length}</p>
                   </div>
                </div>

                <div className="flex flex-wrap gap-2">
                   {previewData.genres.map((g: string) => (
                     <span key={g} className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black text-gray-500 uppercase border border-white/5">{g}</span>
                   ))}
                </div>
              </div>

              <div className="bg-brand-dark border border-brand-border rounded-[3rem] p-10">
                <h3 className="text-sm font-black text-white uppercase tracking-widest italic mb-8 border-l-4 border-brand-red pl-4">OTOMATİK OLUŞTURULACAK BÖLÜMLER</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {previewData.episodes.slice(0, 12).map((ep: any) => (
                    <div key={ep.number} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                       <span className="text-brand-red font-black text-xl italic">{ep.number < 10 ? `0${ep.number}` : ep.number}</span>
                       <span className="text-xs font-black text-white uppercase tracking-tight truncate">{ep.title}</span>
                    </div>
                  ))}
                  {previewData.episodes.length > 12 && (
                    <div className="col-span-full text-center p-4 text-[10px] font-black text-gray-700 uppercase tracking-widest">
                       + {previewData.episodes.length - 12} BÖLÜM DAHA EKLENECEK
                    </div>
                  )}
                </div>
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

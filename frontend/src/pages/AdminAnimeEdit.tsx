
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/services/db';
import { Anime } from '../types';
import LoadingSkeleton from '../components/LoadingSkeleton';

const AdminAnimeEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [anime, setAnime] = useState<Partial<Anime>>({
    title: { romaji: '', english: '' },
    description: '',
    year: new Date().getFullYear(),
    score: 8.0,
    genres: [],
    cover_image: '',
    banner_image: '',
    view_count: 0
  });

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [genreInput, setGenreInput] = useState('');

  useEffect(() => {
    if (!isNew && id) {
      db.getAnimeById(id).then(data => {
        if (data) {
          // Gelen verinin title yapısını kontrol et ve normalize et
          const normalizedTitle = typeof data.title === 'string' 
            ? { romaji: data.title, english: data.title }
            : data.title;
          setAnime({ ...data, title: normalizedTitle });
        }
        setLoading(false);
      });
    }
  }, [id, isNew]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await db.createAnime(anime);
      } else if (id) {
        await db.updateAnime(id, anime);
      }
      alert('Başarıyla kaydedildi!');
      navigate('/admin/animes');
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addGenre = () => {
    if (genreInput && !anime.genres?.includes(genreInput)) {
      setAnime({ ...anime, genres: [...(anime.genres || []), genreInput] });
      setGenreInput('');
    }
  };

  const removeGenre = (g: string) => {
    setAnime({ ...anime, genres: anime.genres?.filter(item => item !== g) });
  };

  if (loading) return <div className="p-10"><LoadingSkeleton type="banner" /></div>;

  const romajiTitle = anime.title && typeof anime.title !== 'string' ? anime.title.romaji : '';

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-6">
        <button onClick={() => navigate(-1)} className="p-4 bg-brand-dark border border-brand-border rounded-2xl text-gray-400 hover:text-brand-red transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            {isNew ? 'Yeni Anime' : 'Animeyi'} <span className="text-brand-red">{isNew ? 'Ekle' : 'Düzenle'}</span>
          </h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">İçerik Detaylarını Eksiksiz Doldurun</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-brand-dark border border-brand-border p-10 rounded-[2.5rem] shadow-2xl space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">ANIME BAŞLIĞI (ROMAJI)</label>
              <input 
                required
                value={romajiTitle} 
                onChange={e => {
                  const val = e.target.value;
                  setAnime({ ...anime, title: { romaji: val, english: val } });
                }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white font-black text-lg outline-none focus:border-brand-red transition-all"
                placeholder="Örn: Shingeki no Kyojin"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">AÇIKLAMA</label>
              <textarea 
                required
                rows={8}
                value={anime.description || ''} 
                onChange={e => setAnime({...anime, description: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white outline-none focus:border-brand-red transition-all resize-none leading-relaxed placeholder:text-gray-800"
                placeholder="Anime konusunu buraya yazın..."
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">YAYIN YILI</label>
                <input 
                  type="number"
                  value={anime.year || 2024} 
                  onChange={e => setAnime({...anime, year: parseInt(e.target.value)})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white font-black outline-none focus:border-brand-red transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">PLATFORM PUANI</label>
                <input 
                  type="number" step="0.1" max="10"
                  value={anime.score || 0} 
                  onChange={e => setAnime({...anime, score: parseFloat(e.target.value)})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-brand-red font-black outline-none focus:border-brand-red transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">KATEGORİLER</label>
               <div className="flex flex-wrap gap-3">
                 {anime.genres?.map(g => (
                   <span key={g} className="bg-brand-red/10 border border-brand-red/20 text-brand-red px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                     {g}
                     <button type="button" onClick={() => removeGenre(g)} className="hover:text-white">×</button>
                   </span>
                 ))}
               </div>
               <div className="flex gap-4">
                  <input 
                    value={genreInput}
                    onChange={e => setGenreInput(e.target.value)}
                    placeholder="Tür ekle (Örn: Aksiyon)"
                    className="flex-grow bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-brand-red"
                  />
                  <button type="button" onClick={addGenre} className="bg-white/5 hover:bg-white/10 text-white px-8 rounded-2xl font-black text-[10px] uppercase transition-all">EKLE</button>
               </div>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-brand-red hover:bg-brand-redHover text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-brand-red/30 disabled:opacity-50 transition-all active:scale-95"
          >
            {saving ? 'İŞLEM YAPILIYOR...' : (isNew ? 'ANİMEYİ OLUŞTUR' : 'DEĞİŞİKLİKLERİ KAYDET')}
          </button>
        </div>

        <div className="space-y-10">
          <div className="bg-brand-dark border border-brand-border p-10 rounded-[2.5rem] shadow-2xl space-y-8">
            <h3 className="text-sm font-black text-white uppercase tracking-widest border-l-4 border-brand-red pl-4 italic">Medya Arşivi</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">COVER IMAGE URL</label>
                <input 
                  value={anime.cover_image || ''} 
                  onChange={e => setAnime({...anime, cover_image: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-[10px] font-mono text-gray-400 outline-none"
                  placeholder="https://..."
                />
                {anime.cover_image && (
                   <img src={anime.cover_image} className="w-full aspect-[2/3] object-cover rounded-3xl border border-brand-border mt-4 shadow-xl" alt="Preview" />
                )}
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">BANNER IMAGE URL</label>
                <input 
                  value={anime.banner_image || ''} 
                  onChange={e => setAnime({...anime, banner_image: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-[10px] font-mono text-gray-400 outline-none"
                  placeholder="https://..."
                />
                {anime.banner_image && (
                   <img src={anime.banner_image} className="w-full aspect-video object-cover rounded-2xl border border-brand-border mt-4 shadow-xl" alt="Banner Preview" />
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminAnimeEdit;

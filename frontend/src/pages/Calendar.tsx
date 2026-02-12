
import React, { useState, useMemo, useEffect } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { CalendarEntry } from '../types';
import { Link } from 'react-router-dom';

const Calendar: React.FC = () => {
  const { data: calendar, loading, error, reload } = useLoad<CalendarEntry[]>(db.getCalendar);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0); // 0 = Today, 1 = Tomorrow, etc.
  const todayDate = useMemo(() => new Date(), []);
  const todayDateStr = todayDate.toISOString().split('T')[0];
  const tomorrowDate = useMemo(() => {
    const date = new Date(todayDate);
    date.setDate(date.getDate() + 1);
    return date;
  }, [todayDate]);
  const tomorrowDateStr = tomorrowDate.toISOString().split('T')[0];

  // Build day buttons for every day from today to the last scheduled air date.
  const days = useMemo(() => {
    const calendarDateStrs = (calendar || [])
      .map((entry) => entry.air_date.split('T')[0])
      .filter(Boolean);

    const lastDateStr = calendarDateStrs.length
      ? calendarDateStrs.reduce((max, curr) => (curr > max ? curr : max), todayDateStr)
      : todayDateStr;

    const allDateStrs: string[] = [];
    const cursor = new Date(`${todayDateStr}T00:00:00`);
    const end = new Date(`${lastDateStr}T00:00:00`);

    while (cursor <= end) {
      allDateStrs.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }

    return allDateStrs.map((dateStr, i) => {
      const date = new Date(`${dateStr}T00:00:00`);
      const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
      const dayShort = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      let label = dayName.toUpperCase();
      if (dateStr === todayDateStr) label = 'BUGÜN';
      if (dateStr === tomorrowDateStr) label = 'YARIN';

      return { index: i, label, dateStr, subLabel: dayShort };
    });
  }, [calendar, todayDateStr, tomorrowDateStr]);

  useEffect(() => {
    if (days.length === 0) return;
    if (selectedDayIndex > days.length - 1) {
      setSelectedDayIndex(0);
    }
  }, [days, selectedDayIndex]);

  const filteredCalendar = useMemo(() => {
    if (!calendar || !days.length) return [];
    // Filter by the selected date string (YYYY-MM-DD)
    const targetDateStr = days[selectedDayIndex].dateStr;
    return calendar.filter((entry) => entry.air_date.startsWith(targetDateStr));
  }, [calendar, selectedDayIndex, days]);

  const emptyStateTitle = days[selectedDayIndex]?.label
    ? `${days[selectedDayIndex].label} İÇİN KAYIT YOK`
    : 'KAYIT YOK';

  return (
    <div className="min-h-screen bg-brand-black pb-32">
      {/* Header Section */}
      <section className="pt-32 pb-16 border-b border-white/5 bg-gradient-to-b from-brand-red/5 to-transparent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-[1600px] mx-auto px-8 relative z-10">
          <h1 className="text-6xl md:text-8xl font-black text-white uppercase italic tracking-tighter leading-none mb-6">
            YAYIN <span className="text-brand-red">TAKVİMİ</span>
          </h1>
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.4em] max-w-lg leading-relaxed">
            Yayın planındaki tüm tarihleri görüntüle. Favori serilerinin yeni bölümlerini kaçırma.
          </p>
        </div>
      </section>

      {/* Day Selector */}
      <div className="sticky top-20 z-40 bg-brand-black/90 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 md:gap-4 py-6 min-w-max">
            {days.map((day) => (
              <button
                key={day.index}
                onClick={() => setSelectedDayIndex(day.index)}
                className={`px-6 md:px-8 py-4 rounded-2xl flex flex-col items-center justify-center min-w-[120px] transition-all ${
                  selectedDayIndex === day.index 
                    ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20 scale-105' 
                    : 'text-gray-500 hover:text-white border border-white/5 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-[10px] font-black tracking-widest">{day.label}</span>
                <span className="text-[9px] font-bold opacity-70 mt-1">{day.subLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-12">
        {loading && <LoadingSkeleton type="list" count={5} />}
        {error && <ErrorState message={error.message} onRetry={reload} />}

        {!loading && !error && filteredCalendar && (
          <div className="grid gap-6">
            {filteredCalendar.length > 0 ? (
              filteredCalendar.map((entry) => {
                const animeTitle = (() => {
                  if (!entry.animes?.title) return 'Adsız Anime';
                  if (typeof entry.animes.title === 'string') return entry.animes.title;
                  const anyTitle = entry.animes.title as any;
                  return anyTitle?.turkish || anyTitle?.english || anyTitle?.romaji || 'Adsız Anime';
                })();
                const statusLabel = (entry.status || '').toLowerCase() === 'published' ? 'Yayında' :
                  (entry.status || '').toLowerCase() === 'airing' ? 'Sitemizde' :
                  (entry.status || '').toLowerCase() === 'waiting' ? 'Bekleniyor' :
                  (entry.status || '') || 'Bekleniyor';
                const airTime = new Date(entry.air_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={entry.id} className="group relative flex flex-col md:flex-row items-center bg-brand-surface border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-brand-red/50 transition-all duration-500 animate-fade-in-up">
                    
                    {/* Time Column */}
                    <div className="w-full md:w-56 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 text-center bg-white/[0.02]">
                      <div className="text-5xl font-black text-white italic mb-2 tracking-tighter">
                        {airTime}
                      </div>
                      <div className="px-3 py-1 bg-brand-red/10 text-brand-red text-[9px] font-black uppercase tracking-widest rounded-lg">
                        Yayın Saati
                      </div>
                    </div>

                    {/* Anime Content */}
                    <div className="flex-grow p-8 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                      <div className="w-24 h-36 rounded-2xl overflow-hidden border border-white/10 shadow-xl group-hover:scale-105 transition-transform duration-500 flex-shrink-0">
                        <img 
                          src={entry.animes?.cover_image || ''} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          alt={animeTitle}
                        />
                      </div>
                      
                      <div className="flex-grow space-y-3">
                        <div>
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">YENİ BÖLÜM</span>
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mt-1 group-hover:text-brand-red transition-colors">
                              {animeTitle}
                            </h3>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10">
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                           {entry.season_number ? `Sezon ${entry.season_number} • ` : ''}Bölüm {entry.episode_number}
                        </p>
                        <p className="text-gray-500 text-[10px] font-semibold">
                           Saat: {airTime}
                        </p>
                        {entry.short_note && (
                          <p className="text-gray-500 text-[11px] font-semibold">{entry.short_note}</p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                         <Link to={`/watch/${(entry.anime || entry.animes)?.slug || entry.anime_id}/${entry.season_number || 1}/${entry.episode_number}`} className="bg-white text-brand-black px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-3">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            İZLE
                          </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-40 text-center bg-brand-dark/50 rounded-[3rem] border border-dashed border-white/5">
                <div className="text-6xl mb-6 opacity-20 grayscale">📅</div>
                <h3 className="text-2xl font-black text-gray-700 uppercase italic tracking-widest">{emptyStateTitle}</h3>
                <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-2">DİĞER GÜNLERİ KONTROL ET</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;

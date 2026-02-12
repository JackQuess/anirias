import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import type { PublicCalendarEntry } from '../types';

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatCountdown(airingAt: string) {
  const diff = new Date(airingAt).getTime() - Date.now();
  if (diff <= 0) return 'Yayinda';
  const minutes = Math.floor(diff / (60 * 1000));
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${mins}dk`;
  return `${mins}dk`;
}

const CalendarCard: React.FC<{ item: PublicCalendarEntry }> = ({ item }) => {
  const airingDate = new Date(item.airingAt);
  const airingTime = airingDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const airingDay = airingDate.toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: '2-digit' });

  return (
    <Link
      to={`/anime/${item.animeId}`}
      className="group block rounded-3xl border border-white/10 bg-brand-surface/80 p-5 hover:border-brand-red/50 transition-all"
    >
      <div className="flex items-center gap-4">
        <img
          src={item.coverImage || ''}
          alt={item.title}
          referrerPolicy="no-referrer"
          className="h-20 w-14 rounded-xl border border-white/10 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{airingDay}</p>
          <h3 className="truncate text-lg font-black uppercase italic tracking-tight text-white group-hover:text-brand-red">
            {item.title}
          </h3>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Bolum {item.episodeNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">{airingTime}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{formatCountdown(item.airingAt)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
          {item.statusBadge}
        </span>
      </div>
    </Link>
  );
};

const CalendarSection: React.FC<{ title: string; items: PublicCalendarEntry[]; empty: string }> = ({ title, items, empty }) => (
  <section className="space-y-4">
    <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">{title}</h2>
    {items.length > 0 ? (
      <div className="grid gap-4">{items.map((item) => <CalendarCard key={`${item.animeId}-${item.episodeNumber}`} item={item} />)}</div>
    ) : (
      <div className="rounded-3xl border border-dashed border-white/10 bg-brand-dark/40 py-10 text-center text-xs font-black uppercase tracking-widest text-gray-600">
        {empty}
      </div>
    )}
  </section>
);

const Calendar: React.FC = () => {
  const fetchCalendar = useCallback(() => db.getPublicCalendar(undefined, 21), []);
  const { data, loading, error, reload } = useLoad<PublicCalendarEntry[]>(fetchCalendar, []);

  const grouped = useMemo(() => {
    const entries = data || [];
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const today: PublicCalendarEntry[] = [];
    const thisWeek: PublicCalendarEntry[] = [];
    const upcoming: PublicCalendarEntry[] = [];

    for (const item of entries) {
      const airing = new Date(item.airingAt);
      if (isSameLocalDay(airing, now)) {
        today.push(item);
      } else if (airing <= weekEnd) {
        thisWeek.push(item);
      } else {
        upcoming.push(item);
      }
    }

    return { today, thisWeek, upcoming };
  }, [data]);

  return (
    <div className="min-h-screen bg-brand-black pb-24">
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-brand-red/5 to-transparent pb-14 pt-28">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-brand-red/10 blur-[100px]" />
        <div className="relative z-10 mx-auto max-w-[1200px] px-6">
          <h1 className="mb-4 text-5xl font-black uppercase italic tracking-tighter text-white md:text-7xl">
            Yayin <span className="text-brand-red">Takvimi</span>
          </h1>
          <p className="max-w-xl text-xs font-black uppercase tracking-[0.35em] text-gray-500">
            Bugun, bu hafta ve yaklasan bolumler tek ekranda.
          </p>
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-[1200px] space-y-10 px-6">
        {loading && <LoadingSkeleton type="list" count={6} />}
        {error && <ErrorState message={error.message} onRetry={reload} />}

        {!loading && !error && (
          <>
            <CalendarSection title="Today" items={grouped.today} empty="Bugun icin kayit yok" />
            <CalendarSection title="This Week" items={grouped.thisWeek} empty="Bu hafta yeni kayit yok" />
            <CalendarSection title="Upcoming" items={grouped.upcoming} empty="Yakin donemde kayit yok" />
          </>
        )}
      </div>
    </div>
  );
};

export default Calendar;

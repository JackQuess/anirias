import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import PageHero from '@/components/cinematic/PageHero';
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
  if (diff <= 0) return 'Yayında';
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
      className="group block rounded-2xl border border-white/10 bg-surface-elevated/80 backdrop-blur-sm p-5 hover:border-primary/45 transition-all shadow-lg shadow-black/20"
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
          <h3 className="truncate text-lg font-black uppercase italic tracking-tight text-white group-hover:text-primary">
            {item.title}
          </h3>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Bölüm {item.episodeNumber}</p>
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

const CalendarSection: React.FC<{ title: string; items: PublicCalendarEntry[]; empty: string }> = ({
  title,
  items,
  empty,
}) => (
  <section className="space-y-5">
    <div className="flex items-center gap-4">
      <div className="w-1 h-8 bg-primary shadow-[0_0_12px_rgba(229,9,20,0.35)] shrink-0 rounded-full" />
      <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-white">{title}</h2>
    </div>
    {items.length > 0 ? (
      <div className="grid gap-4">{items.map((item) => <CalendarCard key={`${item.animeId}-${item.episodeNumber}`} item={item} />)}</div>
    ) : (
      <div className="rounded-2xl border border-dashed border-white/10 bg-surface-elevated/40 py-10 text-center text-xs font-black uppercase tracking-widest text-muted">
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
    <div className="min-h-screen bg-background pb-mobile-nav md:pb-12 font-inter">
      <PageHero
        title="Yayın Takvimi"
        description="Haftalık yayın akışını takip et. Hangi gün hangi anime yayınlanıyor, anında öğren."
        image="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1920"
        className="rounded-none mb-0 h-[400px] md:h-[500px]"
      />

      <div className="mx-auto -mt-20 relative z-20 max-w-[1200px] space-y-12 px-4 md:px-10 pt-4 md:pt-6">
        {loading && <LoadingSkeleton type="list" count={6} />}
        {error && <ErrorState message={error.message} onRetry={reload} />}

        {!loading && !error && (
          <>
            <CalendarSection title="Bugün" items={grouped.today} empty="Bugün için kayıt yok" />
            <CalendarSection title="Bu hafta" items={grouped.thisWeek} empty="Bu hafta yeni kayıt yok" />
            <CalendarSection title="Yakında" items={grouped.upcoming} empty="Yakın dönemde kayıt yok" />
          </>
        )}
      </div>
    </div>
  );
};

export default Calendar;

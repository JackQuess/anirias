import React from 'react';
import { Link } from 'react-router-dom';
import { Store, Smartphone, Tv, Monitor, Download, ChevronLeft } from 'lucide-react';
import PageHero from '@/components/cinematic/PageHero';
import { cn } from '@/lib/utils';
import { appDownloadLinks, hasAppUrl } from '@/config/apps';

type AppCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  actionLabel: string;
  disabled?: boolean;
  badge?: string;
};

const AppCard: React.FC<AppCardProps> = ({ icon, title, description, href, actionLabel, disabled, badge }) => {
  const canDownload = !disabled && href && hasAppUrl(href);

  const inner = (
    <>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary shadow-inner">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-lg font-black uppercase italic tracking-tight text-white">{title}</h2>
            {badge ? (
              <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/55">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-white/55">{description}</p>
        </div>
      </div>
      <div className="mt-6 pt-5 border-t border-white/5">
        {canDownload ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5',
              'text-center text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-primary/25',
              'transition-all hover:bg-primary/90 hover:shadow-primary/35 active:scale-[0.99]'
            )}
          >
            <Download className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            {actionLabel}
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={cn(
              'inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/10',
              'bg-white/[0.04] px-5 py-3.5 text-center text-xs font-black uppercase tracking-[0.2em] text-white/35'
            )}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </>
  );

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#0c0c10] p-6 shadow-xl shadow-black/40 transition-colors hover:border-white/15">
      {inner}
    </article>
  );
};

const Apps: React.FC = () => {
  const { playStore, androidApk, tvApk } = appDownloadLinks;

  return (
    <div className="min-h-screen bg-background font-inter pb-mobile-nav md:pb-24">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-12 lg:px-16 pt-6 sm:pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/45 hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Ana sayfa
        </Link>

        <PageHero
          title="Uygulamalar"
          description="Anirias’ı telefon, TV ve masaüstünde deneyimle. Resmi kanallardan güvenle indir."
          className="rounded-none mb-8 md:rounded-2xl"
        />

        <div className="max-w-5xl mx-auto space-y-10 pb-16">
          <div
            role="status"
            className="rounded-2xl border border-violet-500/25 bg-violet-950/35 px-5 py-4 text-sm leading-relaxed text-violet-100/90 shadow-[0_0_40px_-12px_rgba(139,92,246,0.35)]"
          >
            <p className="font-semibold text-violet-200/95 mb-1 text-xs uppercase tracking-[0.2em]">Kurulum notu</p>
            <p className="text-white/80">
              Android APK güncellemesi yapıyorsanız önce cihazdaki mevcut uygulamayı kaldırıp ardından yeni APK’yı
              yüklemeniz önerilir. Kaynak bilinmeyen dosyaları yüklemeyin.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-2 xl:max-w-5xl xl:mx-auto">
            <AppCard
              icon={<Store className="h-7 w-7" strokeWidth={2} />}
              title="Google Play"
              description="Android telefon ve tablet için resmi mağaza sürümü. Otomatik güncellemeler ve güvenli kurulum."
              href={hasAppUrl(playStore) ? playStore : undefined}
              actionLabel={hasAppUrl(playStore) ? 'Play Store’da aç' : 'Bağlantı hazırlanıyor'}
            />
            <AppCard
              icon={<Smartphone className="h-7 w-7" strokeWidth={2} />}
              title="Mobil (APK)"
              description="Mağaza dışı kurulum veya test için doğrudan APK dosyası. Yalnızca bu sayfadaki resmi bağlantıyı kullanın."
              href={hasAppUrl(androidApk) ? androidApk : undefined}
              actionLabel={hasAppUrl(androidApk) ? 'APK indir' : 'Bağlantı hazırlanıyor'}
            />
            <AppCard
              icon={<Tv className="h-7 w-7" strokeWidth={2} />}
              title="TV uygulaması"
              description="Android TV ve uyumlu cihazlar için büyük ekran deneyimi. Kumanda ile kolay gezinme."
              href={hasAppUrl(tvApk) ? tvApk : undefined}
              actionLabel={hasAppUrl(tvApk) ? 'TV APK indir' : 'Bağlantı hazırlanıyor'}
            />
            <AppCard
              icon={<Monitor className="h-7 w-7" strokeWidth={2} />}
              title="Masaüstü"
              description="Windows, macOS ve Linux için yerel uygulama üzerinde çalışıyoruz."
              disabled
              badge="Yakında"
              actionLabel="Yakında"
            />
          </div>

          <p className="text-center text-[11px] font-medium uppercase tracking-[0.25em] text-white/35">
            Bağlantılar yayına alındığında otomatik olarak aktif olur · Sorular için{' '}
            <Link to="/iletisim" className="text-primary/90 hover:text-primary transition-colors">
              iletişim
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Apps;

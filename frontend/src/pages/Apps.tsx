import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Download,
  Monitor,
  Smartphone,
  Store,
  Tv,
  Apple,
  Shield,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { appDownloadLinks, hasAppUrl } from '@/config/apps';
import { DESKTOP_ACCESS_PAGE } from '@/config/desktop';

const ACCENT = '#e5193e';

type Platform = 'android' | 'tv' | 'desktop' | 'ios';

const TABS: { id: Platform; label: string; badge?: string }[] = [
  { id: 'android', label: 'Android' },
  { id: 'tv', label: 'TV' },
  { id: 'desktop', label: 'Masaüstü' },
  { id: 'ios', label: 'iOS', badge: 'Yakında' },
];

function StatusBadge({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'accent' | 'soon' | 'success';
}) {
  const styles = {
    neutral: 'border-white/10 bg-white/[0.06] text-white/65',
    accent: 'border-[#e5193e]/35 bg-[#e5193e]/10 text-[#e5193e]',
    soon: 'border-amber-500/25 bg-amber-500/10 text-amber-200/90',
    success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200/90',
  }[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]',
        styles,
      )}
    >
      {children}
    </span>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[min(100%,280px)] sm:w-[300px]">
      <div
        className="absolute -inset-8 rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(ellipse at center, ${ACCENT}33, transparent 65%)` }}
        aria-hidden
      />
      {/* Device frame */}
      <div className="relative rounded-[2.75rem] border-[3px] border-zinc-700/80 bg-gradient-to-b from-zinc-800 to-zinc-950 p-2 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="absolute left-1/2 top-3 h-6 w-24 -translate-x-1/2 rounded-full bg-black/80" aria-hidden />
        <div className="overflow-hidden rounded-[2.25rem] bg-[#060608] ring-1 ring-white/[0.06]">
          <div className="aspect-[9/19] flex flex-col bg-gradient-to-b from-[#0f0f12] via-[#08080c] to-black">
            <div className="flex h-11 items-center justify-between px-4 pt-2">
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/35">9:41</span>
              <div className="flex gap-1">
                <span className="h-2.5 w-4 rounded-sm bg-white/15" />
              </div>
            </div>
            <div className="px-4 pt-2">
              <p className="text-[11px] font-black uppercase italic tracking-tight text-white">
                ANIRIAS<span style={{ color: ACCENT }}>.</span>
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/35">Premium anime</p>
            </div>
            <div className="mt-4 mx-3 h-28 rounded-xl bg-gradient-to-br from-[#e5193e]/25 via-white/[0.04] to-transparent ring-1 ring-white/[0.08]" />
            <div className="mt-3 space-y-2 px-3">
              {[0.85, 0.65, 0.45].map((o, i) => (
                <div
                  key={i}
                  className="h-2 rounded-full bg-white/[0.06]"
                  style={{ width: `${o * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-auto flex justify-center gap-5 pb-6 pt-4">
              <span className="h-1 w-8 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrCard({ url }: { url: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&color=ffffff&bgcolor=0b0b0b&data=${encodeURIComponent(url)}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.04] p-4 shadow-xl backdrop-blur-xl backdrop-saturate-150 sm:p-5"
      style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 24px 48px -12px rgba(0,0,0,0.5), 0 0 60px -24px ${ACCENT}40` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          background: `radial-gradient(120% 80% at 80% 0%, ${ACCENT}, transparent 55%)`,
        }}
      />
      <p className="relative text-[9px] font-black uppercase tracking-[0.28em] text-white/45">Hızlı kurulum</p>
      <p className="relative mt-1 text-sm font-bold text-white">QR ile aç</p>
      <div className="relative mt-4 flex justify-center rounded-xl bg-black/50 p-3 ring-1 ring-white/[0.08]">
        <img src={src} alt="İndirme bağlantısı için QR kod" width={140} height={140} className="rounded-lg opacity-95" loading="lazy" />
      </div>
      <p className="relative mt-3 text-center text-[10px] leading-relaxed text-white/40">
        Kameranı aç, kodu tara — güvenli indirme sayfasına yönlendirilirsin.
      </p>
    </motion.div>
  );
}

type DownloadCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  actionLabel: string;
  external?: boolean;
  disabled?: boolean;
  badge?: string;
  badgeVariant?: 'recommended' | 'soon' | 'dev';
};

function DownloadCard({
  icon,
  title,
  description,
  href,
  actionLabel,
  external,
  disabled,
  badge,
  badgeVariant = 'recommended',
}: DownloadCardProps) {
  const canAct = !disabled && href;

  const badgeCls =
    badgeVariant === 'recommended'
      ? 'border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-200'
      : badgeVariant === 'soon'
        ? 'border-amber-500/30 bg-amber-500/[0.1] text-amber-200'
        : 'border-violet-500/30 bg-violet-500/[0.1] text-violet-200';

  const content = (
    <>
      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-transparent text-white shadow-inner ring-1 ring-white/[0.04]">
          {icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black uppercase italic tracking-tight text-white md:text-2xl">{title}</h3>
            {badge ? (
              <span
                className={cn(
                  'rounded-md border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider',
                  badgeCls,
                )}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/50 md:text-[15px]">{description}</p>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3 border-t border-white/[0.06] pt-6">
        {canAct ? (
          external ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'group inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-xl px-6 py-4',
                'text-xs font-black uppercase tracking-[0.2em] text-white transition-all',
                'bg-[#e5193e] shadow-lg hover:shadow-[0_0_40px_-8px_rgba(229,25,62,0.55)] hover:brightness-110 active:scale-[0.99]',
              )}
            >
              <Download className="h-4 w-4" strokeWidth={2.5} />
              {actionLabel}
              <ExternalLink className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ) : (
            <Link
              to={href!}
              className={cn(
                'group inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-xl px-6 py-4',
                'text-xs font-black uppercase tracking-[0.2em] text-white transition-all',
                'bg-[#e5193e] shadow-lg hover:shadow-[0_0_40px_-8px_rgba(229,25,62,0.55)] hover:brightness-110 active:scale-[0.99]',
              )}
            >
              <Download className="h-4 w-4" strokeWidth={2.5} />
              {actionLabel}
            </Link>
          )
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex flex-1 min-w-[200px] cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/30"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </>
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2 }}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 md:p-8',
        'bg-gradient-to-br from-white/[0.06] via-transparent to-transparent backdrop-blur-md',
        'shadow-[0_24px_64px_-24px_rgba(0,0,0,0.7)] transition-[border-color,box-shadow] duration-300',
        'hover:border-[#e5193e]/25 hover:shadow-[0_0_0_1px_rgba(229,25,62,0.12),0_32px_64px_-28px_rgba(0,0,0,0.8)]',
      )}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: ACCENT }}
      />
      <div className="relative">{content}</div>
    </motion.article>
  );
}

const Apps: React.FC = () => {
  const { playStore, androidApk, tvApk } = appDownloadLinks;
  const [platform, setPlatform] = useState<Platform>('android');

  const qrTarget = useMemo(() => {
    if (hasAppUrl(playStore)) return playStore;
    return typeof window !== 'undefined' ? `${window.location.origin}/uygulamalar` : 'https://anirias.com/uygulamalar';
  }, [playStore]);

  return (
    <div className="min-h-screen bg-[#050508] font-inter pb-mobile-nav md:pb-24">
      {/* Cinematic background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            background: `radial-gradient(ellipse 90% 60% at 50% -10%, ${ACCENT}22, transparent 55%), radial-gradient(ellipse 70% 50% at 100% 40%, rgba(229,25,62,0.08), transparent 50%)`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,8,0.3)_0%,#050508_45%,#050508_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-12 xl:px-16 pt-6 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-[#e5193e]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>

        {/* Hero */}
        <section className="mt-8 grid items-center gap-12 lg:grid-cols-[1fr_min(420px,1fr)] lg:gap-16 xl:gap-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#e5193e]/90">Resmi indirme merkezi</p>
            <h1 className="mt-4 text-4xl font-black uppercase italic leading-[0.95] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-7xl">
              ANIRIAS
              <span className="block mt-1 text-white/90 not-italic font-black text-3xl sm:text-4xl md:text-5xl tracking-tight normal-case">
                Her ekranda.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/55 md:text-lg">
              Sinematik anime deneyimini telefon, TV ve masaüstünde yaşa. Yalnızca bu sayfadaki bağlantılar resmi kaynak
              kabul edilir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <StatusBadge variant="success">
                <Shield className="h-3 w-3" />
                Güvenli kaynak
              </StatusBadge>
              <StatusBadge variant="accent">
                <Sparkles className="h-3 w-3" />
                Güncel sürüm
              </StatusBadge>
              <StatusBadge variant="neutral">
                <CheckCircle2 className="h-3 w-3" />
                Ücretsiz kurulum
              </StatusBadge>
            </div>
          </motion.div>

          <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center lg:flex-col lg:items-end xl:flex-row xl:items-center xl:justify-end">
            <PhoneMockup />
            <QrCard url={qrTarget} />
          </div>
        </section>

        {/* Platform tabs */}
        <div className="mt-16 md:mt-20">
          <p className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.35em] text-white/35 md:text-left">
            Platform seç
          </p>
          <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2 backdrop-blur-md md:justify-start md:inline-flex">
            {TABS.map((tab) => {
              const active = platform === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPlatform(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 rounded-xl px-5 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all',
                    active ? 'text-white' : 'text-white/45 hover:text-white/75',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="apps-tab-pill"
                      className="absolute inset-0 rounded-xl bg-[#e5193e] shadow-lg shadow-[#e5193e]/25"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {tab.label}
                    {tab.badge ? (
                      <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[8px] tracking-wider text-white/80">
                        {tab.badge}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Download cards by platform */}
        <section className="mt-10 md:mt-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={platform}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid gap-6 md:gap-8 lg:grid-cols-2"
            >
              {platform === 'android' && (
                <>
                  <DownloadCard
                    icon={<Store className="h-8 w-8" strokeWidth={1.75} />}
                    title="Google Play"
                    description="Android telefon ve tablet için resmi mağaza. Otomatik güncellemeler ve doğrulanmış dağıtım."
                    href={hasAppUrl(playStore) ? playStore : undefined}
                    actionLabel={hasAppUrl(playStore) ? "Play Store'da aç" : 'Bağlantı hazırlanıyor'}
                    external
                    badge="Önerilen"
                    badgeVariant="recommended"
                  />
                  <DownloadCard
                    icon={<Smartphone className="h-8 w-8" strokeWidth={1.75} />}
                    title="Mobil APK"
                    description="Doğrudan paket indirme. Yalnızca bu sayfadaki bağlantıyı kullanın; başka kaynaklardan yüklemeyin."
                    href={hasAppUrl(androidApk) ? androidApk : undefined}
                    actionLabel={hasAppUrl(androidApk) ? 'APK indir' : 'Bağlantı hazırlanıyor'}
                    external
                    badge={hasAppUrl(androidApk) ? 'Resmi bağlantı' : 'Hazırlanıyor'}
                    badgeVariant={hasAppUrl(androidApk) ? 'recommended' : 'dev'}
                  />
                </>
              )}
              {platform === 'tv' && (
                <div className="flex justify-center lg:col-span-2">
                  <div className="w-full max-w-xl">
                    <DownloadCard
                      icon={<Tv className="h-8 w-8" strokeWidth={1.75} />}
                      title="TV uygulaması"
                      description="Android TV ve uyumlu set üstü kutular için büyük ekran arayüzü. Kumanda ile hızlı gezinme."
                      href={hasAppUrl(tvApk) ? tvApk : undefined}
                      actionLabel={hasAppUrl(tvApk) ? 'TV APK indir' : 'Bağlantı hazırlanıyor'}
                      external
                      badge={hasAppUrl(tvApk) ? 'Önerilen' : 'Yakında'}
                      badgeVariant={hasAppUrl(tvApk) ? 'recommended' : 'soon'}
                    />
                  </div>
                </div>
              )}
              {platform === 'desktop' && (
                <div className="flex justify-center lg:col-span-2">
                  <div className="w-full max-w-xl">
                    <DownloadCard
                      icon={<Monitor className="h-8 w-8" strokeWidth={1.75} />}
                      title="Masaüstü"
                      description="Windows, macOS ve Linux için yerel uygulama. İndirme için giriş ve uygun üyelik gerekebilir."
                      href={DESKTOP_ACCESS_PAGE}
                      actionLabel="Masaüstü erişimi"
                      external={false}
                      badge="PRO MAX"
                      badgeVariant="dev"
                    />
                  </div>
                </div>
              )}
              {platform === 'ios' && (
                <div className="lg:col-span-2">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-10 text-center backdrop-blur-md md:p-14"
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/80">
                      <Apple className="h-9 w-9" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-6 text-2xl font-black uppercase italic tracking-tight text-white md:text-3xl">
                      iOS <span style={{ color: ACCENT }}>yakında</span>
                    </h3>
                    <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/50">
                      iPhone ve iPad için uygulama üzerinde çalışıyoruz. Yayınlandığında bu sayfadan duyuracağız.
                    </p>
                    <div className="mt-6 flex justify-center">
                      <StatusBadge variant="soon">Yakında</StatusBadge>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Installation banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative mt-14 overflow-hidden rounded-3xl border border-[#e5193e]/20 bg-gradient-to-r from-[#e5193e]/[0.08] via-white/[0.04] to-transparent p-6 backdrop-blur-md md:mt-20 md:p-8"
        >
          <div
            className="pointer-events-none absolute -right-24 top-0 h-full w-1/2 opacity-20"
            style={{ background: `linear-gradient(90deg, transparent, ${ACCENT})` }}
          />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e5193e]">Kurulum notu</p>
          <p className="relative mt-3 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
            Android APK güncellemesi yapıyorsanız, mümkünse mevcut uygulamayı kaldırıp ardından yeni APK’yı yükleyin.
            Bilinmeyen kaynaklardan dosya indirmeyin — yalnızca bu resmi sayfadaki bağlantıları kullanın.
          </p>
        </motion.div>

        {/* Footer note */}
        <footer className="mt-12 border-t border-white/[0.06] py-10 text-center md:mt-16 md:py-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/35">
            Bağlantılar yapılandırıldığında otomatik aktif olur · Resmi destek için{' '}
            <Link to="/iletisim" className="text-[#e5193e]/90 transition-colors hover:text-[#e5193e]">
              iletişim
            </Link>
          </p>
          <p className="mt-3 text-xs text-white/25">© {new Date().getFullYear()} ANIRIAS — Tüm hakları saklıdır.</p>
        </footer>
      </div>
    </div>
  );
};

export default Apps;

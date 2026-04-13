import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
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
const ACCENT_SOFT = 'rgba(229, 25, 62, 0.38)';
const PURPLE_SOFT = 'rgba(124, 58, 237, 0.14)';

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

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
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative mx-auto w-[min(100%,280px)] sm:w-[300px]"
      animate={reduceMotion ? undefined : { y: [0, -9, 0] }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 5.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.2 }
      }
    >
      {/* Ground contact shadow */}
      <div
        className="pointer-events-none absolute -bottom-10 left-1/2 h-14 w-[108%] max-w-[320px] -translate-x-1/2 rounded-[100%] bg-black/75 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-6 left-1/2 h-8 w-[72%] max-w-[220px] -translate-x-1/2 rounded-[100%] bg-[#e5193e]/[0.12] blur-xl"
        aria-hidden
      />

      {/* Halo + ambient behind device */}
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] h-[min(115%,400px)] w-[min(108%,340px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.55] blur-[56px]"
        style={{
          background: `radial-gradient(ellipse 70% 65% at 50% 45%, ${ACCENT_SOFT}, ${PURPLE_SOFT} 42%, transparent 72%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -inset-10 rounded-full opacity-35 blur-3xl"
        style={{
          background: `radial-gradient(ellipse at center, ${ACCENT}40, rgba(139, 92, 246, 0.12) 52%, transparent 68%)`,
        }}
        aria-hidden
      />

      {/* Device frame */}
      <div
        className="relative rounded-[2.75rem] border-[3px] border-zinc-600/75 bg-gradient-to-b from-zinc-800 to-zinc-950 p-2 shadow-[0_52px_100px_-28px_rgba(0,0,0,0.92),0_28px_56px_-20px_rgba(0,0,0,0.68),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-white/[0.04]"
      >
        <div className="absolute left-1/2 top-3 h-6 w-24 -translate-x-1/2 rounded-full bg-black/80" aria-hidden />
        <div className="overflow-hidden rounded-[2.25rem] bg-[#060608] ring-1 ring-white/[0.07]">
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
    </motion.div>
  );
}

function QrCard({ url }: { url: string }) {
  const reduceMotion = useReducedMotion();
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&color=ffffff&bgcolor=0b0b0b&data=${encodeURIComponent(url)}`;
  const host = useMemo(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }, [url]);

  const steps = [
    { n: '01', t: 'Kamerayı aç' },
    { n: '02', t: 'Kodu çerçeveye hizala' },
    { n: '03', t: 'Resmi sayfaya git' },
  ];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16, x: 8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.55, delay: reduceMotion ? 0 : 0.12, ease: easeOutExpo }}
      className="relative w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.045] p-4 shadow-xl backdrop-blur-xl backdrop-saturate-150 sm:max-w-none sm:p-5"
      style={{
        boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 28px 56px -16px rgba(0,0,0,0.55), 0 0 80px -30px ${ACCENT}45`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          background: `radial-gradient(130% 90% at 90% -10%, ${ACCENT}, rgba(124,58,237,0.08) 40%, transparent 58%)`,
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#e5193e]/85">Mobil kurulum</p>
          <p className="mt-1.5 text-base font-black tracking-tight text-white">QR ile indir</p>
          <p className="mt-1 max-w-[200px] text-[11px] leading-snug text-white/45">
            Tek tarama; yalnızca doğrulanmış bağlantıya gidersin.
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#e5193e] shadow-inner">
          <Smartphone className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>

      <ol className="relative mt-4 space-y-2 border-t border-white/[0.07] pt-4">
        {steps.map((s) => (
          <li key={s.n} className="flex items-center gap-3 text-[11px] text-white/55">
            <span className="w-7 shrink-0 font-mono text-[9px] font-bold tabular-nums text-white/30">{s.n}</span>
            <span className="font-medium text-white/70">{s.t}</span>
          </li>
        ))}
      </ol>

      <div className="relative mt-4 flex justify-center rounded-xl bg-gradient-to-b from-black/55 to-black/40 p-3.5 ring-1 ring-white/[0.1]">
        <img src={src} alt="İndirme bağlantısı için QR kod" width={136} height={136} className="rounded-[10px] opacity-[0.97]" loading="lazy" />
      </div>

      <div className="relative mt-3 flex items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2">
        <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-400/90" strokeWidth={2.2} />
        <p className="text-center text-[10px] font-medium leading-snug text-white/45">
          Hedef: <span className="text-white/65">{host || 'resmi bağlantı'}</span>
        </p>
      </div>
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
  const reduceMotion = useReducedMotion();
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
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-transparent text-white shadow-inner ring-1 ring-white/[0.04] transition-[transform,border-color,background-color] duration-300 group-hover/card:scale-[1.04] group-hover/card:border-white/[0.14] group-hover/card:from-white/[0.11]">
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
            <motion.a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={reduceMotion ? undefined : { scale: 1.02, y: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              className={cn(
                'group/cta relative inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-4',
                'text-xs font-black uppercase tracking-[0.2em] text-white',
                'bg-gradient-to-b from-[#ff2d55] to-[#e5193e] shadow-[0_12px_44px_-12px_rgba(229,25,62,0.68),inset_0_1px_0_rgba(255,255,255,0.18)]',
                'ring-1 ring-white/25 transition-[filter,box-shadow] duration-300 hover:shadow-[0_18px_52px_-10px_rgba(229,25,62,0.78),inset_0_1px_0_rgba(255,255,255,0.22)] hover:brightness-[1.06]',
              )}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/14 to-transparent opacity-0 transition-opacity duration-500 group-hover/cta:opacity-100" />
              <Download className="relative h-4 w-4" strokeWidth={2.5} />
              <span className="relative">{actionLabel}</span>
              <ExternalLink className="relative h-3.5 w-3.5 opacity-80 transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </motion.a>
          ) : (
            <Link
              to={href!}
              className={cn(
                'group/cta relative inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-4',
                'text-xs font-black uppercase tracking-[0.2em] text-white',
                'bg-gradient-to-b from-[#ff2d55] to-[#e5193e] shadow-[0_12px_44px_-12px_rgba(229,25,62,0.68),inset_0_1px_0_rgba(255,255,255,0.18)]',
                'ring-1 ring-white/25 transition-[transform,filter,box-shadow] duration-300 hover:scale-[1.02] hover:-translate-y-px hover:shadow-[0_18px_52px_-10px_rgba(229,25,62,0.78),inset_0_1px_0_rgba(255,255,255,0.22)] hover:brightness-[1.06] active:scale-[0.99]',
              )}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/14 to-transparent opacity-0 transition-opacity duration-500 group-hover/cta:opacity-100" />
              <Download className="relative h-4 w-4" strokeWidth={2.5} />
              <span className="relative">{actionLabel}</span>
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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOutExpo }}
      whileHover={
        reduceMotion
          ? undefined
          : { y: -4, transition: { type: 'spring', stiffness: 380, damping: 26 } }
      }
      className={cn(
        'group/card relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 md:p-8',
        'bg-gradient-to-br from-white/[0.06] via-transparent to-transparent backdrop-blur-md',
        'shadow-[0_24px_64px_-24px_rgba(0,0,0,0.7)] transition-[border-color,box-shadow] duration-500 ease-out',
        'hover:border-[#e5193e]/28 hover:shadow-[0_0_0_1px_rgba(229,25,62,0.14),0_36px_72px_-28px_rgba(0,0,0,0.82),0_0_48px_-20px_rgba(229,25,62,0.08)]',
      )}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover/card:opacity-45"
        style={{ background: ACCENT }}
      />
      <div className="relative">{content}</div>
    </motion.article>
  );
}

const Apps: React.FC = () => {
  const reduceMotion = useReducedMotion();
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

        {/* Hero — ambient glow + split entrance */}
        <section className="relative mt-8">
          <div
            className="pointer-events-none absolute -inset-x-10 -inset-y-8 z-0 lg:-inset-x-16 lg:-inset-y-12"
            aria-hidden
          >
            <div
              className="absolute left-[42%] top-[48%] h-[min(88vw,620px)] w-[min(125vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.38] blur-[96px] sm:left-1/2"
              style={{
                background: `radial-gradient(ellipse 56% 50% at 50% 50%, ${ACCENT_SOFT}, rgba(124, 58, 237, 0.18) 40%, transparent 70%)`,
              }}
            />
            <div
              className="absolute right-[-6%] top-[22%] hidden h-[min(65vw,480px)] w-[min(85vw,560px)] rounded-full opacity-[0.2] blur-[88px] md:block"
              style={{
                background: 'radial-gradient(circle at center, rgba(124, 58, 237, 0.28), transparent 65%)',
              }}
            />
            <div
              className="absolute left-[8%] top-[18%] h-[min(50vw,360px)] w-[min(70vw,420px)] rounded-full opacity-[0.14] blur-[72px]"
              style={{
                background: `radial-gradient(circle at center, ${ACCENT}35, transparent 68%)`,
              }}
            />
          </div>

          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1fr_min(420px,1fr)] lg:gap-16 xl:gap-24">
          <motion.div
            initial={
              reduceMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: -36, y: 12 }
            }
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{
              duration: reduceMotion ? 0.01 : 0.72,
              ease: easeOutExpo,
              delay: reduceMotion ? 0 : 0.02,
            }}
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

          <motion.div
            initial={
              reduceMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: 36, y: 16 }
            }
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{
              duration: reduceMotion ? 0.01 : 0.74,
              ease: easeOutExpo,
              delay: reduceMotion ? 0 : 0.1,
            }}
            className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center lg:flex-col lg:items-end xl:flex-row xl:items-center xl:justify-end"
          >
            <PhoneMockup />
            <QrCard url={qrTarget} />
          </motion.div>
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
                    'relative flex items-center gap-2 rounded-xl px-5 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-colors duration-300',
                    active ? 'text-white' : 'text-white/45 hover:text-white/78',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="apps-tab-pill"
                      className="absolute inset-0 rounded-xl bg-[#e5193e] shadow-lg shadow-[#e5193e]/30"
                      transition={{
                        type: 'spring',
                        stiffness: 280,
                        damping: 30,
                        mass: 0.82,
                      }}
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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.22, ease: [0.4, 0, 0.85, 0.15] } }}
              transition={{ duration: 0.4, ease: easeOutExpo }}
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
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: easeOutExpo }}
          className="relative mt-12 overflow-hidden rounded-2xl border border-[#e5193e]/20 bg-gradient-to-r from-[#e5193e]/[0.08] via-white/[0.04] to-transparent px-4 py-4 backdrop-blur-md md:mt-14 md:rounded-3xl md:px-6 md:py-5"
        >
          <div
            className="pointer-events-none absolute -right-24 top-0 h-full w-1/2 opacity-20"
            style={{ background: `linear-gradient(90deg, transparent, ${ACCENT})` }}
          />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e5193e]">Kurulum notu</p>
          <p className="relative mt-2 max-w-3xl text-sm leading-snug text-white/70 md:text-[15px] md:leading-relaxed">
            Android APK güncellemesi yapıyorsanız, mümkünse mevcut uygulamayı kaldırıp ardından yeni APK’yı yükleyin.
            Bilinmeyen kaynaklardan dosya indirmeyin — yalnızca bu resmi sayfadaki bağlantıları kullanın.
          </p>
        </motion.div>

        {/* Footer note */}
        <footer className="mt-12 border-t border-white/[0.06] py-10 text-center md:mt-16 md:py-12">
          <p className="mx-auto max-w-2xl text-[11px] font-medium uppercase tracking-[0.18em] text-white/40 leading-relaxed">
            İndirme adresleri yönetim panelinde tanımlandığında bu sayfada otomatik görünür. Yalnızca anirias.com ve duyurduğumuz resmi kanallardan gelen
            paketlere güvenin; üçüncü taraf mirror veya “mod” sürümlerini kullanmayın.
          </p>
          <p className="mt-4 text-[11px] text-white/35">
            Destek:{' '}
            <Link to="/iletisim" className="text-[#e5193e]/90 transition-colors hover:text-[#e5193e]">
              İletişim
            </Link>
            {' · '}
            <Link to="/gizlilik" className="text-white/50 transition-colors hover:text-white/75">
              Gizlilik Politikası
            </Link>
          </p>
          <p className="mt-4 text-xs text-white/25">© {new Date().getFullYear()} ANIRIAS — Tüm hakları saklıdır.</p>
        </footer>
      </div>
    </div>
  );
};

export default Apps;

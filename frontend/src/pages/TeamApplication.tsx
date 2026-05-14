import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Handshake, Send } from 'lucide-react';
import { useAuth } from '@/services/auth';
import { db } from '@/services/db';
import { hasSupabaseEnv } from '@/services/supabaseClient';
import { showToast } from '@/components/ToastProvider';

const MIN_AVAILABILITY = 15;
const MIN_SKILLS = 120;
const MIN_MOTIVATION = 160;
const MIN_PLAN = 120;

const roleOptions = [
  'Topluluk / Discord düzeni',
  'Yorum ve şikayet moderasyonu',
  'İçerik araştırma ve katalog düzeni',
  'Sosyal medya / kısa video fikirleri',
  'Duyuru, metin ve editörlük',
  'Test / hata bildirme',
  'Tasarım veya görsel destek',
  'Teknik destek / frontend',
];

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/30';
const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500';

const TeamApplication: React.FC = () => {
  const { user, profile, status } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [discordOrSocial, setDiscordOrSocial] = useState('');
  const [roleInterests, setRoleInterests] = useState<string[]>([]);
  const [weeklyAvailability, setWeeklyAvailability] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [previousExperience, setPreviousExperience] = useState('');
  const [contributionPlan, setContributionPlan] = useState('');
  const [motivationText, setMotivationText] = useState('');
  const [ackVolunteerBasis, setAckVolunteerBasis] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    const username = profile?.username;
    if (username) setDisplayName((prev) => (prev.trim().length >= 2 ? prev : username));
  }, [profile?.username]);

  const selectedLabel = useMemo(() => {
    if (roleInterests.length === 0) return 'Henüz alan seçilmedi';
    return `${roleInterests.length} alan seçildi`;
  }, [roleInterests.length]);

  const toggleRole = (role: string) => {
    setRoleInterests((prev) => (prev.includes(role) ? prev.filter((x) => x !== role) : [...prev, role]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSupabaseEnv) {
      showToast('Başvuru şu anda teknik nedenlerle alınamamaktadır.', 'error');
      return;
    }

    const name = displayName.trim();
    const em = email.trim();
    if (name.length < 2) {
      showToast('Adınızı veya görünen adınızı giriniz.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      showToast('Geçerli bir e-posta adresi giriniz.', 'error');
      return;
    }
    if (roleInterests.length === 0) {
      showToast('En az bir katkı alanı seçiniz.', 'error');
      return;
    }
    if (weeklyAvailability.trim().length < MIN_AVAILABILITY) {
      showToast('Haftalık müsaitliğinizi açıkça belirtiniz.', 'error');
      return;
    }
    if (skillsText.trim().length < MIN_SKILLS) {
      showToast(`Yetkinlikler alanı en az ${MIN_SKILLS} karakter olmalıdır.`, 'error');
      return;
    }
    if (contributionPlan.trim().length < MIN_PLAN) {
      showToast(`İlk katkı planı en az ${MIN_PLAN} karakter olmalıdır.`, 'error');
      return;
    }
    if (motivationText.trim().length < MIN_MOTIVATION) {
      showToast(`Motivasyon alanı en az ${MIN_MOTIVATION} karakter olmalıdır.`, 'error');
      return;
    }
    if (!ackVolunteerBasis) {
      showToast('Gönüllülük ve ileride sembolik destek beyanını onaylamanız gerekir.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await db.submitTeamApplication({
        userId: user?.id ?? null,
        siteUsername: profile?.username ?? null,
        displayName: name,
        email: em,
        discordOrSocial: discordOrSocial.trim() || undefined,
        roleInterests,
        weeklyAvailability: weeklyAvailability.trim(),
        skillsText: skillsText.trim(),
        motivationText: motivationText.trim(),
        previousExperience: previousExperience.trim() || undefined,
        contributionPlan: contributionPlan.trim(),
        ackVolunteerBasis,
      });
      showToast('Ekip başvurunuz kayda alındı. Uygun görülürse size dönüş yapılacaktır.', 'success');
      setDiscordOrSocial('');
      setRoleInterests([]);
      setWeeklyAvailability('');
      setSkillsText('');
      setPreviousExperience('');
      setContributionPlan('');
      setMotivationText('');
      setAckVolunteerBasis(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Başvuru kaydedilemedi.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background font-inter pt-32 pb-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_-15%,rgba(229,9,20,0.08),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl px-6">
        <header className="mb-12 border-b border-white/[0.1] pb-10">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.4em] text-primary">Ekip başvurusu</p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white md:text-7xl">Ekibe katıl</h1>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-zinc-300 md:text-base">
            ANIRIAS şu an büyük ölçüde tek kişinin emeğiyle ilerliyor. Siteyi düzenli, güvenli ve daha hızlı geliştirmek için moderasyon, içerik,
            topluluk, sosyal medya, test ve teknik konularda yardımcı olabilecek gönüllü ekip arkadaşlarına ihtiyaç var. Bu başvuru bir maaş vaadi
            değildir; mevcut aşama fan katkısı ve gönüllülük esasına dayanır. Site büyüyüp gelir oluşursa, katkı sürekliliğine göre harçlık tarzı
            sembolik destekler ayrıca değerlendirilebilir.
          </p>
        </header>

        <section className="mb-10 rounded-2xl border border-primary/25 bg-primary/[0.06] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-black/30 text-primary">
              <Handshake className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Nasıl katkı bekleniyor?</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                Küçük ama düzenli katkılar önceliklidir: şikayetleri kontrol etmek, katalog hatalarını bildirmek, duyuru metni hazırlamak, sosyal
                medya fikri üretmek, yeni özellikleri test etmek veya teknik geliştirmelerde yardımcı olmak. Çeviri yapmak istiyorsanız ayrıca{' '}
                <Link to="/cevirmen-basvuru" className="font-semibold text-white underline-offset-4 hover:underline">
                  çevirmen başvurusu
                </Link>{' '}
                formunu kullanabilirsiniz.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0c0c10] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8 md:p-10">
          <div className="mb-8 border-b border-white/10 pb-6">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">Başvuru formu</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Başvurular admin panelindeki geri bildirim listesine <span className="font-mono text-xs text-zinc-500">[EKİBE KATIL BAŞVURUSU]</span>{' '}
              ön ekiyle düşer.
            </p>
            {status === 'AUTHENTICATED' && user ? (
              <p className="mt-2 text-xs text-zinc-500">Başvuru hesabınızla ilişkilendirilecektir ({user.email}).</p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Oturum açmadan da başvuru yapılabilir; iletişim için e-postanız doğru olmalıdır.</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="team-name" className={labelClass}>
                  Ad veya görünen ad <span className="text-primary">*</span>
                </label>
                <input
                  id="team-name"
                  className={inputClass}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={2}
                  placeholder="Adınız veya platformda kullanacağınız ad"
                />
              </div>
              <div>
                <label htmlFor="team-email" className={labelClass}>
                  E-posta <span className="text-primary">*</span>
                </label>
                <input
                  id="team-email"
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ornek@alanadi.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="team-social" className={labelClass}>
                Discord veya sosyal medya (isteğe bağlı)
              </label>
              <input
                id="team-social"
                className={inputClass}
                value={discordOrSocial}
                onChange={(e) => setDiscordOrSocial(e.target.value)}
                placeholder="Discord kullanıcı adı, Instagram, X vb."
              />
            </div>

            <fieldset className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <legend className={labelClass + ' px-1'}>Katkı alanları</legend>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-600">{selectedLabel}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {roleOptions.map((role) => {
                  const selected = roleInterests.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`rounded-xl border px-4 py-3 text-left text-xs font-black uppercase tracking-widest transition ${
                        selected
                          ? 'border-primary/60 bg-primary/15 text-white'
                          : 'border-white/10 bg-white/[0.03] text-zinc-500 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="team-week" className={labelClass}>
                Haftalık ayırabileceğiniz süre <span className="text-primary">*</span>
              </label>
              <textarea
                id="team-week"
                className={`${inputClass} min-h-[88px] resize-y`}
                value={weeklyAvailability}
                onChange={(e) => setWeeklyAvailability(e.target.value)}
                required
                minLength={MIN_AVAILABILITY}
                placeholder="Haftada kaç saat, hangi günler, düzenli mi dönemsel mi?"
              />
            </div>

            <div>
              <label htmlFor="team-skills" className={labelClass}>
                Neleri iyi yaparsınız? <span className="text-primary">*</span>
              </label>
              <textarea
                id="team-skills"
                className={`${inputClass} min-h-[150px] resize-y`}
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                required
                minLength={MIN_SKILLS}
                placeholder="Moderasyon tecrübesi, sosyal medya, yazı dili, tasarım, test, kodlama, anime/katalog bilgisi gibi somut yetkinliklerinizi yazın."
              />
              <p className="mt-1 text-right text-[10px] text-zinc-600">{skillsText.length} / {MIN_SKILLS}+</p>
            </div>

            <div>
              <label htmlFor="team-exp" className={labelClass}>
                Önceki deneyim veya örnekler (isteğe bağlı)
              </label>
              <textarea
                id="team-exp"
                className={`${inputClass} min-h-[100px] resize-y`}
                value={previousExperience}
                onChange={(e) => setPreviousExperience(e.target.value)}
                placeholder="Daha önce yönettiğiniz topluluklar, hazırladığınız içerikler, portföy linkleri veya teknik işler"
              />
            </div>

            <div>
              <label htmlFor="team-plan" className={labelClass}>
                İlk 2 haftada ANIRIAS için ne yapardınız? <span className="text-primary">*</span>
              </label>
              <textarea
                id="team-plan"
                className={`${inputClass} min-h-[140px] resize-y`}
                value={contributionPlan}
                onChange={(e) => setContributionPlan(e.target.value)}
                required
                minLength={MIN_PLAN}
                placeholder="Somut bir katkı planı yazın: örn. katalog hatalarını tararım, Discord kurallarını düzenlerim, sosyal medya takvimi çıkarırım."
              />
              <p className="mt-1 text-right text-[10px] text-zinc-600">{contributionPlan.length} / {MIN_PLAN}+</p>
            </div>

            <div>
              <label htmlFor="team-why" className={labelClass}>
                Neden ekibe katılmak istiyorsunuz? <span className="text-primary">*</span>
              </label>
              <textarea
                id="team-why"
                className={`${inputClass} min-h-[170px] resize-y`}
                value={motivationText}
                onChange={(e) => setMotivationText(e.target.value)}
                required
                minLength={MIN_MOTIVATION}
                placeholder="Motivasyonunuzu, ekip çalışmasına yaklaşımınızı ve uzun vadede nasıl bir katkı vermek istediğinizi yazın."
              />
              <p className="mt-1 text-right text-[10px] text-zinc-600">{motivationText.length} / {MIN_MOTIVATION}+</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={ackVolunteerBasis}
                onChange={(e) => setAckVolunteerBasis(e.target.checked)}
                className="mt-1 rounded border-white/30 bg-black text-primary focus:ring-primary"
              />
              <span>
                Mevcut aşamada katkının fan topluluğu ve gönüllülük esasına dayandığını; site büyüyüp gelir oluşursa harçlık/sembolik destek
                ihtimalinin ayrıca değerlendirileceğini kabul ederim.
              </span>
            </label>

            <div className="flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={submitting || !hasSupabaseEnv}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    İletiliyor…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" strokeWidth={2} />
                    Başvuruyu ilet
                  </>
                )}
              </button>
              <Link to="/iletisim" className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-primary sm:text-left">
                İlave sorular — İletişim
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default TeamApplication;

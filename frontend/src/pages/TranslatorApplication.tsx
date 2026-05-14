import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Languages, Send } from 'lucide-react';
import { TRANSLATOR_APPLY_PAGE_LAST_UPDATED_TR } from '@/config/site';
import { useAuth } from '@/services/auth';
import { db } from '@/services/db';
import { hasSupabaseEnv } from '@/services/supabaseClient';
import { showToast } from '@/components/ToastProvider';

const MIN_EXPERIENCE = 180;
const MIN_WHY = 200;
const MIN_TOOLS = 20;
const MIN_LANG = 40;
const MIN_WEEKLY = 15;
const MIN_GENRES = 40;
const MIN_SAMPLE_TRANSLATION = 180;
const MIN_SUBTITLE_ADAPTATION = 120;
const MIN_TIMING_QC = 80;

type Compensation = 'volunteer' | 'future_support' | 'support_required';
type SourceLanguage = 'english' | 'japanese' | 'both' | 'other';
type TranslatorRole = 'translator' | 'editor_qc' | 'timer' | 'all_rounder';

const sourceLanguageLabels: Record<SourceLanguage, string> = {
  english: 'İngilizce kaynak üzerinden çeviri',
  japanese: 'Japonca kaynak üzerinden çeviri',
  both: 'İngilizce ve Japonca kaynakla çalışabilirim',
  other: 'Başka kaynak dil veya özel durum',
};

const translatorRoleLabels: Record<TranslatorRole, string> = {
  translator: 'Çevirmen',
  editor_qc: 'Editör / kalite kontrol',
  timer: 'Timing / senkron',
  all_rounder: 'Çeviri + edit + timing birlikte',
};

/**
 * Resmî çevirmen başvuru bilgilendirmesi ve elektronik form; kayıtlar `feedback` tablosuna iletilir.
 */
const TranslatorApplication: React.FC = () => {
  const { user, profile, status } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [locationOrTimezone, setLocationOrTimezone] = useState('');
  const [experienceText, setExperienceText] = useState('');
  const [toolsText, setToolsText] = useState('');
  const [languageSkills, setLanguageSkills] = useState('');
  const [weeklyAvailability, setWeeklyAvailability] = useState('');
  const [genresOrSeries, setGenresOrSeries] = useState('');
  const [portfolioText, setPortfolioText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>('english');
  const [rolePreference, setRolePreference] = useState<TranslatorRole>('translator');
  const [sampleTranslation, setSampleTranslation] = useState('');
  const [subtitleAdaptation, setSubtitleAdaptation] = useState('');
  const [timingQcAnswer, setTimingQcAnswer] = useState('');
  const [compensationModel, setCompensationModel] = useState<Compensation>('volunteer');
  const [compensationNote, setCompensationNote] = useState('');
  const [whyAnirias, setWhyAnirias] = useState('');
  const [ackPolicies, setAckPolicies] = useState(false);
  const [ackService, setAckService] = useState(false);
  const [ackOriginalWork, setAckOriginalWork] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [socialCtaVisible, setSocialCtaVisible] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    const u = profile?.username;
    if (u) setFullName((prev) => (prev.trim().length >= 2 ? prev : u));
  }, [profile?.username]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSocialCtaVisible(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSupabaseEnv) {
      showToast(
        'Başvuru şu anda teknik nedenlerle alınamamaktadır. Lütfen daha sonra yeniden deneyiniz veya iletişim kanallarımıza başvurunuz.',
        'error'
      );
      return;
    }
    const em = email.trim();
    const fn = fullName.trim();
    if (fn.length < 2) {
      showToast('Adınızı veya görünen adınızı giriniz.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      showToast('Geçerli bir e-posta adresi giriniz.', 'error');
      return;
    }
    if (experienceText.trim().length < MIN_EXPERIENCE) {
      showToast(`Deneyim alanı en az ${MIN_EXPERIENCE} karakterden ibaret olmalıdır.`, 'error');
      return;
    }
    if (toolsText.trim().length < MIN_TOOLS) {
      showToast('Kullandığınız yazılım ve iş akışını yeterli ayrıntıyla açıklayınız.', 'error');
      return;
    }
    if (languageSkills.trim().length < MIN_LANG) {
      showToast('Dil becerilerinizi (Türkçe, İngilizce, Japonca vb.) ayrıntılı biçimde beyan ediniz.', 'error');
      return;
    }
    if (weeklyAvailability.trim().length < MIN_WEEKLY) {
      showToast('Haftalık müsaitliğinizi açıkça belirtiniz.', 'error');
      return;
    }
    if (genresOrSeries.trim().length < MIN_GENRES) {
      showToast('İlgi alanlarınızı veya tür tercihlerinizi daha geniş biçimde yazınız.', 'error');
      return;
    }
    if (sampleTranslation.trim().length < MIN_SAMPLE_TRANSLATION) {
      showToast(`Mini çeviri testi en az ${MIN_SAMPLE_TRANSLATION} karakter olmalıdır.`, 'error');
      return;
    }
    if (subtitleAdaptation.trim().length < MIN_SUBTITLE_ADAPTATION) {
      showToast(`Altyazı uyarlama cevabı en az ${MIN_SUBTITLE_ADAPTATION} karakter olmalıdır.`, 'error');
      return;
    }
    if (timingQcAnswer.trim().length < MIN_TIMING_QC) {
      showToast(`Timing ve kalite kontrol cevabı en az ${MIN_TIMING_QC} karakter olmalıdır.`, 'error');
      return;
    }
    if (whyAnirias.trim().length < MIN_WHY) {
      showToast(`«Motivasyon ve taahhüt» alanı en az ${MIN_WHY} karakterden oluşmalıdır.`, 'error');
      return;
    }
    if (!ackPolicies || !ackService || !ackOriginalWork) {
      showToast('İlerleyebilmek için tüm beyanları işaretlemeniz gerekmektedir.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await db.submitTranslatorApplication({
        userId: user?.id ?? null,
        siteUsername: profile?.username ?? null,
        fullName: fn,
        email: em,
        locationOrTimezone: locationOrTimezone.trim() || undefined,
        experienceText: experienceText.trim(),
        toolsText: toolsText.trim(),
        languageSkills: languageSkills.trim(),
        weeklyAvailability: weeklyAvailability.trim(),
        genresOrSeries: genresOrSeries.trim(),
        portfolioText: portfolioText.trim() || undefined,
        sourceLanguage,
        rolePreference,
        sampleTranslation: sampleTranslation.trim(),
        subtitleAdaptation: subtitleAdaptation.trim(),
        timingQcAnswer: timingQcAnswer.trim(),
        compensationModel,
        compensationNote: compensationNote.trim() || undefined,
        whyAnirias: whyAnirias.trim(),
      });
      showToast(
        'Başvurunuz kayda alınmıştır. İnceleme neticesinde uygun görülmesi hâlinde tarafınıza dönüş yapılacaktır.',
        'success'
      );
      setExperienceText('');
      setToolsText('');
      setLanguageSkills('');
      setWeeklyAvailability('');
      setGenresOrSeries('');
      setPortfolioText('');
      setSampleTranslation('');
      setSubtitleAdaptation('');
      setTimingQcAnswer('');
      setCompensationNote('');
      setWhyAnirias('');
      setAckPolicies(false);
      setAckService(false);
      setAckOriginalWork(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Başvurunuz iletilememiştir.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/30';
  const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500';

  return (
    <div className="relative min-h-screen bg-background font-inter pt-32 pb-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_-15%,rgba(229,9,20,0.07),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl px-6">
        <header className="mb-14 border-b border-white/[0.1] pb-10 md:mb-16">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.4em] text-primary">Resmî bilgilendirme ve başvuru usulü</p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white md:text-7xl">Çevirmen başvurusu</h1>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-zinc-300 md:text-base">
            İşbu sayfa, ANIRIAS dijital yayın platformunun çeviri ve altyazı katkılarına ilişkin resmî bilgilendirme metnini ve başvuru usulünü
            içermektedir. Sunulan hizmet; güvenilirlik, erişilebilirlik ve tutarlı izleyici deneyimi ilkeleri çerçevesinde yürütülmekte olup metin
            çevirisi ile zamanlama (senkronizasyon) işlemleri, doğrudan izleyici memnuniyetinin ayrılmaz unsurları arasında yer almaktadır. Aşağıda
            görev tanımı, gönüllülük ve gelir desteği çerçevesi, gizlilik ile fikrî mülkiyet hükümleri ve başvurunun değerlendirilmesine ilişkin hususlar
            açıklanmıştır. Başvuruların, aynı sayfada yer alan elektronik form aracılığıyla iletilmesi gerekmektedir. Başvuruların incelenmesi ile
            tarafınıza geri dönüş sağlanması operasyonel yoğunluğa tabi olup; her başvuruya olumlu veya olumsuz yanıt verilmesi hususunda münderecat
            taahhüt bulunmamaktadır.
          </p>
        </header>

        <div className="prose prose-invert prose-lg max-w-none leading-relaxed text-gray-400">
          <div className="not-prose mb-12 flex items-start gap-4 rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 backdrop-blur-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-black/30 text-primary">
              <Languages className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Başvuru usulü</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                Öncelikle işbu metnin dikkatle mütalaa edilmesi; akabinde sayfanın alt kısmında yer alan{' '}
                <a href="#basvuru-formu" className="font-semibold text-white underline-offset-4 hover:underline">
                  «Başvuru Formu»nun
                </a>{' '}
                eksiksiz doldurulması gerekmektedir. Yetersiz içerikli veya çoğaltılmış metinlerle yapılan başvurular değerlendirme dışı
                bırakılabilir. İlave bilgi talepleriniz için{' '}
                <Link to="/iletisim" className="text-primary underline-offset-4 hover:underline">
                  iletişim
                </Link>{' '}
                sayfasındaki kanallar kullanılabilir; esas başvuru yolu elektronik formdur.
              </p>
            </div>
          </div>

          <h2 className="text-white text-xl font-black italic mt-2 mb-4 not-prose">Hizmetin niteliği ve sorumluluğun ağırlığı</h2>
          <p className="mb-6">
            İzleyici, içeriğe erişim sırasında görüntü ve işitininin yanı sıra, sunulan metin aracılığıyla anlatıya ulaşmaktadır. Hatalı, eksik veya
            özensiz çeviri; dramatik etkinin zayıflamasına, mizah unsurlarının hedefe ulaşmamasına ve karakterlerle kurulan bağın zedelenmesine yol
            açabilecektir. Metnin erişilebilirlik unsurlarıyla (okunabilirlik, satır bölünmesi, senkronizasyon) bütünleşik biçimde ele alınması
            gerekmektedir. Dolayısıyla çevirmenlik hizmeti, salt dosya teslimi mahiyetinde olmayıp; izleyiciye yönelik hizmet sunumunun temel
            bileşenlerinden birini teşkil etmektedir.
          </p>
          <p className="mb-6">
            Bu çerçevede disiplinli çalışma, zamanında iletişim kurulması ve kalite güvencesi süreçlerine (örneğin revizyon taleplerine) açık olunması
            zorunluluk arz etmektedir. Son vakte bırakılan işlerin teslimi veya kontrol edilmeden iletilen çıktılar, hem izleyici memnuniyetine hem de
            ekip içi iş bölümüne zarar verebilecek niteliktedir. ANIRIAS, kalite ve güven ilkeleri doğrultusunda hizmet sunmayı hedeflemekte olup;
            söz konusu ilkelere riayet edebilecek adayların başvurusunu beklemektedir.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Görev tanımı ve teknik beklentiler</h2>
          <p className="mb-6">
            Çevirmen; kelime çevirisinin ötesinde, <strong className="text-white">diyalog ritmi, kültürel nüans ve seri içi terminoloji tutarlılığı</strong>
            {' '}ile gerektiğinde tipografi ve okunurluk kararlarını da gözetmekle yükümlüdür. Zaman çizelgesi, satır uzunlukları, şarkı sözleri, tabela
            metinleri ve arka plandaki metinler ayrı özen gerektiren unsurlardır. Kalite kontrolü (ikinci göz) veya editör tarafından iletilen geri
            bildirimler, <strong className="text-white">hizmet standardının yükseltilmesi</strong> amacıyla değerlendirilmeli; kişisel eleştiri olarak
            yorumlanmamalıdır.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Gönüllülük, site gelişimi ve gelir desteği</h2>
          <ul className="list-disc list-inside space-y-3 text-gray-400 ml-2 md:ml-4 mb-6">
            <li>
              <strong className="text-white">Mevcut çerçeve:</strong> ANIRIAS çeviri katkıları şu aşamada fan topluluğu ruhuyla, gönüllülük esasına
              dayalı olarak yürütülmektedir. Bu, katkının değersiz görüldüğü anlamına gelmez; aksine ekip içi saygı, görünür emek, deneyim kazanımı ve
              portföy oluşturma imkânı bu sürecin temel parçalarıdır.
            </li>
            <li>
              <strong className="text-white">Gelecek hedefi:</strong> Site büyüdükçe, bilinirliği arttıkça ve düzenli gelir oluşmaya başladıkça; emek veren
              ekip üyelerine maaş niteliğinde olmayan, imkânlar ölçüsünde <strong className="text-white">harçlık / sembolik destek</strong> sağlanması
              hedeflenmektedir. Bu destek, gelirin oluşmasına, proje yoğunluğuna ve ekip içi katkı sürekliliğine bağlıdır.
            </li>
            <li>
              <strong className="text-white">Şeffaflık:</strong> Başvuru, mevcut durumda sabit maaş veya garanti ödeme vaadi anlamına gelmemektedir.
              Maddi destek imkânı doğduğunda koşullar açıkça paylaşılacak; hiçbir adaydan bu ihtimal kesinleşmiş bir ödeme taahhüdü gibi
              değerlendirmesi beklenmeyecektir.
            </li>
          </ul>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Gizlilik, sızdırma yasağı ve fikrî mülkiyet</h2>
          <p className="mb-6">
            Ham senaryo, iç zaman çizelgesi, kaynak dosyalar ve henüz yayımlanmamış içerik <strong className="text-white">ekip dışına çıkarılamaz</strong>.
            Sosyal medyada erken spoiler paylaşımı, ekran görüntüsü veya çalışma konusuna dair ipucu verilmesi yasaktır. Tarafınızca teslim edilen
            çevirilerin platformda kullanımı, düzenlenmesi ve arşivlenmesi; tarafınızca imzalanacak metin veya onaylayacağınız politika çerçevesinde
            belirlenecektir. Aynı işin üçüncü kişilere devri veya izinsiz yeniden dağıtımı mümkün değildir.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Davranış kuralları, fesih ve güvenlik</h2>
          <p className="mb-6">
            Taciz, ayrımcılık, nefret söylemi, sahte referans veya topluluk ile ekip kurallarına aykırı davranışların tespiti hâlinde iş birliği{' '}
            <strong className="text-white">derhal ve tek taraflı</strong> olarak sonlandırılabilir. Tarafınızca makul bir süre öncesinde çekilme
            talep edilebilmekle birlikte; elinizde bulunan aktif işler bakımından ekiple <strong className="text-white">iyi niyetli devir veya teslim</strong>
            {' '}planının oluşturulması esas nezaket kurallarına uygundur.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Seçim süreci ve geri dönüş</h2>
          <p className="mb-6">
            Başvurular dönemsel olarak incelenmektedir. <strong className="text-white">Deneme çevirisi, kısa teknik görev veya mülakat</strong> talep
            edilebilmektedir. Operasyonel yoğunluk nedeniyle uygun görülmeyen tüm başvurulara ayrı ret bildirimi gönderilmesi her zaman mümkün
            olmayabilir; bu durum başvurunun değersiz görüldüğü şeklinde yorumlanmamalıdır. Kabul edilmeniz hâlinde yönlendirme ve stil rehberi
            paylaşılacak olup; ilk dönemde daha sık geri bildirim almanız olağan karşılanmalıdır.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Sorumluluk sınırı (hukukî)</h2>
          <p className="mb-10 text-sm text-zinc-500">
            İşbu metin yalnızca bilgilendirme mahiyetinde olup; taraflar arasındaki nihai hak ve yükümlülükler imzalanan belgeler ile yürürlükteki
            mevzuat çerçevesinde belirlenecektir. ANIRIAS, işbu metni önceden bildirimde bulunmaksızın güncelleme hakkını saklı tutar.
          </p>

          <p className="text-sm text-gray-500 not-prose mb-16">Son güncelleme: {TRANSLATOR_APPLY_PAGE_LAST_UPDATED_TR}</p>
        </div>

        {/* Başvuru formu */}
        <section
          id="basvuru-formu"
          className="scroll-mt-28 rounded-2xl border border-white/10 bg-[#0c0c10] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8 md:p-10"
        >
          <div className="mb-8 border-b border-white/10 pb-6">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">Başvuru formu</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Aşağıdaki alanların ayrıntılı doldurulması gerekmektedir. Yetersiz içerikli başvurular işleme alınmayabilir. Gönderilen kayıt, yönetim
              panelindeki geri bildirim sistemine <span className="font-mono text-xs text-zinc-500">[ÇEVİRMEN BAŞVURUSU]</span> ön eki ile
              düşecektir.
            </p>
            {!hasSupabaseEnv ? (
              <p className="mt-3 text-xs font-semibold text-amber-500/90">
                Teknik yapılandırma eksikliği nedeniyle form gönderimi şu anda kullanılamayabilir. Lütfen daha sonra yeniden deneyiniz veya iletişim
                kanallarımıza başvurunuz.
              </p>
            ) : null}
            {status === 'AUTHENTICATED' && user ? (
              <p className="mt-2 text-xs text-zinc-500">
                Oturum açılmıştır; başvuru, hesabınız ile ilişkilendirilecektir ({user.email}).
              </p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                Oturum açmadan da başvuru yapılabilmektedir; iletişim için e-posta adresinizin doğru girilmesi önem arz etmektedir. İsteğe bağlı
                olarak önce{' '}
                <Link to="/signup" className="text-primary hover:underline">
                  üyelik
                </Link>{' '}
                oluşturabilirsiniz.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 font-inter">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="ta-fullName" className={labelClass}>
                  Ad veya görünen adınız <span className="text-primary">*</span>
                </label>
                <input
                  id="ta-fullName"
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                  minLength={2}
                  placeholder="Adınız, soyadınız veya platformda kullanılacak görünen ad"
                />
              </div>
              <div>
                <label htmlFor="ta-email" className={labelClass}>
                  E-posta adresiniz <span className="text-primary">*</span>
                </label>
                <input
                  id="ta-email"
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="ornek@alanadi.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ta-loc" className={labelClass}>
                Şehir, ülke veya saat dilimi (isteğe bağlı)
              </label>
              <input
                id="ta-loc"
                className={inputClass}
                value={locationOrTimezone}
                onChange={(e) => setLocationOrTimezone(e.target.value)}
                placeholder="Örnek: İstanbul, Türkiye (UTC+3)"
              />
            </div>

            <div>
              <label htmlFor="ta-exp" className={labelClass}>
                Çeviri ve altyazı deneyiminiz <span className="text-primary">*</span>
                <span className="ml-2 font-normal normal-case tracking-normal text-zinc-600">
                  (asgari {MIN_EXPERIENCE} karakter; proje, rol, süre ve sorumluluklarınızı belirtiniz)
                </span>
              </label>
              <textarea
                id="ta-exp"
                className={`${inputClass} min-h-[160px] resize-y`}
                value={experienceText}
                onChange={(e) => setExperienceText(e.target.value)}
                required
                minLength={MIN_EXPERIENCE}
                placeholder="Önceki projeler, üstlendiğiniz görevler (çeviri, QC, editörlük), kullanılan araçlar, hacim (bölüm/saat), ekip çalışması örnekleri"
              />
              <p className="mt-1 text-right text-[10px] text-zinc-600">{experienceText.length} / {MIN_EXPERIENCE}+</p>
            </div>

            <div>
              <label htmlFor="ta-tools" className={labelClass}>
                Kullandığınız yazılım ve iş akışı <span className="text-primary">*</span>
              </label>
              <textarea
                id="ta-tools"
                className={`${inputClass} min-h-[100px] resize-y`}
                value={toolsText}
                onChange={(e) => setToolsText(e.target.value)}
                required
                minLength={MIN_TOOLS}
                placeholder="Örn. Aegisub, Subtitle Edit, FFmpeg, sürüm kontrolü, stiller, QC adımlarınız"
              />
            </div>

            <div>
              <label htmlFor="ta-lang" className={labelClass}>
                Dil becerileri <span className="text-primary">*</span>
              </label>
              <textarea
                id="ta-lang"
                className={`${inputClass} min-h-[100px] resize-y`}
                value={languageSkills}
                onChange={(e) => setLanguageSkills(e.target.value)}
                required
                minLength={MIN_LANG}
                placeholder="Ana diliniz; İngilizce ve Japonca seviyeniz (sınav, okuma, izleme tecrübesi); terminoloji konusundaki güveniniz"
              />
            </div>

            <div>
              <label htmlFor="ta-week" className={labelClass}>
                Haftalık çalışmaya ayırabileceğiniz süre <span className="text-primary">*</span>
              </label>
              <textarea
                id="ta-week"
                className={`${inputClass} min-h-[88px] resize-y`}
                value={weeklyAvailability}
                onChange={(e) => setWeeklyAvailability(e.target.value)}
                required
                minLength={MIN_WEEKLY}
                placeholder="Haftalık tahmini süre, uygun günler, mesai dışı çalışma imkânınız"
              />
            </div>

            <div>
              <label htmlFor="ta-genre" className={labelClass}>
                İlgi alanlarınız ve tür veya seri tercihleriniz <span className="text-primary">*</span>
              </label>
              <textarea
                id="ta-genre"
                className={`${inputClass} min-h-[100px] resize-y`}
                value={genresOrSeries}
                onChange={(e) => setGenresOrSeries(e.target.value)}
                required
                minLength={MIN_GENRES}
                placeholder="Örn. shonen, seinen, romantik komedi; kaçındığınız veya öncelik vermediğiniz türler var ise belirtiniz"
              />
            </div>

            <div>
              <label htmlFor="ta-port" className={labelClass}>
                Portföy veya referans bağlantıları (isteğe bağlı)
              </label>
              <textarea
                id="ta-port"
                className={`${inputClass} min-h-[88px] resize-y`}
                value={portfolioText}
                onChange={(e) => setPortfolioText(e.target.value)}
                placeholder="Herkese açık örnek dosya, depo veya blog bağlantıları"
              />
            </div>

            <fieldset className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
              <legend className={labelClass + ' px-1 text-primary'}>Mini yeterlilik testi</legend>
              <p className="text-sm leading-relaxed text-zinc-300">
                Bu bölüm, başvuruyu değerlendiren ekibin pratik çeviri yaklaşımınızı görmesi içindir. Cevapların kusursuz olması beklenmez; doğal
                Türkçe, bağlamı koruma, altyazı okunabilirliği ve karar gerekçeniz değerlendirilir.
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="ta-source-lang" className={labelClass}>
                    Çalışmak istediğiniz kaynak dil
                  </label>
                  <select
                    id="ta-source-lang"
                    className={inputClass}
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value as SourceLanguage)}
                  >
                    {Object.entries(sourceLanguageLabels).map(([value, label]) => (
                      <option key={value} value={value} className="bg-zinc-950 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ta-role-pref" className={labelClass}>
                    Öncelikli görev tercihi
                  </label>
                  <select
                    id="ta-role-pref"
                    className={inputClass}
                    value={rolePreference}
                    onChange={(e) => setRolePreference(e.target.value as TranslatorRole)}
                  >
                    {Object.entries(translatorRoleLabels).map(([value, label]) => (
                      <option key={value} value={value} className="bg-zinc-950 text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Çeviri testi kaynak metin</p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  “I know everyone expects me to be fine by tomorrow. But if I smile now, it will only make the lie easier to believe. Give me one
                  night to be honest with myself.”
                </p>
              </div>

              <div>
                <label htmlFor="ta-sample" className={labelClass}>
                  Kaynak metni doğal Türkçe altyazı üslubuyla çeviriniz <span className="text-primary">*</span>
                </label>
                <textarea
                  id="ta-sample"
                  className={`${inputClass} min-h-[150px] resize-y`}
                  value={sampleTranslation}
                  onChange={(e) => setSampleTranslation(e.target.value)}
                  required
                  minLength={MIN_SAMPLE_TRANSLATION}
                  placeholder="Kelime kelime çeviri yerine sahnenin duygusunu, konuşma doğallığını ve altyazı okunabilirliğini gözeterek yazınız."
                />
                <p className="mt-1 text-right text-[10px] text-zinc-600">{sampleTranslation.length} / {MIN_SAMPLE_TRANSLATION}+</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Uyarlama testi ham çeviri</p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  “Senin için endişeleniyorum ve bu yüzden seninle konuşmak istedim ama sen beni dinlemiyorsun çünkü sen her zaman her şeyi tek başına
                  halletmek zorunda olduğunu düşünüyorsun.”
                </p>
              </div>

              <div>
                <label htmlFor="ta-adapt" className={labelClass}>
                  Ham çeviriyi iki satırlık, akıcı altyazıya dönüştürünüz <span className="text-primary">*</span>
                </label>
                <textarea
                  id="ta-adapt"
                  className={`${inputClass} min-h-[130px] resize-y font-mono`}
                  value={subtitleAdaptation}
                  onChange={(e) => setSubtitleAdaptation(e.target.value)}
                  required
                  minLength={MIN_SUBTITLE_ADAPTATION}
                  placeholder={'Örnek biçim:\nSenin için endişelendim,\nbu yüzden konuşmak istedim...'}
                />
                <p className="mt-1 text-right text-[10px] text-zinc-600">{subtitleAdaptation.length} / {MIN_SUBTITLE_ADAPTATION}+</p>
              </div>

              <div>
                <label htmlFor="ta-qc" className={labelClass}>
                  Timing ve kalite kontrol kararı <span className="text-primary">*</span>
                </label>
                <textarea
                  id="ta-qc"
                  className={`${inputClass} min-h-[130px] resize-y`}
                  value={timingQcAnswer}
                  onChange={(e) => setTimingQcAnswer(e.target.value)}
                  required
                  minLength={MIN_TIMING_QC}
                  placeholder="Bir altyazı 1 saniye ekranda kalıyor ve 95 karakter içeriyor. Ne yaparsınız? Satır bölme, kısaltma, zamanlama veya QC yaklaşımınızı açıklayın."
                />
                <p className="mt-1 text-right text-[10px] text-zinc-600">{timingQcAnswer.length} / {MIN_TIMING_QC}+</p>
              </div>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <legend className={labelClass + ' px-1'}>Gönüllülük ve ileride destek beklentisi</legend>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="comp"
                  checked={compensationModel === 'volunteer'}
                  onChange={() => setCompensationModel('volunteer')}
                  className="mt-1 border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>Şimdilik fan katkısı ve gönüllülük esasıyla görev alabileceğimi kabul ederim.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="comp"
                  checked={compensationModel === 'future_support'}
                  onChange={() => setCompensationModel('future_support')}
                  className="mt-1 border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>Şimdilik gönüllü katkı verebilirim; site büyüyüp gelir oluşursa harçlık tarzı sembolik destek değerlendirilmesini isterim.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="comp"
                  checked={compensationModel === 'support_required'}
                  onChange={() => setCompensationModel('support_required')}
                  className="mt-1 border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>Düzenli katkı için ileride harçlık/sembolik destek benim için önemli olacaktır; mevcut aşamada bunun garanti edilmediğini bilirim.</span>
              </label>
              <div className="pt-2">
                <label htmlFor="ta-comp-note" className={labelClass}>
                  Destek beklentisine ilişkin ek not (isteğe bağlı)
                </label>
                <input
                  id="ta-comp-note"
                  className={inputClass}
                  value={compensationNote}
                  onChange={(e) => setCompensationNote(e.target.value)}
                  placeholder="Şu an gönüllü katkı verebilirim / ileride sembolik destek beklentim olur gibi kısa not"
                />
              </div>
            </fieldset>

            <div>
              <label htmlFor="ta-why" className={labelClass}>
                ANIRIAS&apos;a motivasyonunuz ve izleyiciye yönelik taahhüdünüz <span className="text-primary">*</span>
                <span className="ml-2 font-normal normal-case tracking-normal text-zinc-600">(asgari {MIN_WHY} karakter)</span>
              </label>
              <textarea
                id="ta-why"
                className={`${inputClass} min-h-[200px] resize-y`}
                value={whyAnirias}
                onChange={(e) => setWhyAnirias(e.target.value)}
                required
                minLength={MIN_WHY}
                placeholder="Platformda görev alma gerekçeniz; kalite, süre ve izleyici memnuniyetine yaklaşımınızı resmî ve açık biçimde beyan ediniz."
              />
              <p className="mt-1 text-right text-[10px] text-zinc-600">{whyAnirias.length} / {MIN_WHY}+</p>
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={ackPolicies}
                  onChange={(e) => setAckPolicies(e.target.checked)}
                  className="mt-1 rounded border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>
                  İşbu sayfadaki <strong className="text-white">gönüllülük ve gelir desteği</strong>, <strong className="text-white">gizlilik</strong> ile{' '}
                  <strong className="text-white">fikrî mülkiyet</strong> hükümlerini okuduğumu, anladığımı ve bunlara uyacağımı beyan ederim.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={ackService}
                  onChange={(e) => setAckService(e.target.checked)}
                  className="mt-1 rounded border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>
                  Çeviri hizmetinin <strong className="text-white">izleyiciye doğrudan sunulan bir hizmet</strong> olduğunu; titizlik, revizyon süreçleri
                  ve ekip içi iletişimin profesyonel sorumluluk gerektirdiğini kabul ederim.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={ackOriginalWork}
                  onChange={(e) => setAckOriginalWork(e.target.checked)}
                  className="mt-1 rounded border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>
                  Mini test cevaplarının tarafımdan hazırlandığını; otomatik çeviri veya üçüncü kişi desteği kullanıldıysa bunu ayrıca belirtmem
                  gerektiğini kabul ederim.
                </span>
              </label>
            </div>

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
                    Başvuruyu iletin
                  </>
                )}
              </button>
              <Link
                to="/iletisim"
                className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-primary sm:text-left"
              >
                İlave sorular — İletişim
              </Link>
            </div>
          </form>
        </section>

        <section
          className={`mt-12 rounded-2xl border border-white/10 bg-black/50 px-6 py-8 text-center shadow-[0_0_40px_rgba(229,9,20,0.08)] backdrop-blur-sm transition-all duration-700 ${
            socialCtaVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          <p className="text-sm font-semibold tracking-wide text-zinc-300">Takip ederek ilk erişenlerden biri ol</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://instagram.com/aniriasresmi"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400 px-7 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(236,72,153,0.45)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] sm:w-auto"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
                <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.9 1.55a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2ZM12 7a5 5 0 1 1-5 5 5 5 0 0 1 5-5Zm0 1.8A3.2 3.2 0 1 0 15.2 12 3.2 3.2 0 0 0 12 8.8Z" />
              </svg>
              Instagram
            </a>

            <a
              href="https://tiktok.com/@aniriasresmi"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-300/25 bg-zinc-950 px-7 py-3 text-sm font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_18px_rgba(34,211,238,0.35),0_0_30px_rgba(236,72,153,0.18)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.09),0_0_26px_rgba(34,211,238,0.5),0_0_40px_rgba(236,72,153,0.35)] sm:w-auto"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-300 transition-colors duration-300 group-hover:text-pink-400" aria-hidden="true" fill="currentColor">
                <path d="M16.8 3.5c.7 1.7 2 3.1 3.7 3.8v3.2a8 8 0 0 1-3.5-.8v5.7a6.6 6.6 0 1 1-6.6-6.6c.3 0 .7 0 1 .1v3.4a3.1 3.1 0 1 0 2.1 3V2h3.3v1.5Z" />
              </svg>
              TikTok
            </a>
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:border-primary/50 hover:text-primary"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TranslatorApplication;

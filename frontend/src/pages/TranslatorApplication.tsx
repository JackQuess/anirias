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

type Compensation = 'volunteer' | 'open_discussion' | 'paid_preferred';

/**
 * Fansub / çevirmen başvuru: ayrıntılı bilgilendirme + bu sayfada başvuru formu (feedback tablosu).
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
  const [compensationModel, setCompensationModel] = useState<Compensation>('volunteer');
  const [compensationNote, setCompensationNote] = useState('');
  const [whyAnirias, setWhyAnirias] = useState('');
  const [ackPolicies, setAckPolicies] = useState(false);
  const [ackService, setAckService] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    const u = profile?.username;
    if (u) setFullName((prev) => (prev.trim().length >= 2 ? prev : u));
  }, [profile?.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSupabaseEnv) {
      showToast('Şu an başvuru alınamıyor (yapılandırma). Lütfen daha sonra deneyin veya iletişimden yazın.', 'error');
      return;
    }
    const em = email.trim();
    const fn = fullName.trim();
    if (fn.length < 2) {
      showToast('Lütfen adınızı veya görünen adınızı girin.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      showToast('Geçerli bir e-posta adresi girin.', 'error');
      return;
    }
    if (experienceText.trim().length < MIN_EXPERIENCE) {
      showToast(`Deneyim alanı en az ${MIN_EXPERIENCE} karakter olmalı; ciddi başvurular için ayrıntı bekliyoruz.`, 'error');
      return;
    }
    if (toolsText.trim().length < MIN_TOOLS) {
      showToast('Kullandığınız araçları ve yazılımları yeterince açıklayın.', 'error');
      return;
    }
    if (languageSkills.trim().length < MIN_LANG) {
      showToast('Dil becerilerinizi (TR / EN / JP vb.) daha ayrıntılı yazın.', 'error');
      return;
    }
    if (weeklyAvailability.trim().length < MIN_WEEKLY) {
      showToast('Haftalık müsaitliğinizi netleştirin.', 'error');
      return;
    }
    if (genresOrSeries.trim().length < MIN_GENRES) {
      showToast('İlgi alanınızı veya tercih ettiğiniz türleri biraz daha açın.', 'error');
      return;
    }
    if (whyAnirias.trim().length < MIN_WHY) {
      showToast(`“Neden ANIRIAS” alanı en az ${MIN_WHY} karakter olmalı; bu işi ciddiye aldığınızı gösterin.`, 'error');
      return;
    }
    if (!ackPolicies || !ackService) {
      showToast('Devam etmek için her iki onay kutusunu da işaretleyin.', 'error');
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
        compensationModel,
        compensationNote: compensationNote.trim() || undefined,
        whyAnirias: whyAnirias.trim(),
      });
      showToast('Başvurun alındı. İncelendikten sonra uygunsa sana dönüş yapılır.', 'success');
      setExperienceText('');
      setToolsText('');
      setLanguageSkills('');
      setWeeklyAvailability('');
      setGenresOrSeries('');
      setPortfolioText('');
      setCompensationNote('');
      setWhyAnirias('');
      setAckPolicies(false);
      setAckService(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Başvuru gönderilemedi.';
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
          <p className="mb-2 text-xs font-black uppercase tracking-[0.4em] text-primary">Profesyonel sorumluluk · izleyiciye hizmet</p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white md:text-7xl">Çevirmen başvurusu</h1>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-zinc-300 md:text-base">
            Burada şaka yok: binlerce izleyici ekranda senin cümlelerinle duygu, mizah ve hikâyeyi taşır. ANIRIAS bir eğlence projesinden öte,{' '}
            <strong className="text-white">güvenilir bir yayın hizmeti</strong> sunma iddiası taşır; çeviri de bu hizmetin kalbidir. Aşağıda rolün
            ağırlığını, beklentileri ve hukuki/operasyonel çerçeveyi uzun uzun anlattık. Başvurunu <strong className="text-white">aynı sayfadaki form</strong>
            ile iletirsin; yanıt süresi yoğunluğa bağlıdır, her başvuruya otomatik dönüş garantisi verilmez.
          </p>
        </header>

        <div className="prose prose-invert prose-lg max-w-none leading-relaxed text-gray-400">
          <div className="not-prose mb-12 flex items-start gap-4 rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 backdrop-blur-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-black/30 text-primary">
              <Languages className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Başvuru bu sayfada</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                Önce metni dikkatle oku. Ardından sayfanın altındaki{' '}
                <a href="#basvuru-formu" className="font-bold text-white underline-offset-4 hover:underline">
                  başvuru formunu
                </a>{' '}
                eksiksiz doldur. Kısa veya kopyala–yapıştır başvurular genelde elenir; ciddi ekipler böyle çalışır. Ek soruların için{' '}
                <Link to="/iletisim" className="text-primary underline-offset-4 hover:underline">
                  iletişim
                </Link>{' '}
                her zaman açık — ama asıl süreç form üzerinden yürür.
              </p>
            </div>
          </div>

          <h2 className="text-white text-xl font-black italic mt-2 mb-4 not-prose">Bu iş neden ciddi?</h2>
          <p className="mb-6">
            İzleyici bölümü açtığında karşısında sadece piksel değil, <strong className="text-white">anlatının ta kendisi</strong> vardır. Altyazı hatası
            veya dağınık bir çeviri; şakanın düşmemesi, dramın sönmesi, karakter bağının kopması demektir. Erişilebilirlik açısından da metin; renk
            körlüğü dostu seçimler, okunabilir satır kırılımları ve zamanlama ile birlikte düşünülür. Yani yaptığın iş “bir dosyayı bitirmek” değil;{' '}
            <strong className="text-white">birine hizmet etmek</strong> — bazen yorgun argın, bazen gece yarısı, bazen yalnız hissederek izleyen birine.
          </p>
          <p className="mb-6">
            Bu yüzden ekip içinde <strong className="text-white">disiplin, iletişim ve revizyona açıklık</strong> şartsız değildir. Son dakikaya bırakılan
            işler, kontrol edilmeden gönderilen çeviriler veya “oldu bitti” yaklaşımı hem izleyiciye hem de diğer gönüllülere saygısızlıktır. Biz
            burada eğlence maskesi altında <strong className="text-white">kalite ve güven</strong> üretmeye çalışıyoruz; sen de bu çizgiyi taşıyabileceğini
            düşünüyorsan devam et.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Rolün kapsamı</h2>
          <p className="mb-6">
            Çevirmen; yalnızca kelime çevirisi değil, <strong className="text-white">diyalog ritmini, kültürel nüansı, seri içi terminoloji tutarlılığını</strong>{' '}
            ve gerektiğinde tiplografi/okunurluk kararlarını da düşünür. Zaman çizgisi (timing), satır uzunlukları, şarkı sözleri, tabela metinleri ve
            arka plandaki metinler farklı özen ister. QC (ikinci göz) veya editör geri bildirimi geldiğinde bunu kişisel saldırı değil,{' '}
            <strong className="text-white">hizmet kalitesini yükseltme</strong> adımı olarak görmek gerekir.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Gönüllülük, ücret ve şeffaflık</h2>
          <ul className="list-disc list-inside space-y-3 text-gray-400 ml-2 md:ml-4 mb-6">
            <li>
              <strong className="text-white">Varsayılan çerçeve:</strong> fansub geleneğine uygun olarak katkı çoğu zaman gönüllülük esasındadır. Bu,
              “bedava işçilik” demek değildir; karşılığında ekip içi saygı, deneyim, portföy ve — döneme göre — sembolik geri bildirimler (ör. tanınma,
              erken erişim vb.) olabilir; bunlar <em>taahhüt değildir</em>.
            </li>
            <li>
              <strong className="text-white">Ücret ve telafi:</strong> belirli projelerde süreklilik, özel uzmanlık veya yoğun sorumluluk gerektiğinde
              ücret, bölüm bazlı ücret veya makul telafi seçenekleri <strong className="text-white">ayrı görüşme ve yazılı mutabakat</strong> ile
              konuşulur. Ön görüşmede konuşulan rakamlar, resmi teklif veya sözleşme olmadan bağlayıcı değildir.
            </li>
            <li>
              <strong className="text-white">Vergi ve statü:</strong> ücretli iş birliklerinde fatura, vergi mükellefiyeti veya serbest meslek gibi
              konular tarafların kendi yükümlülüğüdür; platform yalnızca işletmeci sıfatıyla koşulları proje bazında netleştirir.
            </li>
          </ul>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Gizlilik, sızdırma ve fikri mülkiyet</h2>
          <p className="mb-6">
            Ham senaryo, iç zaman çizelgesi, kaynak dosyalar ve yayımlanmamış içerik <strong className="text-white">ekip dışına çıkmaz</strong>. Sosyal
            medyada erken spoil, ekran görüntüsü veya “şunu çeviriyorum” diye ipucu vermek yasaktır. Teslim ettiğin çevirilerin platformda kullanımı,
            düzenlenmesi ve arşivlenmesi; ekiple imzalayacağın metin veya onayladığın politika ile belirlenir — aynı işi üçüncü tarafa devretmez, izinsiz
            yeniden dağıtmazsın.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Davranış, fesih ve güvenlik</h2>
          <p className="mb-6">
            Taciz, ayrımcılık, nefret söylemi, sahte referans veya topluluk/ekip kurallarına aykırı davranışlarda iş birliği{' '}
            <strong className="text-white">anında ve tek taraflı</strong> sonlandırılabilir. Sen de makul süre içinde çekilme hakkına sahipsin; ancak
            elindeki aktif iş için ekiple <strong className="text-white">iyi niyetli devir veya teslim</strong> planı çıkarmak temel nezakettir.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Seçim süreci ve beklenti yönetimi</h2>
          <p className="mb-6">
            Başvurular dönemsel incelenir. <strong className="text-white">Deneme çevirisi, kısa teknik görev veya mülakat</strong> istenebilir. Uygun
            görülmeyen herkese ret maili göndermek mümkün olmayabilir; bu “seni ciddiye almıyoruz” değil, operasyonel yoğunluktur. Kabul edilirsen
            onboarding ve stil rehberi paylaşılır; ilk dönemde daha sık geri bildirim alman normaldir.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Sorumluluk sınırı (yasal)</h2>
          <p className="mb-10 text-sm text-zinc-500">
            Bu sayfa bilgilendirme amaçlıdır; taraflar arası nihai hak ve yükümlülükler imzalanan belgeler ve yürürlükteki mevzuatla belirlenir. ANIRIAS
            metni önceden haber vermeksizin güncelleyebilir.
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
              Aşağıdaki alanlar kasıtlı olarak ayrıntılı; kısa cevaplar işleme alınmayabilir. Gönderim, admin panelindeki geri bildirim akışına{' '}
              <span className="font-mono text-xs text-zinc-500">[ÇEVİRMEN BAŞVURUSU]</span> etiketiyle düşer.
            </p>
            {!hasSupabaseEnv ? (
              <p className="mt-3 text-xs font-bold text-amber-500/90">
                Bağlantı yapılandırması eksik; form şu an gönderime kapalı olabilir. Lütfen daha sonra tekrar deneyin veya iletişimden yazın.
              </p>
            ) : null}
            {status === 'AUTHENTICATED' && user ? (
              <p className="mt-2 text-xs text-zinc-500">
                Giriş yaptın: başvuru hesabınla ilişkilendirilir ({user.email}).
              </p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                Giriş yapmadan da başvurabilirsin; e-postanı doğru yaz ki sana dönebilelim. İstersen önce{' '}
                <Link to="/signup" className="text-primary hover:underline">
                  kayıt ol
                </Link>
                .
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 font-inter">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="ta-fullName" className={labelClass}>
                  Ad veya görünen ad <span className="text-primary">*</span>
                </label>
                <input
                  id="ta-fullName"
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                  minLength={2}
                  placeholder="Takma ad veya ad soyad"
                />
              </div>
              <div>
                <label htmlFor="ta-email" className={labelClass}>
                  E-posta <span className="text-primary">*</span>
                </label>
                <input
                  id="ta-email"
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="yanit@ornek.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ta-loc" className={labelClass}>
                Şehir / ülke / saat dilimi (isteğe bağlı)
              </label>
              <input
                id="ta-loc"
                className={inputClass}
                value={locationOrTimezone}
                onChange={(e) => setLocationOrTimezone(e.target.value)}
                placeholder="Örn. İstanbul, UTC+3"
              />
            </div>

            <div>
              <label htmlFor="ta-exp" className={labelClass}>
                Çeviri & altyazı deneyimin <span className="text-primary">*</span>
                <span className="ml-2 font-normal normal-case tracking-normal text-zinc-600">
                  (en az {MIN_EXPERIENCE} karakter — seriler, roller, süre)
                </span>
              </label>
              <textarea
                id="ta-exp"
                className={`${inputClass} min-h-[160px] resize-y`}
                value={experienceText}
                onChange={(e) => setExperienceText(e.target.value)}
                required
                minLength={MIN_EXPERIENCE}
                placeholder="Hangi projelerde ne yaptın? Aegisub / QC / editör deneyimi? Kaç bölüm / saat? Takım çalışması?"
              />
              <p className="mt-1 text-right text-[10px] text-zinc-600">{experienceText.length} / {MIN_EXPERIENCE}+</p>
            </div>

            <div>
              <label htmlFor="ta-tools" className={labelClass}>
                Kullandığın yazılım ve iş akışı <span className="text-primary">*</span>
              </label>
              <textarea
                id="ta-tools"
                className={`${inputClass} min-h-[100px] resize-y`}
                value={toolsText}
                onChange={(e) => setToolsText(e.target.value)}
                required
                minLength={MIN_TOOLS}
                placeholder="Aegisub, Subtitle Edit, FFmpeg, Git, Google Docs… Kısayollar, stiller, QC adımların."
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
                placeholder="Ana dilin, Japonca / İngilizce seviyen (JLPT, izleme süresi, okuma), teknik terim güvenin."
              />
            </div>

            <div>
              <label htmlFor="ta-week" className={labelClass}>
                Haftalık müsaitlik <span className="text-primary">*</span>
              </label>
              <textarea
                id="ta-week"
                className={`${inputClass} min-h-[88px] resize-y`}
                value={weeklyAvailability}
                onChange={(e) => setWeeklyAvailability(e.target.value)}
                required
                minLength={MIN_WEEKLY}
                placeholder="Haftada kaç saat? Hangi günler? Mesai saatleri dışında mı çalışırsın?"
              />
            </div>

            <div>
              <label htmlFor="ta-genre" className={labelClass}>
                İlgi alanın, tür veya seri tercihin <span className="text-primary">*</span>
              </label>
              <textarea
                id="ta-genre"
                className={`${inputClass} min-h-[100px] resize-y`}
                value={genresOrSeries}
                onChange={(e) => setGenresOrSeries(e.target.value)}
                required
                minLength={MIN_GENRES}
                placeholder="Shonen, seinen, romantik komedi, mecha… Kaçındığın türler var mı?"
              />
            </div>

            <div>
              <label htmlFor="ta-port" className={labelClass}>
                Portföy veya linkler (isteğe bağlı)
              </label>
              <textarea
                id="ta-port"
                className={`${inputClass} min-h-[88px] resize-y`}
                value={portfolioText}
                onChange={(e) => setPortfolioText(e.target.value)}
                placeholder="Drive, GitHub, blog veya örnek altyazı linkleri (herkese açık olanlar)."
              />
            </div>

            <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <legend className={labelClass + ' px-1'}>Ücret beklentisi</legend>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="comp"
                  checked={compensationModel === 'volunteer'}
                  onChange={() => setCompensationModel('volunteer')}
                  className="mt-1 border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>Gönüllü katkı ile başlamak istiyorum; ücret önceliğim yok.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="comp"
                  checked={compensationModel === 'open_discussion'}
                  onChange={() => setCompensationModel('open_discussion')}
                  className="mt-1 border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>Gönüllülük esaslı ama yoğun projede ücret veya telafi konuşulabilir.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="comp"
                  checked={compensationModel === 'paid_preferred'}
                  onChange={() => setCompensationModel('paid_preferred')}
                  className="mt-1 border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>Öncelikle ücretli iş birliği arıyorum (yine de kalite ve süre şartları geçerli).</span>
              </label>
              <div className="pt-2">
                <label htmlFor="ta-comp-note" className={labelClass}>
                  Ücret notu (isteğe bağlı)
                </label>
                <input
                  id="ta-comp-note"
                  className={inputClass}
                  value={compensationNote}
                  onChange={(e) => setCompensationNote(e.target.value)}
                  placeholder="Beklentin varsa kısaca; yazılı teklif ayrıca."
                />
              </div>
            </fieldset>

            <div>
              <label htmlFor="ta-why" className={labelClass}>
                Neden ANIRIAS? İzleyiciye taahhüdün <span className="text-primary">*</span>
                <span className="ml-2 font-normal normal-case tracking-normal text-zinc-600">(en az {MIN_WHY} karakter)</span>
              </label>
              <textarea
                id="ta-why"
                className={`${inputClass} min-h-[200px] resize-y`}
                value={whyAnirias}
                onChange={(e) => setWhyAnirias(e.target.value)}
                required
                minLength={MIN_WHY}
                placeholder="Bu platformda çalışmak senin için ne anlama geliyor? Kaliteye, sürece ve izleyiciye nasıl yaklaşırsın?"
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
                  Bu sayfadaki <strong className="text-white">gönüllülük / ücret</strong>, <strong className="text-white">gizlilik</strong> ve{' '}
                  <strong className="text-white">fikri mülkiyet</strong> maddelerini okudum ve kabul ediyorum.
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
                  Çevirinin <strong className="text-white">izleyiciye doğrudan hizmet</strong> olduğunu; titizlik, revizyon ve ekip iletişiminin
                  şaka olmadığını biliyorum.
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
                    Gönderiliyor…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" strokeWidth={2} />
                    Başvuruyu gönder
                  </>
                )}
              </button>
              <Link
                to="/iletisim"
                className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-primary sm:text-left"
              >
                Ek soru → İletişim
              </Link>
            </div>
          </form>
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

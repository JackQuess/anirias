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
    if (whyAnirias.trim().length < MIN_WHY) {
      showToast(`«Motivasyon ve taahhüt» alanı en az ${MIN_WHY} karakterden oluşmalıdır.`, 'error');
      return;
    }
    if (!ackPolicies || !ackService) {
      showToast('İlerleyebilmek için her iki beyanı da işaretlemeniz gerekmektedir.', 'error');
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
      setCompensationNote('');
      setWhyAnirias('');
      setAckPolicies(false);
      setAckService(false);
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
            görev tanımı, gönüllülük ve ücret çerçevesi, gizlilik ile fikrî mülkiyet hükümleri ve başvurunun değerlendirilmesine ilişkin hususlar
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

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Gönüllülük, ücret ve şeffaflık</h2>
          <ul className="list-disc list-inside space-y-3 text-gray-400 ml-2 md:ml-4 mb-6">
            <li>
              <strong className="text-white">Varsayılan çerçeve:</strong> Fansub geleneğine uygun olarak katkı, çoğu hâlde gönüllülük esasına dayanmaktadır.
              Bu husus, katkının değersizleştirildiği anlamına gelmemekte; ekip içi saygı, deneyim kazanımı, portföy oluşturma ile döneme bağlı olarak
              sembolik geri bildirimler söz konusu olabilmektedir. Söz konusu unsurlar <em>taahhüt niteliği taşımamaktadır</em>.
            </li>
            <li>
              <strong className="text-white">Ücret ve telafi:</strong> Belirli projelerde süreklilik, özel uzmanlık veya yoğun sorumluluk hâllerinde ücret,
              bölüm bazlı ücret veya makul telafi seçenekleri, <strong className="text-white">ayrı görüşme ve yazılı mutabakat</strong> ile
              değerlendirilecektir. Ön görüşmede belirtilen rakamlar, resmî teklif veya sözleşme imzalanmadıkça bağlayıcı olmayacaktır.
            </li>
            <li>
              <strong className="text-white">Vergi ve hukukî statü:</strong> Ücretli iş birliklerinde fatura, vergi mükellefiyeti veya serbest meslek
              statüsü gibi hususlar ilgili tarafların kendi yükümlülüğündedir. Platform, işletmeci sıfatıyla koşulları proje bazında netleştirmektedir.
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

            <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <legend className={labelClass + ' px-1'}>Ücret ve telafi beklentisi</legend>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="comp"
                  checked={compensationModel === 'volunteer'}
                  onChange={() => setCompensationModel('volunteer')}
                  className="mt-1 border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>Gönüllü katkı ile başlamayı; ücret talebinin öncelik arz etmemesini kabul ederim.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="comp"
                  checked={compensationModel === 'open_discussion'}
                  onChange={() => setCompensationModel('open_discussion')}
                  className="mt-1 border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>Gönüllülük esası geçerli olmakla birlikte, yoğun projelerde ücret veya telafinin ayrıca yazılı mutabakatla görüşülebileceğini
                  kabul ederim.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="comp"
                  checked={compensationModel === 'paid_preferred'}
                  onChange={() => setCompensationModel('paid_preferred')}
                  className="mt-1 border-white/30 bg-black text-primary focus:ring-primary"
                />
                <span>Öncelikle ücretli iş birliği talep etmekteyim; nitelik ve süre şartlarının ayrıca geçerli olduğunu bilirim.</span>
              </label>
              <div className="pt-2">
                <label htmlFor="ta-comp-note" className={labelClass}>
                  Ücret veya telafiye ilişkin ek not (isteğe bağlı)
                </label>
                <input
                  id="ta-comp-note"
                  className={inputClass}
                  value={compensationNote}
                  onChange={(e) => setCompensationNote(e.target.value)}
                  placeholder="Beklentilerinizi kısaca; bağlayıcı teklif ancak yazılı mutabakatla"
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
                  İşbu sayfadaki <strong className="text-white">gönüllülük ve ücret</strong>, <strong className="text-white">gizlilik</strong> ile{' '}
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

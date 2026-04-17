import React from 'react';
import { Link } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { TRANSLATOR_APPLY_PAGE_LAST_UPDATED_TR } from '@/config/site';

/**
 * Fansub / çevirmen başvuru bilgi sayfası.
 * Gönüllülük esaslı çerçeve; ücret veya telafi ayrı yazılı mutabakatla ele alınır.
 */
const TranslatorApplication: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-background font-inter pt-32 pb-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_-15%,rgba(229,9,20,0.07),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl px-6">
        <header className="mb-14 border-b border-white/[0.1] pb-10 md:mb-16">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.4em] text-primary">Gönüllü fansub · ücret ayrı konuşulur</p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white md:text-7xl">Çevirmen başvurusu</h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
            ANIRIAS çeviri ekibine katılmak isteyenler için bilgilendirme ve çerçeve metinler. Varsayılan model{' '}
            <strong className="text-white">gönüllü katkı</strong>dır; proje ve yükümlülüklere göre ücret veya telafi ayrıca ve yazılı olarak
            değerlendirilir — bu sayfadaki metinler tek başına iş sözleşmesi veya teklif oluşturmaz.
          </p>
        </header>

        <div className="prose prose-invert prose-lg max-w-none leading-relaxed text-gray-400">
          <div className="not-prose mb-12 flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-black/25 p-5 backdrop-blur-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-primary">
              <Languages className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Nasıl başvurulur?</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Aşağıdaki ilkeleri okuduktan sonra{' '}
                <Link to="/iletisim" className="text-primary underline-offset-4 hover:underline">
                  iletişim
                </Link>{' '}
                sayfasından veya destek kanalınızdan bize yazın. Konu satırında <span className="text-white/90">“Çevirmen başvurusu”</span> belirtin;
                deneyiminiz, haftalık müsaitliğiniz, kullandığınız yazılımlar ve referans (varsa) linklerini eklemeniz süreci hızlandırır.
              </p>
            </div>
          </div>

          <h2 className="text-white text-xl font-black italic mt-2 mb-4 not-prose">Amaç ve rol</h2>
          <p className="mb-6">
            Çevirmenler; altyazı, çeviri düzeltmesi, terminoloji tutarlılığı ve zamanlama gibi alanlarda içeriğin Türkçe deneyimini güçlendirir.
            Çalışma biçimi fansub kültürüne yakın, ekip içi koordinasyon ve kalite standartlarına uyum gerektirir. Platformun güvenilirliği ve
            izleyici beklentisi gözetilir.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Gönüllülük ve ücret</h2>
          <ul className="list-disc list-inside space-y-3 text-gray-400 ml-2 md:ml-4 mb-6">
            <li>
              <strong className="text-white">Varsayılan:</strong> katkı gönüllülük esasındadır; karşılığında abonelik, rozet veya ekip içi tanınma
              gibi <em>sembolik</em> geri bildirimler sunulabilir — bunlar taahhüt değil, dönemsel uygulamalara bağlıdır.
            </li>
            <li>
              <strong className="text-white">Ücret ve telafi:</strong> belirli projelerde veya sürekli yükümlülükte ücret, bölüm başı ücret veya
              eşdeğer telafi (ör. hizmet karşılığı) <strong className="text-white">ayrı görüşme ve yazılı mutabakat</strong> ile konuşulur. Bu sayfada
              veya sözlü ön görüşmede verilen rakamlar, imzalanmış bir sözleşme veya net teklif olmadıkça bağlayıcı değildir.
            </li>
            <li>
              <strong className="text-white">Vergi ve yasal statü:</strong> ücretli iş birliklerinde taraflar kendi yükümlülüklerini (vergi, fatura,
              serbest meslek vb.) ayrıca netleştirir; ANIRIAS yalnızca platform işletmecisi sıfatıyla sözleşme veya ödeme koşullarını proje bazında
              tanımlar.
            </li>
          </ul>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Beklentiler</h2>
          <ul className="list-disc list-inside space-y-3 text-gray-400 ml-2 md:ml-4 mb-6">
            <li>
              <strong className="text-white">Dil ve üslup:</strong> doğal Türkçe, anime terminolojisine hakimiyet ve seri içi tutarlılık.
            </li>
            <li>
              <strong className="text-white">Teslim ve iletişim:</strong> üzerine alınan işlerde makul süre içinde geri dönüş; gecikmede ekip bilgilendirilir.
            </li>
            <li>
              <strong className="text-white">Gizlilik:</strong> erişilen ham metin, zaman çizelgeleri, kaynak dosyalar ve henüz yayımlanmamış içerik
              üçüncü kişilerle paylaşılmaz; sosyal medyada sızdırma veya erken spoil kesinlikle yasaktır.
            </li>
            <li>
              <strong className="text-white">Fikri mülkiyet:</strong> teslim edilen çevirilerin platformda kullanım, düzenleme ve arşivleme hakları
              ANIRIAS ile yapılacak ayrı sözleşme veya ekibe yazılı onay verdiğiniz politika çerçevesinde yürür; kendi başınıza aynı işi üçüncü tarafa
              devretmezsiniz.
            </li>
          </ul>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Seçim ve süreç</h2>
          <p className="mb-6">
            Başvurular dönemsel olarak değerlendirilir; her başvuruya otomatik kabul veya ret garantisi verilmez. Deneme çevirisi veya kısa teknik
            görev istenebilir. Uygun görülen adaylarla iletişim kurulur; uygun görülmeyen başvurulara ayrıca her zaman yanıt verilemeyebilir.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Davranış ve fesih</h2>
          <p className="mb-6">
            Taciz, ayrımcılık, sahte referans veya topluluk kurallarına aykırı davranışlarda iş birliği tek taraflı sonlandırılabilir. Gönüllü
            katılımcılar da makul bir ihbar süresi içinde çekilme hakkına sahiptir; üzerinde çalışılan güncel işlerin teslimi için ekip ile iyi niyetli
            koordinasyon beklenir.
          </p>

          <h2 className="text-white text-xl font-black italic mt-10 mb-4 not-prose">Sorumluluk sınırı</h2>
          <p className="mb-6 text-sm text-zinc-500">
            Bu metin bilgilendirme amaçlıdır; taraflar arasındaki nihai hak ve yükümlülükler imzalanan belgeler ve geçerli mevzuat ile belirlenir.
            ANIRIAS, bu sayfayı önceden haber vermeksizin güncelleyebilir.
          </p>

          <p className="text-sm text-gray-500 not-prose">Son güncelleme: {TRANSLATOR_APPLY_PAGE_LAST_UPDATED_TR}</p>
        </div>

        <div className="mt-16 flex flex-wrap gap-6 border-t border-white/[0.08] pt-10 md:mt-20">
          <Link
            to="/iletisim"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          >
            Başvuru için iletişim
          </Link>
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

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail, Instagram, Clock, ArrowUpRight, Music2 } from 'lucide-react';
import { PRIVACY_POLICY_LAST_UPDATED_TR, ABOUT_PAGE_LAST_UPDATED_TR } from '@/config/site';

const Legal: React.FC = () => {
  const location = useLocation();
  const type = location.pathname.replace('/', ''); // about, privacy, contact

  const content = {
    'hakkimizda': {
      title: 'HAKKIMIZDA',
      subtitle: 'ANIRIAS MANİFESTOSU',
      body: (
        <>
          <p className="mb-6 text-gray-300">
            ANIRIAS; animeyi yalnızca “bir şeyler açıp izlemek”ten öteye taşıyan, sinematik bir yayın deneyimi sunan dijital bir platformdur. Amacımız,
            katalogu büyütmek kadar; her açılışta hissettirdiği atmosfer, ritim ve sadakati de aynı çizgide tutmaktır.
          </p>
          <p className="mb-6">
            İlhamımız; hikâyenin gücü, karakterlerin duruşu ve izleyicide kalan o “bir sahne” hissidir. Seni yalnızca ekranın önüne değil, anlatının
            tam ortasına davet ederiz: burada izlemek bir alışkanlıktan çok, bir bağ kurma biçimidir.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">KİMLİĞİMİZ</h3>
          <p className="mb-6">
            Karanlık, kontrollü ve sinematik bir görsel dil; güçlü tipografi ve sade ama iddialı bir arayüz… ANIRIAS, animeyi sadece izlenen içerik
            olarak değil, hissedilen bir evren olarak konumlandırır. Her ekran — telefon, masaüstü veya TV — aynı marka sözünün devamı olacak şekilde
            düşünülür.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">VİZYONUMUZ</h3>
          <p className="mb-6">
            Türkiye ve ötesindeki anime izleyicisi için; kalite, erişilebilirlik ve özgün deneyimi aynı potada eriten, güvenilir ve hatırlanır bir
            referans platform olmak. Teknoloji ve tasarımı, hikâyeye hizmet eden araçlar olarak kullanırız — gürültüyü değil, netliği büyütürüz.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">MİSYONUMUZ</h3>
          <p className="mb-6">
            Global anime kültürünü; yüksek görüntüleme kalitesi, düzenli katalog yapısı ve kişiselleştirilebilir izleme akışı ile sunmak. Üyelerimize
            güvenli hesap, şeffaf iletişim ve sürekli gelişen bir ürün vadederiz — anime tutkunları için karakterli, kalıcı ve ciddiyetle büyüyen bir
            dijital merkez inşa etmek temel işimizdir.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">DEĞERLERİMİZ</h3>
          <ul className="list-disc list-inside space-y-3 text-gray-400 ml-2 md:ml-4 mb-6">
            <li>
              <strong className="text-white">Kalite:</strong> içerik sunumu, oynatıcı ve arayüzde aynı özen; “yeterince iyi” ile yetinmeyiz.
            </li>
            <li>
              <strong className="text-white">Güven ve şeffaflık:</strong> veri ve hesap konularında açık metinler; destek kanalları üzerinden ulaşılabilir olmak.
            </li>
            <li>
              <strong className="text-white">Özgünlük:</strong> kopya estetiklerden uzak, ANIRIAS’a özgü bir sinema salonu hissi.
            </li>
            <li>
              <strong className="text-white">İzleyici odağı:</strong> listeler, devam izleme ve hatırlatmalar gibi detaylarla günlük kullanımı kolaylaştırmak.
            </li>
          </ul>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">BİZE ULAŞIN</h3>
          <p className="mb-2">
            Öneri, iş birliği veya destek için{' '}
            <Link to="/iletisim" className="text-primary underline-offset-4 hover:underline">
              iletişim
            </Link>{' '}
            sayfamızdan yazabilirsiniz; geri bildiriminiz ürün yol haritamızın parçasıdır.
          </p>
          <p className="text-sm text-gray-500">Son güncelleme: {ABOUT_PAGE_LAST_UPDATED_TR}</p>
        </>
      )
    },
    'gizlilik': {
      title: 'GİZLİLİK',
      subtitle: 'VERİ POLİTİKASI',
      body: (
        <>
          <p className="mb-6 text-gray-300">
            Bu metin, ANIRIAS web ve uygulama deneyiminde hangi verilerin işlendiğini, hangi amaçlarla kullanıldığını ve haklarınızı özetler.
            Hizmeti kullanmaya devam ederek, aşağıdaki ilkeler çerçevesinde veri işlemeyi kabul etmiş sayılırsınız. Ayrıntılı talepler için{' '}
            <Link to="/iletisim" className="text-primary underline-offset-4 hover:underline">
              iletişim
            </Link>{' '}
            kanalını kullanabilirsiniz.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">KAPSAM</h3>
          <p className="mb-6">
            Politika; anirias.com üzerinden erişilen site, oturum açma ve profil özellikleri ile bağlantılı istemci uygulamaları (mobil, TV, masaüstü)
            kapsamındaki kişisel veri işlemlerini hedefler. Üçüncü taraf sitelere veya mağaza politikalarına (ör. Google Play, Apple App Store) tabi
            süreçler, ilgili platformların koşullarına göre ayrıca yürür.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">TOPLANAN VERİLER</h3>
          <ul className="list-disc list-inside space-y-3 text-gray-400 ml-2 md:ml-4 mb-6">
            <li>
              <strong className="text-white">Hesap bilgileri:</strong> kayıt veya giriş sırasında verdiğiniz e-posta adresi, kullanıcı adı ve profil
              tercihleri (ör. görünen ad, avatar).
            </li>
            <li>
              <strong className="text-white">Kullanım ve içerik etkileşimi:</strong> izleme geçmişi, listeler, favoriler ve uygulama içi tercihler; hizmeti
              kişiselleştirmek ve güvenliği denetlemek için işlenebilir.
            </li>
            <li>
              <strong className="text-white">Teknik ve oturum verileri:</strong> oturum çerezleri veya eşdeğer yerel depolama, cihaz/tarayıcı türü, yaklaşık
              bağlantı günlükleri (hata ayıklama ve kötüye kullanım önleme amaçlı, mümkün olduğunca minimize edilmiş).
            </li>
          </ul>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">AMAÇ VE HUKUKİ SEBEP</h3>
          <p className="mb-4">
            Verileriniz; hesabınızı oluşturmak ve sürdürmek, içerik ve özellikleri sunmak, güvenliği sağlamak, yasal yükümlülükleri yerine getirmek ve
            — açık rızanız veya ayarlarınız uyarınca — deneyimi iyileştirmek için işlenir. İşleme; sözleşmenin ifası, meşru menfaat veya yasal zorunluluk
            gibi sebeplere dayanabilir; pazarlama iletişimi için ayrı onay istenir.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">ALTYAPI VE ÜÇÜNCÜ TARAFLAR</h3>
          <p className="mb-4">
            Kimlik doğrulama, veri tabanı ve barındırma gibi çekirdek hizmetler güvenilir bulut sağlayıcıları (ör. Supabase ve seçilen CDN/hosting)
            üzerinden yürütülebilir. Bu sağlayıcılar yalnızca hizmetin teknik gereği ölçüsünde veriye erişir; sözleşmelerimiz gizlilik ve güvenlik
            standartlarına uygun olacak şekilde yapılandırılır.
          </p>
          <p className="mb-6">
            Ödeme veya analitik gibi ek araçlar kullanıldığında, ilgili işlem sırasında ayrı bilgilendirme veya sözleşme metinleri geçerli olur.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">ÇEREZLER VE YEREL DEPOLAMA</h3>
          <p className="mb-6">
            Oturumunuzu güvenli şekilde açık tutmak, tercihlerinizi hatırlamak ve performansı ölçmek için çerezler veya tarayıcı/uygulama depolaması
            kullanılabilir. Tarayıcı ayarlarınızdan çerezleri kısıtlayabilirsiniz; bazı özelliklerin kısmen çalışmaması mümkündür.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">SÜRE VE GÜVENLİK</h3>
          <p className="mb-6">
            Veriler, hesabınız aktif olduğu sürece veya yasal saklama zorunlulukları gerektirdiği ölçüde tutulur; artık gerekli olmayan kayıtlar silinir
            veya anonimleştirilir. Aktarım ve depolamada şifreleme, erişim kontrolleri ve düzenli güncellemeler gibi makul teknik ve idari tedbirler
            uygulanır; hiçbir sistem %100 risksiz değildir.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">HAKLARINIZ</h3>
          <p className="mb-4">
            KVKK ve ilgili mevzuat kapsamında, verilerinize erişim, düzeltme, silme veya işlemenin kısıtlanmasını talep etme, işlemeye itiraz etme ve
            şikâyet başvurusu yapma haklarına sahipsiniz. Taleplerinizi kimliğinizi doğrulayarak iletişim kanallarımız üzerinden iletebilirsiniz.
          </p>

          <h3 className="text-white text-xl font-black italic mt-10 mb-4">GÜNCELLEMELER</h3>
          <p className="mb-2">
            Bu politika hizmetteki değişikliklere göre güncellenebilir. Önemli değişikliklerde site veya uygulama üzerinden makul şekilde duyuru yapılır.
          </p>
          <p className="text-sm text-gray-500">Son güncelleme: {PRIVACY_POLICY_LAST_UPDATED_TR}</p>
        </>
      )
    },
    'iletisim': {
      title: 'İLETİŞİM',
      subtitle: 'BİZE ULAŞIN',
      body: (
        <>
          <p className="mb-4 text-gray-300">
            Teknik destek, içerik önerisi, iş birliği veya basın sorularınız için doğrudan yazabilirsiniz. Mümkün olduğunca net bir konu başlığı ve
            gerekirse ekran görüntüsü eklemeniz yanıt süremizi kısaltır.
          </p>
          <p className="mb-10 text-gray-400">
            Veri ve hesap talepleri için önce{' '}
            <Link to="/gizlilik" className="text-primary underline-offset-4 hover:underline">
              Gizlilik Politikası
            </Link>
            ’nı inceleyebilir; KVKK kapsamındaki başvurularınızı aynı e-posta hattından iletebilirsiniz.
          </p>
          <p className="mb-10 text-gray-400">
            ANIRIAS ekibine moderasyon, içerik, topluluk, sosyal medya, test veya teknik destek alanlarında katılmak isterseniz{' '}
            <Link to="/ekibe-katil" className="text-primary underline-offset-4 hover:underline">
              ekibe katıl başvurusu
            </Link>{' '}
            formunu doldurabilirsiniz. Çeviri yapmak isteyen adaylar için ayrı ve test içeren form aşağıdadır.
          </p>
          <p className="mb-10 text-gray-400">
            Çeviri ekibine katılım talebinde bulunmak için{' '}
            <Link to="/cevirmen-basvuru" className="text-primary underline-offset-4 hover:underline">
              çevirmen başvurusu
            </Link>{' '}
            sayfasındaki resmî bilgilendirme metnini inceleyip <strong className="text-white/90">aynı sayfada yer alan başvuru formunu</strong>{' '}
            doldurmanız gerekmektedir. E-posta ile ayrıca başvuru yapılması aranmamaktadır; ilave sorularınız için işbu iletişim kanalları
            kullanılabilir.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 not-prose">
            <a
              href="mailto:support@anirias.com"
              className="group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_24px_60px_-28px_rgba(229,9,20,0.2)]"
            >
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 opacity-60 blur-3xl transition-opacity group-hover:opacity-90"
                aria-hidden
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Mail className="h-5 w-5" strokeWidth={2} />
              </div>
              <h4 className="relative mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                E-posta
              </h4>
              <p className="relative mt-2 font-mono text-lg font-semibold tracking-tight text-white transition-colors group-hover:text-primary sm:text-xl">
                support@anirias.com
              </p>
              <p className="relative mt-3 text-sm leading-relaxed text-zinc-500">
                Genel destek, iş birliği ve yasal / veri talepleri için tek adres.
              </p>
              <span className="relative mt-5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors group-hover:text-white">
                Mesaj gönder
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </a>

            <a
              href="https://instagram.com/aniriasresmi"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_24px_60px_-28px_rgba(229,9,20,0.2)]"
            >
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/10 opacity-70 blur-3xl transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white">
                <Instagram className="h-5 w-5" strokeWidth={2} />
              </div>
              <h4 className="relative mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                Sosyal
              </h4>
              <p className="relative mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">@aniriasresmi</p>
              <p className="relative mt-3 text-sm leading-relaxed text-zinc-500">
                Duyurular, öne çıkan içerikler ve toplulukla güncel iletişim.
              </p>
              <span className="relative mt-5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors group-hover:text-white">
                Instagram’da aç
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </a>

            <a
              href="https://www.tiktok.com/@aniriasresmi"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_24px_60px_-28px_rgba(229,9,20,0.2)]"
            >
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-500/10 opacity-70 blur-3xl transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white">
                <Music2 className="h-5 w-5" strokeWidth={2} />
              </div>
              <h4 className="relative mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                TikTok
              </h4>
              <p className="relative mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">@aniriasresmi</p>
              <p className="relative mt-3 text-sm leading-relaxed text-zinc-500">
                Kısa içerikler, duyurular ve öne çıkan anları burada paylaşıyoruz.
              </p>
              <span className="relative mt-5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors group-hover:text-white">
                TikTok’ta aç
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </a>
          </div>

          <div className="not-prose mt-8 flex gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-5 backdrop-blur-sm md:items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400">
              <Clock className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Yanıt süresi</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Talepler genellikle birkaç iş günü içinde yanıtlanır; yoğun dönemlerde gecikme olabilir. Acil güvenlik veya hesap ihlali şüphesinde
                konu satırında <span className="text-white/90">“ACİL”</span> belirtmenizi rica ederiz.
              </p>
            </div>
          </div>
        </>
      )
    }
  };

  const pageData = content[type as keyof typeof content] || content['hakkimizda'];

  return (
    <div className="relative min-h-screen bg-background font-inter pt-32 pb-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_-15%,rgba(229,9,20,0.07),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl px-6">
        <header className="mb-14 border-b border-white/[0.1] pb-10 md:mb-16">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.4em] text-primary">{pageData.subtitle}</p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white md:text-7xl">{pageData.title}</h1>
        </header>

        <div className="prose prose-invert prose-lg max-w-none leading-relaxed text-gray-400">{pageData.body}</div>

        <div className="mt-16 flex flex-wrap gap-6 border-t border-white/[0.08] pt-10 md:mt-20">
          <Link
            to="/"
            className="text-xs font-black uppercase tracking-widest text-white transition-colors hover:text-primary"
          >
            Ana sayfaya dön
          </Link>
          {type === 'iletisim' ? (
            <Link
              to="/uygulamalar"
              className="text-xs font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-primary"
            >
              Uygulamalar
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Legal;

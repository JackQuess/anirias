import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PRIVACY_POLICY_LAST_UPDATED_TR } from '@/config/site';

const Legal: React.FC = () => {
  const location = useLocation();
  const type = location.pathname.replace('/', ''); // about, privacy, contact

  const content = {
    'hakkimizda': {
      title: 'HAKKIMIZDA',
      subtitle: 'ANIRIAS MANİFESTOSU',
      body: (
        <>
          <p className="mb-6">Anirias, anime tutkunları için tasarlanmış, sıradanlığın ötesine geçen yeni nesil bir yayın platformudur. İlhamını anime dünyasının ikonik, karizmatik ve güçlü karakterlerinden alır; izleyiciyi yalnızca ekrana değil, hikâyenin merkezine taşır. Burada izlemek bir alışkanlık değil, bir bağ kurma biçimidir.</p>
          <p className="mb-6">Karanlık estetik, güçlü bir duruş ve zarif bir sadelik… Anirias, animeyi yalnızca anlatılan bir hikâye olarak değil, hissedilen bir evren olarak sunar. Her detay, izleyicide iz bırakmak için tasarlanır.</p>
          <h3 className="text-white text-xl font-black italic mt-8 mb-4">MİSYONUMUZ</h3>
          <p>Global anime kültürünü; yüksek kalite, özgün atmosfer ve sadakat hissi odağında sunarak, anime tutkunları için güvenilir, karakterli ve kalıcı bir dijital merkez oluşturmak.</p>
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
          <p className="mb-8">Bir sorunuz, öneriniz veya iş birliği teklifiniz mi var? Aşağıdaki kanallar üzerinden ekibimizle doğrudan iletişime geçebilirsiniz.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                <h4 className="text-primary font-black uppercase text-xs tracking-widest mb-2">GENEL DESTEK & İŞ BİRLİĞİ</h4>
                <a href="mailto:support@anirias.com" className="text-white font-mono text-lg hover:text-primary transition-colors">support@anirias.com</a>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                <h4 className="text-primary font-black uppercase text-xs tracking-widest mb-2">SOSYAL MEDYA</h4>
                <a href="https://instagram.com/aniriascom" target="_blank" rel="noopener noreferrer" className="text-white font-mono text-lg hover:text-primary transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  @aniriascom
                </a>
             </div>
          </div>
        </>
      )
    }
  };

  const pageData = content[type as keyof typeof content] || content['hakkimizda'];

  return (
    <div className="min-h-screen bg-background font-inter pt-32 pb-20">
       <div className="max-w-4xl mx-auto px-6">
          <header className="mb-16 border-b border-white/10 pb-10">
             <p className="text-primary text-xs font-black uppercase tracking-[0.4em] mb-2">{pageData.subtitle}</p>
             <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter">{pageData.title}</h1>
          </header>

          <div className="prose prose-invert prose-lg max-w-none text-gray-400 leading-relaxed">
             {pageData.body}
          </div>

          <div className="mt-20 pt-10 border-t border-white/10 flex gap-6">
             <Link to="/" className="text-xs font-black text-white hover:text-primary uppercase tracking-widest transition-colors">Ana Sayfaya Dön</Link>
          </div>
       </div>
    </div>
  );
};

export default Legal;

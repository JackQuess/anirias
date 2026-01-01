
import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const Legal: React.FC = () => {
  const location = useLocation();
  const type = location.pathname.replace('/', ''); // about, privacy, contact

  const content = {
    'hakkimizda': {
      title: 'HAKKIMIZDA',
      subtitle: 'ANIRIAS MANİFESTOSU',
      body: (
        <>
          <p className="mb-6">Anirias, anime tutkunları için tasarlanmış, sıradanlığa meydan okuyan yeni nesil bir yayın platformudur. Biz sadece anime izletmiyoruz; size o evrenin bir parçası olma hissini yaşatıyoruz.</p>
          <p className="mb-6">Modern arayüzümüz, yapay zeka destekli öneri motorumuz ve topluluk odaklı özelliklerimizle, izleme deneyimini pasif bir eylemden aktif bir yolculuğa dönüştürüyoruz.</p>
          <h3 className="text-white text-xl font-black italic mt-8 mb-4">MİSYONUMUZ</h3>
          <p>Global anime kültürünü, en yüksek kalitede ve en erişilebilir şekilde sunarak, hayranlar için dijital bir sığınak oluşturmak.</p>
        </>
      )
    },
    'gizlilik': {
      title: 'GİZLİLİK',
      subtitle: 'VERİ POLİTİKASI',
      body: (
        <>
          <p className="mb-6">Gizliliğiniz bizim için önemlidir. Bu Gizlilik Politikası, Anirias platformunu kullanırken verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.</p>
          <ul className="list-disc list-inside space-y-4 text-gray-400 ml-4">
            <li><strong className="text-white">Veri Toplama:</strong> Hesap oluştururken sağladığınız e-posta ve kullanıcı adı gibi temel bilgileri saklarız.</li>
            <li><strong className="text-white">Çerezler:</strong> İzleme deneyiminizi kişiselleştirmek ve oturumunuzu açık tutmak için çerezler kullanırız.</li>
            <li><strong className="text-white">Güvenlik:</strong> Verileriniz endüstri standardı şifreleme yöntemleriyle korunmaktadır. Asla üçüncü taraflarla izniniz olmadan paylaşılmaz.</li>
          </ul>
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
                <h4 className="text-brand-red font-black uppercase text-xs tracking-widest mb-2">GENEL DESTEK & İŞ BİRLİĞİ</h4>
                <a href="mailto:support@anirias.com" className="text-white font-mono text-lg hover:text-brand-red transition-colors">support@anirias.com</a>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                <h4 className="text-brand-red font-black uppercase text-xs tracking-widest mb-2">SOSYAL MEDYA</h4>
                <a href="https://instagram.com/aniriascom" target="_blank" rel="noopener noreferrer" className="text-white font-mono text-lg hover:text-brand-red transition-colors flex items-center gap-2">
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
    <div className="min-h-screen bg-brand-black pt-32 pb-20">
       <div className="max-w-4xl mx-auto px-6">
          <header className="mb-16 border-b border-white/10 pb-10">
             <p className="text-brand-red text-xs font-black uppercase tracking-[0.4em] mb-2">{pageData.subtitle}</p>
             <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter">{pageData.title}</h1>
          </header>

          <div className="prose prose-invert prose-lg max-w-none text-gray-400 leading-relaxed">
             {pageData.body}
          </div>

          <div className="mt-20 pt-10 border-t border-white/10 flex gap-6">
             <Link to="/" className="text-xs font-black text-white hover:text-brand-red uppercase tracking-widest transition-colors">Ana Sayfaya Dön</Link>
          </div>
       </div>
    </div>
  );
};

export default Legal;

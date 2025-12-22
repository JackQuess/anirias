
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
                <h4 className="text-brand-red font-black uppercase text-xs tracking-widest mb-2">GENEL DESTEK</h4>
                <p className="text-white font-mono text-lg">support@anirias.com</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                <h4 className="text-brand-red font-black uppercase text-xs tracking-widest mb-2">İŞ BİRLİĞİ</h4>
                <p className="text-white font-mono text-lg">partners@anirias.com</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 rounded-2xl md:col-span-2">
                <h4 className="text-brand-red font-black uppercase text-xs tracking-widest mb-2">ADRES</h4>
                <p className="text-white">Teknoloji Vadisi, Blok 404, No: 12, İstanbul/Türkiye</p>
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

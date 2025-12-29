
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';
import EmailVerificationCard from '@/components/EmailVerificationCard';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState('');

  useEffect(() => {
    if (status === 'AUTHENTICATED' && user) {
      if (!user.email_confirmed_at) {
        setSignedUpEmail(user.email || '');
        setShowEmailVerification(true);
      } else {
        navigate('/');
      }
    }
  }, [user, status, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSupabaseEnv || !supabase) {
      setError('Supabase bağlantısı yapılandırılamadı.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Production domain için email doğrulama redirect URL'i
      // HashRouter kullanıldığı için /#/auth/callback formatında
      const emailRedirectTo = 'https://anirias.vercel.app/#/auth/callback';
      
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, role: 'user' },
          emailRedirectTo: emailRedirectTo
        }
      });

      if (authError) throw authError;
      
      // Check if email confirmation is required
      if (data.user && !data.user.email_confirmed_at) {
        setSignedUpEmail(data.user.email || '');
        setShowEmailVerification(true);
      } else {
        alert('Kayıt başarılı! Lütfen giriş yapın.');
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Show email verification card if needed
  if (showEmailVerification && signedUpEmail) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative Blur Backgrounds */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-10">
            <Link to="/" className="text-5xl font-black text-brand-red italic tracking-tighter drop-shadow-[0_0_15px_rgba(229,9,20,0.4)]">
              ANIRIAS
            </Link>
          </div>
          <EmailVerificationCard
            email={signedUpEmail}
            onVerified={() => {
              setShowEmailVerification(false);
              navigate('/login');
            }}
          />
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowEmailVerification(false);
                if (supabase) supabase.auth.signOut();
              }}
              className="text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
            >
              ← Kayıt Sayfasına Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link to="/" className="text-5xl font-black text-brand-red italic tracking-tighter drop-shadow-[0_0_15px_rgba(229,9,20,0.4)]">
            ANIRIAS
          </Link>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-10 md:p-12 rounded-[2.5rem] shadow-2xl">
          <h2 className="text-3xl font-black text-white mb-10 text-center uppercase italic tracking-tighter">
            Hemen <span className="text-brand-red">Katıl</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">KULLANICI ADI</label>
              <input
                type="text"
                required
                placeholder="anirias_fan"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red transition-all placeholder:text-gray-700"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">E-POSTA</label>
              <input
                type="email"
                required
                placeholder="ornek@mail.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red transition-all placeholder:text-gray-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">ŞİFRE</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red transition-all placeholder:text-gray-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-4 bg-brand-red/10 border border-brand-red/20 rounded-xl text-brand-red text-xs font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-brand-redHover text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-red/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {loading ? (
                 <>
                   <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   KAYIT YAPILIYOR...
                 </>
              ) : 'HEMEN KAYIT OL'}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
              Zaten üye misin?{' '}
              <Link to="/login" className="text-white hover:text-brand-red transition-all border-b border-white/10 hover:border-brand-red ml-1">
                GİRİŞ YAP
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

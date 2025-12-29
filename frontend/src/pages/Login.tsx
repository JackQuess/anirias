
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';
import EmailVerificationCard from '@/components/EmailVerificationCard';
import MascotLayer from '@/components/decorative/MascotLayer';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const [searchParams] = useSearchParams();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  
  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    // URL parametrelerinden email verification kontrolü
    const verified = searchParams.get('verified');
    const emailParam = searchParams.get('email');
    
    if (verified === 'true' && emailParam) {
      // Email doğrulama linkinden geldi, EmailVerificationCard göster
      setVerificationEmail(emailParam);
      setShowEmailVerification(true);
      // URL'den parametreleri temizle
      navigate('/login', { replace: true });
    } else if (status === 'AUTHENTICATED' && user) {
      // Check if email is verified
      if (!user.email_confirmed_at) {
        setVerificationEmail(user.email || '');
        setShowEmailVerification(true);
      } else {
        navigate('/');
      }
    }
  }, [user, status, navigate, searchParams]);

  /**
   * Email format kontrolü
   * Basit regex ile email formatını kontrol eder
   */
  const isEmailFormat = (input: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input.trim());
  };

  /**
   * Username ile email bulma
   * Supabase RPC function kullanarak username'den email adresini getirir
   * RPC function: get_email_by_username(username_input TEXT) -> TEXT
   */
  const getEmailByUsername = async (username: string): Promise<string | null> => {
    if (!hasSupabaseEnv || !supabase) return null;

    try {
      // Supabase RPC function çağrısı
      // Function direkt TEXT döndürür (array değil)
      const { data, error } = await supabase.rpc('get_email_by_username', {
        username_input: username.trim()
      });

      if (error) {
        console.error('[Login] RPC function error:', error);
        return null;
      }

      // RPC function direkt email string'i döndürür
      if (data && typeof data === 'string') {
        return data;
      }

      return null;
    } catch (err) {
      console.error('[Login] Unexpected error getting email by username:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSupabaseEnv || !supabase) {
      setError('Supabase bağlantısı yapılandırılamadı.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let emailToUse: string = emailOrUsername.trim();

      // Email formatı kontrolü
      if (isEmailFormat(emailToUse)) {
        // Email formatındaysa direkt kullan
        emailToUse = emailToUse;
      } else {
        // Username olarak kabul et, RPC function ile email'i bul
        const foundEmail = await getEmailByUsername(emailToUse);
        
        if (!foundEmail) {
          setError('Kullanıcı bulunamadı. Lütfen e-posta adresinizi veya kullanıcı adınızı kontrol edin.');
          setLoading(false);
          return;
        }
        
        // Bulunan email'i kullan
        emailToUse = foundEmail;
      }

      // Normal email + password login
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: emailToUse, 
        password 
      });
      
      if (authError) throw authError;
      
      if (data.user) {
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          setVerificationEmail(data.user.email || '');
          setShowEmailVerification(true);
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      // Supabase hatalarını kontrol et
      if (err.message?.includes('Invalid login credentials') || 
          err.message?.includes('Email not confirmed') ||
          err.message?.includes('User not found')) {
        setError('E-posta veya şifre hatalı. Lütfen tekrar deneyin.');
      } else {
        setError(err.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setResetLoading(true);
    setResetMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/update-password',
      });
      if (error) throw error;
      setResetMessage('Şifre sıfırlama bağlantısı e-posta adresine gönderildi.');
    } catch (err: any) {
      setResetMessage('Hata: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  // Show email verification card if needed
  if (showEmailVerification && verificationEmail) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative Blur Backgrounds */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-red/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-10">
            <Link to="/" className="text-5xl font-black text-brand-red italic tracking-tighter drop-shadow-[0_0_15px_rgba(229,9,20,0.4)]">
              ANIRIAS
            </Link>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-4">Premium Streaming Experience</p>
          </div>
          <EmailVerificationCard
            email={verificationEmail}
            onVerified={() => {
              setShowEmailVerification(false);
              // Email doğrulandı, ana sayfaya yönlendir
              navigate('/');
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
              ← Giriş Sayfasına Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Angel Boy Mascot - Bottom Right (only when email verification card is visible) */}
      {showEmailVerification && (
        <div className="fixed bottom-0 right-0 z-0 pointer-events-none">
          <MascotLayer type="angel" />
        </div>
      )}
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-red/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link to="/" className="text-5xl font-black text-brand-red italic tracking-tighter drop-shadow-[0_0_15px_rgba(229,9,20,0.4)]">
            ANIRIAS
          </Link>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-4">Premium Streaming Experience</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-10 md:p-12 rounded-[2.5rem] shadow-2xl">
          <h2 className="text-3xl font-black text-white mb-10 text-center uppercase italic tracking-tighter">
            Tekrar <span className="text-brand-red">Hoş Geldin</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">E-POSTA VEYA KULLANICI ADI</label>
              <input
                type="text"
                required
                placeholder="ornek@mail.com veya kullanici_adi"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red transition-all placeholder:text-gray-700"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">ŞİFRE</label>
                <button type="button" onClick={() => setShowForgot(true)} className="text-[9px] font-black text-brand-red uppercase tracking-widest hover:text-white transition-colors">Unuttun mu?</button>
              </div>
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
              <div className="p-4 bg-brand-red/10 border border-brand-red/20 rounded-xl text-brand-red text-xs font-bold text-center animate-pulse">
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
                  GİRİŞ YAPILIYOR...
                </>
              ) : 'HESABINA GİRİŞ YAP'}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
              Hesabın yok mu?{' '}
              <Link to="/signup" className="text-white hover:text-brand-red transition-all border-b border-white/10 hover:border-brand-red ml-1">
                HEMEN KAYDOL
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-brand-black/95 backdrop-blur-xl animate-fade-in" onClick={() => setShowForgot(false)} />
           <div className="relative w-full max-w-md bg-brand-surface border border-brand-border p-10 rounded-[2.5rem] shadow-2xl animate-fade-in-up">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Şifremi <span className="text-brand-red">Unuttum</span></h3>
              <p className="text-gray-400 text-xs mb-8">Kayıtlı e-posta adresini gir, sana sıfırlama bağlantısı gönderelim.</p>
              
              <form onSubmit={handleResetPassword} className="space-y-6">
                 <input 
                   type="email" 
                   required
                   value={resetEmail}
                   onChange={e => setResetEmail(e.target.value)}
                   placeholder="E-posta Adresin"
                   className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red"
                 />
                 
                 {resetMessage && (
                   <div className={`p-4 rounded-xl text-xs font-bold text-center ${resetMessage.startsWith('Hata') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                     {resetMessage}
                   </div>
                 )}

                 <div className="flex gap-4">
                    <button type="button" onClick={() => setShowForgot(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">İPTAL</button>
                    <button type="submit" disabled={resetLoading} className="flex-1 bg-brand-red text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-brand-red/20 disabled:opacity-50">
                       {resetLoading ? '...' : 'GÖNDER'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;

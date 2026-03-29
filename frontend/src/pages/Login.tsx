
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, AlertCircle, Star, LayoutDashboard } from 'lucide-react';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';
// TODO [v2]: Re-enable email verification
// import EmailVerificationCard from '@/components/EmailVerificationCard';
// import MascotLayer from '@/components/decorative/MascotLayer';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adminTimeout = searchParams.get('admin_timeout') === '1';
  const { user, status } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TODO [v2]: Re-enable email verification
  // const [showEmailVerification, setShowEmailVerification] = useState(false);
  // const [verificationEmail, setVerificationEmail] = useState('');
  
  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const AUTH_TIMEOUT_MS = 20000; // 20 sn - giriş isteği
  const USERNAME_RPC_TIMEOUT_MS = 25000; // 25 sn - kullanıcı adı → e-posta (canlıda yavaş olabiliyor)

  const configMissing = !hasSupabaseEnv;

  // TODO [v2]: Re-enable email verification check
  // Temporarily disabled: Users can login immediately without email confirmation
  useEffect(() => {
    if (status === 'AUTHENTICATED' && user) {
      // Direct navigation - no email verification required
      navigate('/');
    }
  }, [user, status, navigate]);

  useEffect(() => {
    const savedRemember = localStorage.getItem('anirias-remember-me');
    const savedIdentifier = localStorage.getItem('anirias-remember-identifier');

    if (savedRemember === '0') {
      setRememberMe(false);
    } else {
      setRememberMe(true);
    }

    if (savedIdentifier) {
      setEmailOrUsername(savedIdentifier);
    }
  }, []);

  /**
   * Email format kontrolü
   * Basit regex ile email formatını kontrol eder
   */
  const isEmailFormat = (input: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input.trim());
  };

  const getEmailByUsername = async (username: string): Promise<string | null> => {
    if (!hasSupabaseEnv || !supabase) return null;
    const runRpc = async (): Promise<string | null> => {
      const rpcPromise = supabase.rpc('get_email_by_username', {
        username_input: username.trim()
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Username sorgusu zaman asimina ugradi')), USERNAME_RPC_TIMEOUT_MS)
      );
      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;

      if (error) return null;

      if (data && typeof data === 'string') return data;
      return null;
    };
    try {
      const result = await runRpc();
      return result;
    } catch (err: any) {
      if (err?.message?.includes('zaman asimina')) {
        try {
          return await runRpc();
        } catch (retryErr: any) {
          throw retryErr;
        }
      }
      throw err;
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
        let foundEmail: string | null = null;
        try {
          foundEmail = await getEmailByUsername(emailToUse);
        } catch (rpcErr: any) {
          // Zaman aşımı veya RPC hatası: kullanıcıya anlamlı mesaj göster (aşağıdaki catch'e düşecek)
          throw rpcErr;
        }
        if (!foundEmail) {
          setError('Kullanıcı bulunamadı. Lütfen e-posta adresinizi veya kullanıcı adınızı kontrol edin.');
          setLoading(false);
          return;
        }
        emailToUse = foundEmail;
      }

      // Normal email + password login
      const signInPromise = supabase.auth.signInWithPassword({ 
        email: emailToUse, 
        password 
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Giris istegi zaman asimina ugradi. Baglantini kontrol et.')), AUTH_TIMEOUT_MS)
      );
      const { data, error: authError } = await Promise.race([signInPromise, timeoutPromise]) as any;
      
      if (authError) {
        throw authError;
      }
      
      if (data.user) {
        if (rememberMe) {
          localStorage.setItem('anirias-remember-me', '1');
          localStorage.setItem('anirias-remember-identifier', emailOrUsername.trim());
        } else {
          localStorage.setItem('anirias-remember-me', '0');
          localStorage.removeItem('anirias-remember-identifier');
        }
        navigate('/');
      }
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials') ||
          err.message?.includes('User not found')) {
        setError('E-posta veya şifre hatalı. Lütfen tekrar deneyin.');
      } else if (err.message?.includes('zaman asimina') || err.message?.includes('timeout')) {
        setError('Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin veya e-posta adresinizle giriş yapın.');
      } else {
        setError(err.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!hasSupabaseEnv || !supabase) {
      setError('Supabase yapılandırılmamış.');
      return;
    }
    setError(null);
    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oAuthError) throw oAuthError;
    } catch (err: any) {
      setError(err.message || 'Google ile giriş başarısız oldu.');
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

  // TODO [v2]: Re-enable email verification card UI
  // Temporarily disabled: No email verification card needed
  // if (showEmailVerification && verificationEmail) { ... }

  return (
    <div className="min-h-screen bg-background font-inter flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-surface-elevated/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6">
              <span className="text-primary font-black text-4xl tracking-tighter">ANIRIAS</span>
            </Link>
            <h1 className="text-2xl font-bold text-white mb-2">Hoş Geldiniz</h1>
            <p className="text-white/50 text-sm">Hesabınla devam et veya Google ile gir.</p>
          </div>

          {configMissing && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200">
              <p className="font-black text-xs uppercase tracking-widest mb-1">Yapılandırma eksik</p>
              <p className="text-[11px] opacity-90">
                <code className="bg-black/30 px-1 rounded">VITE_SUPABASE_URL</code> ve{' '}
                <code className="bg-black/30 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> tanımlı olmalı.
              </p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="err"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {adminTimeout && !error ? (
            <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
              Admin oturumu zaman aşımına uğradı. Tekrar giriş yapın.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                required
                disabled={configMissing}
                placeholder="E-posta veya kullanıcı adı"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="password"
                required
                disabled={configMissing}
                placeholder="Şifre"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <label className="flex items-center gap-2 text-white/50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-primary"
                />
                Beni hatırla
              </label>
              <button type="button" onClick={() => setShowForgot(true)} className="text-primary font-bold hover:underline">
                Şifremi unuttum
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || configMissing}
              className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  İşleniyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
            {loading ? (
              <button
                type="button"
                onClick={() => setLoading(false)}
                className="w-full py-2 text-xs text-muted hover:text-white border border-white/10 rounded-xl"
              >
                İptal
              </button>
            ) : null}
          </form>

          <div className="relative py-4 mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-white/30 font-medium tracking-widest">Veya</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={configMissing}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-xl hover:bg-white/90 transition-all active:scale-[0.98] mb-8 disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
            Google ile Devam Et
          </button>

          <div className="text-center space-y-4">
            <p className="text-white/50 text-sm">
              Hesabın yok mu?{' '}
              <Link to="/signup" className="text-primary font-bold hover:underline">
                Hemen Kayıt Ol
              </Link>
            </p>
            <p className="text-white/40 text-xs leading-relaxed max-w-[280px] mx-auto">
              Giriş yaparak{' '}
              <Link to="/hakkimizda" className="text-white/60 hover:text-primary underline underline-offset-4">
                bilgilendirme
              </Link>{' '}
              ve{' '}
              <Link to="/gizlilik" className="text-white/60 hover:text-primary underline underline-offset-4">
                gizlilik
              </Link>{' '}
              metinlerini kabul etmiş olursun.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-8 text-white/30">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Premium</span>
          </div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Katalog</span>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-background/95 backdrop-blur-xl animate-fade-in" onClick={() => setShowForgot(false)} />
           <div className="relative w-full max-w-md glass-panel border border-white/10 p-10 rounded-2xl shadow-2xl animate-fade-in-up">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Şifremi <span className="text-primary">Unuttum</span></h3>
              <p className="text-gray-400 text-xs mb-8">Kayıtlı e-posta adresini gir, sana sıfırlama bağlantısı gönderelim.</p>
              
              <form onSubmit={handleResetPassword} className="space-y-6">
                 <input 
                   type="email" 
                   required
                   value={resetEmail}
                   onChange={e => setResetEmail(e.target.value)}
                   placeholder="E-posta Adresin"
                   className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-primary"
                 />
                 
                 {resetMessage && (
                   <div className={`p-4 rounded-xl text-xs font-bold text-center ${resetMessage.startsWith('Hata') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                     {resetMessage}
                   </div>
                 )}

                 <div className="flex gap-4">
                    <button type="button" onClick={() => setShowForgot(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">İPTAL</button>
                    <button type="submit" disabled={resetLoading} className="flex-1 bg-primary text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-primary/25 disabled:opacity-50">
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

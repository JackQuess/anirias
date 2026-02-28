
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';
// TODO [v2]: Re-enable email verification
// import EmailVerificationCard from '@/components/EmailVerificationCard';
// import MascotLayer from '@/components/decorative/MascotLayer';

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  const AUTH_TIMEOUT_MS = 15000; // 15 sn - takilmayi onlemek icin

  const configMissing = !hasSupabaseEnv;
  if (typeof window !== 'undefined') {
    console.log('[Anirias:Login] mount', { configMissing, hasSupabaseEnv, adminTimeout });
  }

  // TODO [v2]: Re-enable email verification check
  // Temporarily disabled: Users can login immediately without email confirmation
  useEffect(() => {
    if (status === 'AUTHENTICATED' && user) {
      // Direct navigation - no email verification required
      navigate('/');
    }
  }, [user, status, navigate]);

  /**
   * Email format kontrolü
   * Basit regex ile email formatını kontrol eder
   */
  const isEmailFormat = (input: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input.trim());
  };

  const getEmailByUsername = async (username: string): Promise<string | null> => {
    if (!hasSupabaseEnv || !supabase) {
      console.log('[Anirias:Login] getEmailByUsername: Supabase not configured');
      return null;
    }
    console.log('[Anirias:Login] getEmailByUsername start', { username });
    try {
      const rpcPromise = supabase.rpc('get_email_by_username', {
        username_input: username.trim()
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Username sorgusu zaman asimina ugradi')), AUTH_TIMEOUT_MS)
      );
      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;

      if (error) {
        console.error('[Anirias:Login] getEmailByUsername RPC error', error);
        return null;
      }

      if (data && typeof data === 'string') {
        console.log('[Anirias:Login] getEmailByUsername ok', { username, emailPrefix: data.slice(0, 5) + '...' });
        return data;
      }

      console.log('[Anirias:Login] getEmailByUsername: no email found', { username });
      return null;
    } catch (err) {
      console.error('[Anirias:Login] getEmailByUsername error', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSupabaseEnv || !supabase) {
      console.error('[Anirias:Login] handleSubmit: Supabase not configured');
      setError('Supabase bağlantısı yapılandırılamadı.');
      return;
    }

    console.log('[Anirias:Login] handleSubmit start', { emailOrUsername: emailOrUsername.slice(0, 10) + '...' });
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
          setError('Kullanıcı bulunamadı veya bağlantı yavaş. E-posta adresinizle deneyin veya Supabase\'de get_email_by_username fonksiyonunu kontrol edin.');
          setLoading(false);
          return;
        }
        
        // Bulunan email'i kullan
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
        console.error('[Anirias:Login] signInWithPassword error', authError);
        throw authError;
      }
      
      console.log('[Anirias:Login] signInWithPassword success', { userId: data?.user?.id });
      // TODO [v2]: Re-enable email verification check
      // Temporarily disabled: Users are automatically logged in
      if (data.user) {
        navigate('/');
      }
    } catch (err: any) {
      console.error('[Anirias:Login] handleSubmit error', err?.message || err);
      if (err.message?.includes('Invalid login credentials') ||
          err.message?.includes('User not found')) {
        setError('E-posta veya şifre hatalı. Lütfen tekrar deneyin.');
      } else if (err.message?.includes('zaman asimina') || err.message?.includes('timeout')) {
        setError('Bağlantı zaman aşımına uğradı. İnterneti kontrol edip e-posta adresinizle tekrar deneyin.');
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

  // TODO [v2]: Re-enable email verification card UI
  // Temporarily disabled: No email verification card needed
  // if (showEmailVerification && verificationEmail) { ... }

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

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-10 md:p-12 rounded-[2.5rem] shadow-2xl">
          {configMissing && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200">
              <p className="font-black text-xs uppercase tracking-widest mb-1">Fetch / Bağlantı çalışmıyor</p>
              <p className="text-[11px] opacity-90">Supabase yapılandırılmamış. Build sırasında <code className="bg-black/30 px-1 rounded">VITE_SUPABASE_URL</code> ve <code className="bg-black/30 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> tanımlanmalı. Canlı sitede bu değişkenleri deploy ortamında (Vercel/Netlify vb.) ekleyip projeyi yeniden build edin.</p>
            </div>
          )}
          <h2 className="text-3xl font-black text-white mb-10 text-center uppercase italic tracking-tighter">
            Tekrar <span className="text-brand-red">Hoş Geldin</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">E-POSTA VEYA KULLANICI ADI</label>
              <input
                type="text"
                required
                disabled={configMissing}
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
                disabled={configMissing}
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
            {adminTimeout && !error && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-bold text-center">
                Admin sayfası bağlantı zaman aşımına uğradı. Tekrar giriş yapın.
              </div>
            )}

            <button
              type="submit"
              disabled={loading || configMissing}
              className="w-full bg-brand-red hover:bg-brand-redHover text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-red/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  GİRİŞ YAPILIYOR... (en fazla 15 sn)
                </>
              ) : 'HESABINA GİRİŞ YAP'}
            </button>
            {loading && (
              <>
                <p className="text-center text-[10px] text-gray-500">
                  Takılı kalırsa alanı e-posta adresinizle değiştirip tekrar deneyin.
                </p>
                <button
                  type="button"
                  onClick={() => setLoading(false)}
                  className="w-full py-2 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest border border-white/10 rounded-xl hover:bg-white/5"
                >
                  İptal
                </button>
              </>
            )}
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

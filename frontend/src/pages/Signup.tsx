
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Mail, Lock, AlertCircle, Star, LayoutDashboard } from 'lucide-react';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';
import { validateUsername } from '@/utils/usernameValidation';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const AUTH_TIMEOUT_MS = 35000;

  useEffect(() => {
    if (status === 'AUTHENTICATED' && user) {
      navigate('/');
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
      // Username validation
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        setError(usernameValidation.error || 'Kullanıcı adı geçersiz.');
        setLoading(false);
        return;
      }

      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username.trim(), role: 'user' },
        },
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Kayit istegi zaman asimina ugradi. Baglantini kontrol et.')), AUTH_TIMEOUT_MS)
      );
      const { data, error: authError } = await Promise.race([signUpPromise, timeoutPromise]) as any;

      if (authError) throw authError;
      
      if (data.user) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="bg-surface-elevated/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6">
              <span className="text-primary font-black text-4xl tracking-tighter">ANIRIAS</span>
            </Link>
            <h1 className="text-2xl font-bold text-white mb-2">Hesap Oluştur</h1>
            <p className="text-white/50 text-sm">Topluluğa katıl; listelerini ve ilerlemeni senkronize et.</p>
          </div>

          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="signup-err"
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

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                required
                placeholder="Kullanıcı adı"
                className={`w-full bg-white/5 border rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none transition-colors ${
                  usernameError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary/50'
                }`}
                value={username}
                onChange={(e) => {
                  const newUsername = e.target.value;
                  setUsername(newUsername);
                  if (newUsername.length > 0) {
                    const validation = validateUsername(newUsername);
                    setUsernameError(validation.isValid ? null : validation.error || null);
                  } else {
                    setUsernameError(null);
                  }
                }}
                onBlur={() => {
                  if (username.length > 0) {
                    const validation = validateUsername(username);
                    setUsernameError(validation.isValid ? null : validation.error || null);
                  }
                }}
              />
            </div>
            {usernameError ? (
              <p className="text-red-400 text-xs -mt-2">{usernameError}</p>
            ) : username.length > 0 ? (
              <p className="text-green-400 text-xs -mt-2">Kullanıcı adı uygun</p>
            ) : null}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="email"
                required
                placeholder="E-posta"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="password"
                required
                placeholder="Şifre"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !hasSupabaseEnv}
              className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Kayıt yapılıyor...
                </>
              ) : (
                'Kayıt Ol'
              )}
            </button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-white/50 text-sm">
              Zaten hesabın var mı?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Giriş Yap
              </Link>
            </p>
            <p className="text-white/40 text-xs leading-relaxed max-w-[280px] mx-auto">
              Kayıt olarak{' '}
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
    </div>
  );
};

export default Signup;


import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';
// TODO [v2]: Re-enable email verification
// import EmailVerificationCard from '@/components/EmailVerificationCard';
// import MascotLayer from '@/components/decorative/MascotLayer';
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
  // TODO [v2]: Re-enable email verification
  // const [showEmailVerification, setShowEmailVerification] = useState(false);
  // const [signedUpEmail, setSignedUpEmail] = useState('');

  // TODO [v2]: Re-enable email verification check
  // Temporarily disabled: Users can register and login immediately without email confirmation
  useEffect(() => {
    if (status === 'AUTHENTICATED' && user) {
      // Direct navigation - no email verification required
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

      // Production domain için email doğrulama redirect URL'i
      // HashRouter kullanıldığı için /#/auth/callback formatında
      const emailRedirectTo = 'https://anirias.vercel.app/#/auth/callback';
      
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username.trim(), role: 'user' },
          // TODO [v2]: Re-enable email confirmation redirect
          // emailRedirectTo: emailRedirectTo
        }
      });

      if (authError) throw authError;
      
      // TODO [v2]: Re-enable email verification flow
      // Temporarily disabled: Users are automatically logged in after signup
      if (data.user) {
        // Signup successful - user is automatically authenticated
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // TODO [v2]: Re-enable email verification card UI
  // Temporarily disabled: No email verification card needed
  // if (showEmailVerification && signedUpEmail) { ... }

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
                className={`w-full bg-white/5 border rounded-2xl px-6 py-4 text-white outline-none transition-all placeholder:text-gray-700 ${
                  usernameError 
                    ? 'border-red-500/50 focus:border-red-500' 
                    : 'border-white/10 focus:border-brand-red'
                }`}
                value={username}
                onChange={(e) => {
                  const newUsername = e.target.value;
                  setUsername(newUsername);
                  
                  // Real-time validation
                  if (newUsername.length > 0) {
                    const validation = validateUsername(newUsername);
                    setUsernameError(validation.isValid ? null : validation.error || null);
                  } else {
                    setUsernameError(null);
                  }
                }}
                onBlur={() => {
                  // Blur'da tekrar kontrol et
                  if (username.length > 0) {
                    const validation = validateUsername(username);
                    setUsernameError(validation.isValid ? null : validation.error || null);
                  }
                }}
              />
              {usernameError && (
                <p className="text-red-400 text-[9px] font-bold ml-2">{usernameError}</p>
              )}
              {!usernameError && username.length > 0 && (
                <p className="text-green-400 text-[9px] font-bold ml-2">✓ Kullanıcı adı uygun</p>
              )}
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

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';

/**
 * Auth Callback Page
 * 
 * Supabase email verification linklerinden yönlendirilen kullanıcıları karşılar.
 * Email doğrulama token'ını işler ve kullanıcıyı uygun sayfaya yönlendirir.
 */
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, status } = useAuth();

  useEffect(() => {
    if (!hasSupabaseEnv || !supabase) {
      console.error('[AuthCallback] Supabase not configured');
      navigate('/login');
      return;
    }

    const handleAuthCallback = async () => {
      try {
        // URL'den hash fragment'ini al (HashRouter kullanıldığı için)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Query params'ı da kontrol et (bazı durumlarda hash yerine query olabilir)
        const token = searchParams.get('token');
        const typeFromQuery = searchParams.get('type');

        if (accessToken && refreshToken) {
          // Supabase session'ı set et
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[AuthCallback] Session error:', sessionError);
            navigate('/login?error=session_error');
            return;
          }

          // Email doğrulama başarılı
          if (type === 'signup' || typeFromQuery === 'signup') {
            navigate('/login?verified=true');
          } else {
            navigate('/');
          }
        } else if (token) {
          // Token-based verification (eski format)
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email',
          });

          if (verifyError) {
            console.error('[AuthCallback] Verification error:', verifyError);
            navigate('/login?error=verification_failed');
          } else {
            navigate('/login?verified=true');
          }
        } else {
          // Token yok, zaten authenticated olabilir
          if (status === 'AUTHENTICATED' && user) {
            if (user.email_confirmed_at) {
              navigate('/');
            } else {
              navigate('/login?verified=false');
            }
          } else {
            navigate('/login');
          }
        }
      } catch (err: any) {
        console.error('[AuthCallback] Unexpected error:', err);
        navigate('/login?error=unexpected_error');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, status, user]);

  // Loading state
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-red/20 border-t-brand-red rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-black text-sm uppercase tracking-widest">
          Email Doğrulanıyor...
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;


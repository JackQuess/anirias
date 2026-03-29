import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';

/** OAuth / magic-link callback: session kurulduktan sonra ana sayfaya yönlendirir. */
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
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
        const otpType = (searchParams.get('type') as 'email' | 'recovery' | null) || 'email';

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[AuthCallback] Session error:', sessionError);
            navigate('/login?error=session_error');
            return;
          }

          navigate('/');
        } else if (tokenHash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });

          if (verifyError) {
            console.error('[AuthCallback] Verification error:', verifyError);
            navigate('/login?error=verification_failed');
          } else {
            navigate('/');
          }
        } else {
          if (status === 'AUTHENTICATED' && user) {
            navigate('/');
          } else {
            navigate('/login');
          }
        }
      } catch (err: any) {
        console.error('[AuthCallback] Unexpected error:', err);
        navigate('/login?error=unexpected_error');
      }
    };

    void handleAuthCallback();
  }, [navigate, searchParams, status, user]);

  return (
    <div className="min-h-screen bg-background font-inter flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-black text-sm uppercase tracking-widest">Giriş Yapılıyor...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

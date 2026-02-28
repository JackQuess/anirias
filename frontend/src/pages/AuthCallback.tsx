import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';

/**
 * Auth Callback Page
 * 
 * TODO [v2]: Re-enable email verification flow
 * Temporarily simplified: Handles auth callbacks but doesn't require email verification.
 * Users are redirected directly after authentication without email confirmation checks.
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
        // OAuth redirect'te token'lar genelde hash'te gelir (access_token, refresh_token)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // Query params'ı da kontrol et (bazı durumlarda hash yerine query olabilir)
        const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
        const otpType = (searchParams.get('type') as 'email' | 'recovery' | null) || 'email';

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

          // TODO [v2]: Re-enable email verification redirect
          // Temporarily disabled: Direct navigation to homepage
          navigate('/');
        } else if (tokenHash) {
          // Token-based verification (eski format)
          // Keep for backward compatibility but don't enforce verification
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });

          if (verifyError) {
            console.error('[AuthCallback] Verification error:', verifyError);
            navigate('/login?error=verification_failed');
          } else {
            // TODO [v2]: Re-enable email verification success flow
            // Temporarily disabled: Direct navigation to homepage
            navigate('/');
          }
        } else {
          // Token yok, zaten authenticated olabilir
          // TODO [v2]: Re-enable email_confirmed_at check
          if (status === 'AUTHENTICATED' && user) {
            // Direct navigation - no email verification required
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

    handleAuthCallback();
  }, [navigate, searchParams, status, user]);

  // Loading state
  // TODO [v2]: Update loading message when email verification is re-enabled
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-red/20 border-t-brand-red rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-black text-sm uppercase tracking-widest">
          Giriş Yapılıyor...
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;


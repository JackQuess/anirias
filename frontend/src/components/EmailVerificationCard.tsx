import React, { useState, useEffect } from 'react';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { showToast } from './ToastProvider';

interface EmailVerificationCardProps {
  email: string;
  onVerified?: () => void;
}

const EmailVerificationCard: React.FC<EmailVerificationCardProps> = ({ email, onVerified }) => {
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (cooldown > 0 || !hasSupabaseEnv || !supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: window.location.origin + '/#/login',
        },
      });

      if (error) throw error;

      setCooldown(45); // 45 saniye cooldown
      showToast('Doğrulama e-postası tekrar gönderildi! 📧', 'success');
    } catch (err: any) {
      console.error('[EmailVerificationCard] Resend error:', err);
      showToast(err.message || 'E-posta gönderilemedi. Lütfen tekrar deneyin.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      if (!hasSupabaseEnv || !supabase) {
        throw new Error('Supabase bağlantısı yapılandırılamadı.');
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session?.user?.email_confirmed_at) {
        showToast('E-posta doğrulandı! Giriş yapabilirsiniz. ✅', 'success');
        if (onVerified) {
          setTimeout(() => {
            onVerified();
          }, 1000);
        }
      } else {
        showToast('E-posta henüz doğrulanmamış. Lütfen e-postanızı kontrol edin.', 'info');
      }
    } catch (err: any) {
      console.error('[EmailVerificationCard] Check error:', err);
      showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-brand-red/10 border border-blue-500/20 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-xl">
      <div className="text-center mb-6">
        <div className="text-5xl mb-4">📩</div>
        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
          Email'ini <span className="text-brand-red">Doğrula</span>
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          Kayıt işlemin tamamlanması için e-posta adresini doğrulaman gerekiyor.
        </p>
      </div>

      <div className="space-y-4">
        {/* Email Info */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
            E-Posta Adresin
          </p>
          <p className="text-white font-bold text-sm break-all">{email}</p>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-xs text-yellow-400 font-bold leading-relaxed">
            💡 <strong>Önemli:</strong> E-postanı kontrol et. Spam klasörünü de kontrol etmeyi unutma!
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleResendEmail}
            disabled={loading || cooldown > 0}
            className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin" />
                Gönderiliyor...
              </>
            ) : cooldown > 0 ? (
              `Tekrar Gönder (${cooldown}s)`
            ) : (
              'Tekrar Email Gönder'
            )}
          </button>

          <button
            onClick={handleCheckVerification}
            disabled={checking}
            className="w-full bg-brand-red hover:bg-brand-redHover text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-brand-red/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Kontrol Ediliyor...
              </>
            ) : (
              <>
                Email'i Doğruladım → Giriş Yap
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationCard;


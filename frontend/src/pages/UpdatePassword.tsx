import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';

/**
 * Şifre sıfırlama akışı: E-posta linkine tıklanınca Supabase bu sayfaya
 * yönlendirir (hash: access_token, refresh_token, type=recovery).
 * Session kurulur, kullanıcı yeni şifresini girer.
 */
const UpdatePassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'loading' | 'form' | 'done' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv || !supabase) {
      navigate('/login');
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    if (accessToken && refreshToken && type === 'recovery') {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          setStep('form');
        })
        .catch((err) => {
          console.error('[UpdatePassword] setSession error:', err);
          setError('Oturum açılamadı. Link süresi dolmuş olabilir.');
          setStep('error');
        });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setStep('form');
        } else {
          setError('Geçersiz veya süresi dolmuş bağlantı. Şifre sıfırlama linkini tekrar isteyin.');
          setStep('error');
        }
      });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (!supabase) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setStep('done');
      setTimeout(() => navigate('/', { replace: true }), 2000);
    } catch (err: any) {
      setError(err.message || 'Şifre güncellenemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-red/20 border-t-brand-red rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-black text-sm uppercase tracking-widest">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-brand-red font-bold mb-6">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="bg-brand-red text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs"
          >
            Giriş sayfasına dön
          </button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-white font-bold mb-2">Şifreniz güncellendi.</p>
          <p className="text-gray-500 text-sm">Ana sayfaya yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter text-center mb-8">
          Yeni <span className="text-brand-red">Şifre</span>
        </h1>
        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-2xl space-y-6"
        >
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">YENİ ŞİFRE</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="En az 6 karakter"
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">ŞİFRE TEKRAR</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Aynı şifreyi tekrar girin"
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <div className="p-4 bg-brand-red/10 border border-brand-red/20 rounded-xl text-brand-red text-xs font-bold text-center">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-red hover:bg-brand-redHover text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {submitting ? 'Güncelleniyor...' : 'Şifreyi güncelle'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;

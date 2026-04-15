import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MessageCircleMore, X, Send, ShieldCheck } from 'lucide-react';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';
import { showToast } from '@/components/ToastProvider';
import type { SupportConversation, SupportMessage } from '@/types';

const LiveSupportWidget: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const shouldHide = useMemo(() => {
    if (!hasSupabaseEnv || !supabase) return true;
    if (location.pathname.startsWith('/admin')) return true;
    if (location.pathname.startsWith('/watch/')) return true;
    if (location.pathname === '/login' || location.pathname === '/signup') return true;
    return false;
  }, [location.pathname]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (!listRef.current) return;
      listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  const loadConversation = useCallback(async () => {
    if (!user?.id || !supabase || !hasSupabaseEnv) return;
    setLoading(true);
    try {
      const { data: convData, error: convErr } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (convErr) throw convErr;

      const conv = (convData as SupportConversation | null) || null;
      setConversation(conv);

      if (!conv?.id) {
        setMessages([]);
        return;
      }

      const { data: msgData, error: msgErr } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });
      if (msgErr) throw msgErr;
      setMessages((msgData as SupportMessage[]) || []);
      scrollToBottom();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[LiveSupportWidget] loadConversation', err);
      showToast('Canlı destek yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, scrollToBottom]);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    loadConversation();
  }, [isOpen, user?.id, loadConversation]);

  useEffect(() => {
    if (!isOpen || !supabase || !conversation?.id) return;
    const channel = supabase
      .channel(`support-user-${conversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          const message = payload.new as SupportMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, conversation?.id, scrollToBottom]);

  const ensureConversation = useCallback(async (): Promise<SupportConversation | null> => {
    if (!user?.id || !supabase) return null;
    if (conversation) return conversation;
    const { data, error } = await supabase
      .from('support_conversations')
      .insert({ user_id: user.id, status: 'open' })
      .select('*')
      .single();
    if (error) throw error;
    const conv = data as SupportConversation;
    setConversation(conv);
    return conv;
  }, [conversation, user?.id]);

  const sendMessage = useCallback(async () => {
    if (!user?.id || !supabase) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const conv = await ensureConversation();
      if (!conv) return;
      const { data: inserted, error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conv.id,
          sender_role: 'user',
          sender_user_id: user.id,
          message: text,
        })
        .select('*')
        .single();
      if (error) throw error;
      if (inserted) {
        const row = inserted as SupportMessage;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      }
      await supabase
        .from('support_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conv.id);
      setDraft('');
      scrollToBottom();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[LiveSupportWidget] sendMessage', err);
      showToast('Mesaj gönderilemedi.', 'error');
    } finally {
      setSending(false);
    }
  }, [draft, ensureConversation, user?.id, scrollToBottom]);

  if (shouldHide) return null;

  return (
    <>
      {isOpen ? (
        <div className="fixed bottom-5 right-4 z-[9999] w-[min(94vw,380px)] overflow-hidden rounded-3xl border border-white/10 bg-[#0a0b10] shadow-[0_24px_80px_-26px_rgba(0,0,0,0.9)]">
          <div className="relative border-b border-white/10 p-4">
            <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-black tracking-tight text-white">Canlı destek</p>
                <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.85)]" aria-hidden />
                  Ekibimiz çevrimiçi
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Canlı destek penceresini kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!user ? (
            <div className="space-y-3 p-4">
              <p className="text-sm text-zinc-300">Canlı destek için giriş yapman gerekiyor.</p>
              <Link
                to="/login"
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-[#b20710]"
                onClick={() => setIsOpen(false)}
              >
                Giriş yap
              </Link>
              <p className="text-[11px] text-zinc-500">
                Acil durum için: <a href="mailto:support@anirias.com" className="text-zinc-300 hover:text-white">support@anirias.com</a>
              </p>
            </div>
          ) : (
            <>
              <div ref={listRef} className="max-h-[44vh] space-y-2 overflow-y-auto p-4">
                {loading ? (
                  <p className="text-xs text-zinc-500">Mesajlar yükleniyor…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-zinc-400">
                    Merhaba! Sorunu yaz, ekip cevapladığında burada anlık görürsün.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_role === 'user';
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            mine ? 'bg-primary text-white' : 'border border-white/10 bg-white/[0.04] text-zinc-100'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.message}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-zinc-500'}`}>
                            {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-white/10 p-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-2 py-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Mesajını yaz…"
                    className="h-9 w-full bg-transparent px-2 text-sm text-white outline-none placeholder:text-zinc-600"
                    maxLength={1200}
                    aria-label="Canlı destek mesajı"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={sending || !draft.trim()}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-[#b20710] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Mesaj gönder"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Mesajlar güvenle saklanır
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9998] inline-flex min-h-[52px] items-center gap-2 rounded-full bg-primary px-5 text-sm font-black uppercase tracking-wide text-white shadow-2xl shadow-primary/30 transition-transform hover:scale-[1.03] hover:bg-[#b20710]"
        aria-label="Canlı desteği aç"
      >
        <MessageCircleMore className="h-5 w-5" />
        <span className="hidden sm:inline">Canlı destek</span>
      </button>
    </>
  );
};

export default LiveSupportWidget;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';
import type { SupportConversation, SupportMessage } from '@/types';

type ConversationWithProfile = SupportConversation & {
  profiles?: { username?: string | null } | null;
  last_message?: SupportMessage | null;
};

const AdminLiveSupport: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data: convData } = await supabase
      .from('support_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    const list = ((convData as SupportConversation[] | null) ?? []).map((c) => ({ ...c })) as ConversationWithProfile[];
    const ids = list.map((c) => c.id);
    const userIds = [...new Set(list.map((c) => c.user_id))];
    const usernames = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profileData } = await supabase.from('profiles').select('id,username').in('id', userIds);
      (profileData as { id: string; username: string | null }[] | null)?.forEach((p) => {
        usernames.set(p.id, p.username || '');
      });
    }

    list.forEach((c) => {
      c.profiles = { username: usernames.get(c.user_id) || null };
    });

    const lastMap = new Map<string, SupportMessage>();
    if (ids.length > 0) {
      const { data: msgData } = await supabase
        .from('support_messages')
        .select('*')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false });
      (msgData as SupportMessage[] | null)?.forEach((m) => {
        if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m);
      });
    }

    const merged = list.map((c) => ({ ...c, last_message: lastMap.get(c.id) || null }));
    setConversations(merged);
    if (!activeConversationId && merged[0]?.id) setActiveConversationId(merged[0].id);
    setLoading(false);
  }, [activeConversationId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data as SupportMessage[]) || []);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeConversationId) return;
    loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('admin-live-support')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
        const m = payload.new as SupportMessage;
        if (m.conversation_id === activeConversationId) {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, loadConversations]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const sendReply = useCallback(async () => {
    if (!supabase || !user?.id || !activeConversationId || !reply.trim()) return;
    setSending(true);
    const text = reply.trim();
    const { error } = await supabase.from('support_messages').insert({
      conversation_id: activeConversationId,
      sender_role: 'admin',
      sender_user_id: user.id,
      message: text,
    });
    if (!error) {
      await supabase
        .from('support_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConversationId);
      setReply('');
    }
    setSending(false);
  }, [activeConversationId, reply, user?.id]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">
          Canlı <span className="text-brand-red">Destek</span>
        </h1>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
          Kullanıcı destek konuşmaları (realtime)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-brand-dark p-3">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Yükleniyor…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Henüz konuşma yok.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const active = conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      active ? 'border-brand-red/50 bg-brand-red/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <p className="text-sm font-bold text-white">
                      {conv.profiles?.username || conv.user_id.slice(0, 8)}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-gray-400">
                      {conv.last_message?.message || 'İlk mesaj bekleniyor…'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-brand-dark">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-bold text-white">
              {activeConversation ? `Sohbet: ${activeConversation.profiles?.username || activeConversation.user_id}` : 'Sohbet seçin'}
            </p>
          </div>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
            {!activeConversation ? (
              <p className="text-sm text-gray-500">Soldan bir konuşma seçin.</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-500">Mesaj yok.</p>
            ) : (
              messages.map((m) => {
                const admin = m.sender_role === 'admin';
                return (
                  <div key={m.id} className={`flex ${admin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${admin ? 'bg-brand-red text-white' : 'bg-white/5 text-white'}`}>
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
                placeholder="Yanıt yaz…"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none"
                disabled={!activeConversation}
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={!activeConversation || sending || !reply.trim()}
                className="rounded-xl bg-brand-red px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLiveSupport;

import React, { useState, useEffect } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { showToast } from '@/components/ToastProvider';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { Announcement } from '../types';

const AdminAnnouncement: React.FC = () => {
  const { data: announcements, loading, error, reload } = useLoad(() => db.getAllAnnouncements());
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load existing announcement if available
  useEffect(() => {
    if (announcements && announcements.length > 0) {
      const active = announcements.find(a => a.is_active) || announcements[0];
      if (active) {
        setTitle(active.title);
        setMessage(active.message);
        setIsActive(active.is_active);
        setEditingId(active.id);
      }
    }
  }, [announcements]);

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Başlık ve mesaj gereklidir', 'error');
      return;
    }

    setSaving(true);
    try {
      const success = await db.saveAnnouncement({
        id: editingId || undefined,
        title: title.trim(),
        message: message.trim(),
        is_active: isActive,
      });

      if (success) {
        showToast('Duyuru başarıyla kaydedildi', 'success');
        reload();
        if (!editingId) {
          // Reset form if creating new
          setTitle('');
          setMessage('');
          setIsActive(true);
        }
      } else {
        showToast('Duyuru kaydedilirken bir hata oluştu', 'error');
      }
    } catch (err) {
      showToast('Beklenmedik bir hata oluştu', 'error');
      if (import.meta.env.DEV) console.error('[AdminAnnouncement] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setMessage('');
    setIsActive(true);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Duyuru <span className="text-brand-red">Yönetimi</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Site genelinde duyurular yayınlayın
          </p>
        </div>
        <LoadingSkeleton type="card" count={2} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Duyuru <span className="text-brand-red">Yönetimi</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Site genelinde duyurular yayınlayın
          </p>
        </div>
        <ErrorState message={error.message} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          Duyuru <span className="text-brand-red">Yönetimi</span>
        </h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
          Site genelinde duyurular yayınlayın
        </p>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 md:p-12 shadow-xl">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              BAŞLIK
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Test Sürecindeyiz"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red transition-all placeholder:text-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              MESAJ
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Duyuru mesajınızı buraya yazın..."
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red transition-all placeholder:text-gray-700 resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-1">
                Aktif Durumu
              </h4>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                Duyuruyu yayınla veya gizle
              </p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              disabled={saving}
              className={`
                relative w-16 h-8 rounded-full transition-all duration-300
                ${isActive ? 'bg-brand-red' : 'bg-white/10'}
                ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div
                className={`
                  absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all duration-300
                  ${isActive ? 'translate-x-8' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          <div className="flex gap-4 pt-6 border-t border-white/5">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !message.trim()}
              className={`
                flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs
                transition-all active:scale-95
                ${saving || !title.trim() || !message.trim()
                  ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                  : 'bg-brand-red hover:bg-brand-redHover text-white shadow-lg shadow-brand-red/20'
                }
              `}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  KAYDEDİLİYOR...
                </span>
              ) : (
                'KAYDET'
              )}
            </button>
            {editingId && (
              <button
                onClick={handleReset}
                disabled={saving}
                className="px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all"
              >
                YENİ DUYURU
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Existing Announcements List */}
      {announcements && announcements.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 md:p-12 shadow-xl">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-6">
            Mevcut <span className="text-brand-red">Duyurular</span>
          </h2>
          <div className="space-y-4">
            {announcements.map((announcement: Announcement) => (
              <div
                key={announcement.id}
                className={`p-6 rounded-2xl border ${
                  announcement.is_active
                    ? 'bg-brand-red/10 border-brand-red/30'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-black text-white uppercase tracking-tighter">
                        {announcement.title}
                      </h3>
                      {announcement.is_active && (
                        <span className="px-3 py-1 bg-brand-red text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                          AKTİF
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mb-2">
                      {announcement.message}
                    </p>
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                      {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTitle(announcement.title);
                      setMessage(announcement.message);
                      setIsActive(announcement.is_active);
                      setEditingId(announcement.id);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest transition-all"
                  >
                    DÜZENLE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncement;


import React from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { Feedback } from '../types';

const AdminFeedback: React.FC = () => {
  const { data: feedbacks, loading, error, reload } = useLoad<Feedback[]>(db.getFeedback);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-600 text-xs">Değerlendirme yok</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-600'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-gray-400 text-xs ml-1">({rating}/5)</span>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          Geri <span className="text-brand-red">Bildirimler</span>
        </h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
          Kullanıcılardan gelen geri bildirimleri görüntüleyin
        </p>
      </div>

      {loading && <LoadingSkeleton type="list" count={10} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && feedbacks && (
        <div className="bg-brand-dark border border-brand-border rounded-[2.5rem] overflow-hidden shadow-2xl">
          {feedbacks.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
                Henüz geri bildirim yok
              </p>
            </div>
          ) : (
            <div className="divide-y divide-brand-border">
              {feedbacks.map((feedback) => {
                const user = feedback.profiles as any;
                const isGuest = !feedback.user_id;
                
                return (
                  <div
                    key={feedback.id}
                    className="p-8 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-6 mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* User Avatar/Badge */}
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-lg flex-shrink-0 ${
                            isGuest
                              ? 'bg-gray-500/20 border border-gray-500/30 text-gray-400'
                              : 'bg-brand-red/20 border border-brand-red/30 text-brand-red'
                          }`}
                        >
                          {isGuest ? (
                            '👤'
                          ) : (
                            user?.username?.charAt(0).toUpperCase() || '?'
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-white font-black text-sm uppercase tracking-tight">
                              {isGuest ? 'Misafir Kullanıcı' : user?.username || 'İsimsiz Üye'}
                            </p>
                            {isGuest ? (
                              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-gray-500/20 text-gray-400 border border-gray-500/30">
                                Guest
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-brand-red/20 text-brand-red border border-brand-red/30">
                                Üye
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-[9px] font-mono tracking-tighter break-all">
                            {feedback.user_id || 'No user ID'}
                          </p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-gray-400 font-black text-[10px] italic">
                          {formatDate(feedback.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Rating */}
                    {feedback.rating && (
                      <div className="mb-4">
                        {renderStars(feedback.rating)}
                      </div>
                    )}

                    {/* Message */}
                    <div className="mb-4">
                      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                        {feedback.message}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
                      {feedback.page_url && (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                            Sayfa:
                          </span>
                          <a
                            href={feedback.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-brand-red hover:text-brand-redHover font-mono break-all max-w-md truncate"
                          >
                            {feedback.page_url}
                          </a>
                        </div>
                      )}
                      {feedback.user_agent && (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                            Cihaz:
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono max-w-md truncate">
                            {feedback.user_agent}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;


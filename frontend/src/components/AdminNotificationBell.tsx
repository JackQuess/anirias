import React, { useState, useEffect, useRef } from 'react';
import { AdminNotification } from '@/types';

interface AdminNotificationBellProps {
  adminToken: string;
}

const AdminNotificationBell: React.FC<AdminNotificationBellProps> = ({ adminToken }) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const backendUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/+$/, '');

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/admin/notifications`, {
        headers: {
          'X-ADMIN-TOKEN': adminToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('[AdminNotificationBell] Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await fetch(`${backendUrl}/api/admin/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ADMIN-TOKEN': adminToken,
        },
        body: JSON.stringify({ id }),
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('[AdminNotificationBell] Failed to mark notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch(`${backendUrl}/api/admin/notifications/read-all`, {
        method: 'POST',
        headers: {
          'X-ADMIN-TOKEN': adminToken,
        },
      });

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('[AdminNotificationBell] Failed to mark all as read:', err);
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [adminToken]);

  // Icon color based on notification type
  const getIconColor = (type: AdminNotification['type']) => {
    switch (type) {
      case 'info':
        return 'text-blue-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  // Icon emoji based on notification type
  const getIconEmoji = (type: AdminNotification['type']) => {
    switch (type) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '🔔';
    }
  };

  // Format time ago
  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Az önce';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} dk önce`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} sa önce`;
    return `${Math.floor(seconds / 86400)} gün önce`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-white/70 hover:text-white transition-colors"
        aria-label="Admin Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Bildirimler
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-brand-red hover:text-brand-red/80 transition-colors font-medium"
              >
                Tümünü Okundu İşaretle
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-white/50 text-sm">Yükleniyor...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-white/50 text-sm">
                Henüz bildirim yok
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                    !notification.is_read ? 'bg-brand-red/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`text-xl ${getIconColor(notification.type)}`}>
                      {getIconEmoji(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-sm font-bold text-white truncate">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-brand-red rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-white/70 mb-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-white/40">
                        <span className="uppercase font-medium">{notification.source}</span>
                        <span>•</span>
                        <span>{timeAgo(notification.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationBell;


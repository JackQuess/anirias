import React, { useEffect, useState } from 'react';
import { Toast } from './Toast';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

let toastQueue: ToastItem[] = [];
let toastIdCounter = 0;
let listeners: Array<() => void> = [];

const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
  const id = toastIdCounter++;
  toastQueue.push({ id, message, type, duration });
  listeners.forEach(listener => listener());
};

const removeToast = (id: number) => {
  toastQueue = toastQueue.filter(t => t.id !== id);
  listeners.forEach(listener => listener());
};

export const showToast = addToast;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const updateToasts = () => {
      setToasts([...toastQueue]);
    };
    listeners.push(updateToasts);
    return () => {
      listeners = listeners.filter(l => l !== updateToasts);
    };
  }, []);

  return (
    <>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
};


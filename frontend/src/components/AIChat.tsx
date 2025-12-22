
import React from 'react';
import { aiService } from '@/services/ai';

// Gemini entegrasyonu kaldırıldı; bileşen gizleniyor.
const AIChat: React.FC = () => {
  if (!aiService.isAvailable) return null;
  return null;
};

export default AIChat;

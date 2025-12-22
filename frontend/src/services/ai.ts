
export const aiService = {
  // Gemini entegrasyonu kaldırıldı, AI şu an devre dışı.
  isAvailable: false,
  createChatSession: () => {
    throw new Error('AI servisi devre dışı');
  }
};

import { useState, useEffect } from 'react';
import { Profile } from '../types';
import { db } from '../services/db';

/**
 * Age Gate Hook (Supabase Profile-based)
 * 
 * Manages +18 age verification state using Supabase profile
 * - Checks profile.is_adult_confirmed
 * - Saves confirmation to Supabase (persistent across devices)
 * - Only shows on Anime Detail page for truly adult content
 */
export function useAgeGate(
  isAdultContent: boolean,
  profile: Profile | null | undefined,
  userId: string | null | undefined,
  refreshProfile?: () => Promise<void>
) {
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    // If not adult content, no need to check
    if (!isAdultContent) {
      setIsChecking(false);
      setShowModal(false);
      return;
    }

    // If not logged in, don't show modal (optional: could show for guests too)
    if (!userId) {
      setIsChecking(false);
      setShowModal(false);
      return;
    }

    // Check profile for previous confirmation
    if (profile?.is_adult_confirmed === true) {
      setShowModal(false);
    } else {
      setShowModal(true);
    }
    
    setIsChecking(false);
  }, [isAdultContent, profile?.is_adult_confirmed, userId]);

  const confirm = async () => {
    if (!userId) {
      setShowModal(false);
      return;
    }

    setIsConfirming(true);
    
    try {
      // Save confirmation to Supabase profile
      await db.updateProfile(userId, { is_adult_confirmed: true });
      
      // CRITICAL: Refresh profile to get updated data from DB
      // This prevents profile state from being overwritten
      if (refreshProfile) {
        await refreshProfile();
      }
      
      setShowModal(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[useAgeGate] Failed to save confirmation:', error);
      }
      // Still allow access even if save fails
      setShowModal(false);
    } finally {
      setIsConfirming(false);
    }
  };

  const deny = () => {
    setShowModal(false);
    // Redirect to homepage
    window.location.href = '/#/';
  };

  return {
    showModal,
    isChecking,
    isConfirming,
    confirm,
    deny,
  };
}


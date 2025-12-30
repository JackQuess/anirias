import { useState, useEffect } from 'react';
import { Profile } from '../types';
import { db } from '../services/db';

/**
 * Age Gate Hook (localStorage + Supabase Profile-based)
 * 
 * Manages +18 age verification state:
 * - Checks localStorage first (anirias_age_verified)
 * - Falls back to Supabase profile.is_adult_confirmed
 * - Saves to both localStorage and Supabase
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

  // Check localStorage and profile for previous confirmation
  useEffect(() => {
    // If not adult content, no need to check
    if (!isAdultContent) {
      setIsChecking(false);
      setShowModal(false);
      return;
    }

    // Check localStorage first (fastest)
    const localStorageVerified = localStorage.getItem('anirias_age_verified') === 'true';
    
    // Check optional timestamp (30 days validity)
    const verifiedUntil = localStorage.getItem('anirias_age_verified_until');
    const isExpired = verifiedUntil ? Date.now() > parseInt(verifiedUntil, 10) : false;
    
    // If localStorage says verified and not expired, skip modal
    if (localStorageVerified && !isExpired) {
      setIsChecking(false);
      setShowModal(false);
      return;
    }

    // If logged in, also check Supabase profile
    if (userId && profile?.is_adult_confirmed === true) {
      // Sync localStorage with profile
      localStorage.setItem('anirias_age_verified', 'true');
      const thirtyDaysFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000);
      localStorage.setItem('anirias_age_verified_until', String(thirtyDaysFromNow));
      
      setIsChecking(false);
      setShowModal(false);
      return;
    }

    // Show modal if not verified
    setShowModal(true);
    setIsChecking(false);
  }, [isAdultContent, profile?.is_adult_confirmed, userId]);

  const confirm = async () => {
    setIsConfirming(true);
    
    try {
      // Save to localStorage (immediate)
      localStorage.setItem('anirias_age_verified', 'true');
      const thirtyDaysFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000);
      localStorage.setItem('anirias_age_verified_until', String(thirtyDaysFromNow));
      
      // Save to Supabase profile (if logged in)
      if (userId) {
        try {
          await db.updateProfile(userId, { is_adult_confirmed: true });
          
          // Refresh profile to get updated data
          if (refreshProfile) {
            await refreshProfile();
          }
        } catch (error) {
          // If Supabase save fails, still allow access (localStorage is enough)
          if (import.meta.env.DEV) {
            console.error('[useAgeGate] Failed to save to Supabase:', error);
          }
        }
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
    // Redirect to catalog/homepage
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

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'adult_confirmed';

/**
 * Age Gate Hook
 * 
 * Manages +18 age verification state
 * - Checks localStorage for previous confirmation
 * - Provides methods to confirm or deny
 */
export function useAgeGate(isAdultContent: boolean) {
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // If not adult content, no need to check
    if (!isAdultContent) {
      setIsChecking(false);
      setShowModal(false);
      return;
    }

    // Check localStorage for previous confirmation
    const confirmed = localStorage.getItem(STORAGE_KEY);
    
    if (confirmed === 'true') {
      setShowModal(false);
    } else {
      setShowModal(true);
    }
    
    setIsChecking(false);
  }, [isAdultContent]);

  const confirm = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowModal(false);
  };

  const deny = () => {
    setShowModal(false);
    // Redirect to homepage
    window.location.href = '/#/';
  };

  return {
    showModal,
    isChecking,
    confirm,
    deny,
  };
}


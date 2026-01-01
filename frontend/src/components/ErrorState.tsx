import React, { useState, useRef } from 'react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

const MAX_RETRIES = 3;
const COOLDOWN_MS = 3000; // 3 seconds cooldown

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const lastRetryTime = useRef<number>(0);

  const handleRetry = () => {
    if (!onRetry) return;
    
    const now = Date.now();
    const timeSinceLastRetry = now - lastRetryTime.current;
    
    // Enforce cooldown
    if (timeSinceLastRetry < COOLDOWN_MS) {
      setIsOnCooldown(true);
      const remainingTime = Math.ceil((COOLDOWN_MS - timeSinceLastRetry) / 1000);
      setTimeout(() => setIsOnCooldown(false), COOLDOWN_MS - timeSinceLastRetry);
      return;
    }
    
    // Check retry limit
    if (retryCount >= MAX_RETRIES) {
      alert('Maximum retry limit reached. Please refresh the page or try again later.');
      return;
    }
    
    lastRetryTime.current = now;
    setRetryCount(prev => prev + 1);
    onRetry();
  };

  const isRetryDisabled = retryCount >= MAX_RETRIES || isOnCooldown;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-brand-surface border border-red-900/50 rounded-lg text-center my-4">
      <svg
        className="w-12 h-12 text-brand-red mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h3 className="text-xl font-bold text-white mb-2">Connection Issue</h3>
      <p className="text-gray-400 mb-2 max-w-md">{message}</p>
      {onRetry && (
        <>
          {retryCount > 0 && retryCount < MAX_RETRIES && (
            <p className="text-xs text-gray-500 mb-4">
              Retry attempt {retryCount}/{MAX_RETRIES}
            </p>
          )}
          <button
            onClick={handleRetry}
            disabled={isRetryDisabled}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              isRetryDisabled
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-brand-red hover:bg-brand-redHover text-white'
            }`}
          >
            {isOnCooldown ? 'Wait...' : retryCount >= MAX_RETRIES ? 'Max Retries Reached' : 'Try Again'}
          </button>
        </>
      )}
    </div>
  );
};

export default ErrorState;
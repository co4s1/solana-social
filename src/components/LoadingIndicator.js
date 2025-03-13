// src/components/LoadingIndicator.js
import { useState, useEffect } from 'react';

export default function LoadingIndicator({ message = "Loading...", showDots = true }) {
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);
    
    const elapsedInterval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    
    return () => {
      clearInterval(dotInterval);
      clearInterval(elapsedInterval);
    };
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="mb-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      
      <p className="text-lg">
        {message}{showDots ? dots : ''}
      </p>
      
      {elapsed > 5 && (
        <p className="text-sm text-gray-500 mt-2">
          This is taking longer than expected. Please be patient...
        </p>
      )}
      
      {elapsed > 15 && (
        <p className="text-sm text-gray-500 mt-2">
          Still working... You might need to check your connection or try again later.
        </p>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface RealTimeIndicatorProps {
  isConnected: boolean;
  lastUpdate?: Date;
}

export default function RealTimeIndicator({ isConnected, lastUpdate }: RealTimeIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastUpdate) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
      
      if (diffSeconds < 60) {
        setTimeAgo('Just now');
      } else if (diffSeconds < 3600) {
        setTimeAgo(`${Math.floor(diffSeconds / 60)}m ago`);
      } else {
        setTimeAgo(`${Math.floor(diffSeconds / 3600)}h ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className="flex items-center space-x-1">
        {isConnected ? (
          <Wifi className="w-3 h-3 text-green-400" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-400" />
        )}
        <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
      {lastUpdate && (
        <>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400">{timeAgo}</span>
        </>
      )}
    </div>
  );
}

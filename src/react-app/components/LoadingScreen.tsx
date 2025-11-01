import { Server } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="glass rounded-2xl p-12 flex flex-col items-center space-y-6">
        <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center animate-glow">
          <Server className="w-8 h-8 text-white" />
        </div>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">PteroCTRL</h1>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
        
        <div className="loading-dots">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </div>
  );
}

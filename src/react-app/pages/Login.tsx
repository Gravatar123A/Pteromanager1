import { useAuth } from '@getmocha/users-service/react';
import { Server, Shield, Zap, Activity } from 'lucide-react';

export default function Login() {
  const { redirectToLogin, isFetching } = useAuth();

  const features = [
    {
      icon: <Server className="w-6 h-6" />,
      title: "Server Management",
      description: "Control your Pterodactyl servers with a single click"
    },
    {
      icon: <Activity className="w-6 h-6" />,
      title: "Real-time Monitoring",
      description: "Live resource usage and performance metrics"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Automation",
      description: "Schedule tasks and automate server operations"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Security",
      description: "Secure access with Google OAuth authentication"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Left Side - Hero */}
      <div className="flex-1 flex flex-col justify-center px-12 lg:px-16">
        <div className="max-w-lg">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center animate-glow">
              <Server className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">PteroCTRL</h1>
              <p className="text-gray-400">Pterodactyl Management Dashboard</p>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-6">
            Manage your game servers with <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">style</span>
          </h2>
          
          <p className="text-lg text-gray-300 mb-8">
            A modern, beautiful dashboard for managing your Pterodactyl panel servers. 
            Monitor resources, control servers, and automate tasks with ease.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {features.map((feature, index) => (
              <div key={index} className="glass rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                    <p className="text-gray-400 text-xs">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Right Side - Login */}
      <div className="flex-1 flex items-center justify-center px-12">
        <div className="glass-dark rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">Welcome Back</h3>
            <p className="text-gray-400">Sign in to access your dashboard</p>
          </div>
          
          <button
            onClick={redirectToLogin}
            disabled={isFetching}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetching ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

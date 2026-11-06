import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ErrorFallback = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-brand-dark via-brand-dark-secondary to-brand-muted' : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200'} animate-gradient`}>
      <div className="max-w-6xl mx-auto p-6">
        <div className={`${isDarkMode ? 'bg-brand-dark-secondary/80' : 'bg-white/80'} backdrop-blur-sm border ${isDarkMode ? 'border-brand/20' : 'border-gray-200'} rounded-xl p-6 flex items-start gap-4 shadow-lg ${isDarkMode ? 'shadow-brand/5' : 'shadow-gray-200'}`}>
          <div className={`p-2 ${isDarkMode ? 'bg-brand/10' : 'bg-brand-light'} rounded-lg`}>
            <AlertTriangle className={isDarkMode ? "text-brand-link" : "text-gray-800"} size={24} />
          </div>
          <div>
            <h3 className={`${isDarkMode ? 'text-brand-link' : 'text-gray-800'} font-medium text-lg`}>Error</h3>
            <p className={`${isDarkMode ? 'text-white/80' : 'text-gray-600'} mt-2`}>We're having trouble loading the leads. Please try again later.</p>
            <button
              onClick={() => window.location.reload()}
              className={`mt-4 px-4 py-2 ${isDarkMode ? 'bg-brand text-white hover:bg-brand-hover' : 'bg-brand text-white hover:bg-brand-hover'} rounded-lg transition-all duration-300 hover:scale-105 font-medium shadow-lg ${isDarkMode ? 'shadow-brand/20' : ''} cursor-pointer`}
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback; 
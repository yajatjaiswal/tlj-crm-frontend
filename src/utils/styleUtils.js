// src/utils/styleUtils.js
export const getTableStyles = (isDarkMode) => ({
    container: `min-h-screen ${
      isDarkMode
        ? "bg-gradient-to-br from-brand-dark via-brand-dark-secondary to-brand-muted"
        : "bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200"
    } animate-gradient`,
    
    table: `${
      isDarkMode ? "bg-brand-dark-secondary/80" : "bg-white/80"
    } backdrop-blur-sm rounded-xl border ${
      isDarkMode ? "border-brand/20" : "border-gray-200"
    } shadow-lg`,
  
    button: {
      primary: `px-4 py-2 ${
        isDarkMode
          ? "bg-brand text-white hover:bg-brand-hover"
          : "bg-brand text-white hover:bg-brand-hover"
      } rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`,
      
      secondary: `px-4 py-2 ${
        isDarkMode
          ? "bg-brand-dark/50 text-white hover:bg-brand-dark"
          : "bg-brand-dark text-white hover:bg-brand-dark-secondary"
      } rounded-xl transition-all duration-300 hover:scale-105`
    }
  });

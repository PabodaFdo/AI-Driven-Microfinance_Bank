import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage for saved theme
    const savedTheme = localStorage.getItem('microfinance-theme');
    return savedTheme && (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('microfinance-theme', newTheme);
  };

  useEffect(() => {
    // Apply theme to document root for CSS variables
    document.documentElement.setAttribute('data-theme', theme);

    // Also add a theme class to body for legacy support if needed
    document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` theme-${theme}`;
  }, [theme]);

  const value = {
    theme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
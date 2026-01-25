import React, { createContext, useContext, useState, useCallback } from 'react';

const NavigationContext = createContext({
  loadingItem: null,
  setLoadingItem: () => {},
  clearLoadingItem: () => {},
});

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [loadingItem, setLoadingItemState] = useState(null);

  const setLoadingItem = useCallback((item) => {
    setLoadingItemState(item);
  }, []);

  const clearLoadingItem = useCallback(() => {
    setLoadingItemState(null);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        loadingItem,
        setLoadingItem,
        clearLoadingItem,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

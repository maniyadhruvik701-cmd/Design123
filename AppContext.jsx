import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState({ isLoggedIn: false, email: '' });
  const [designs, setDesigns] = useState([]);

  const login = (email) => {
    setUser({ isLoggedIn: true, email });
  };

  const logout = () => {
    setUser({ isLoggedIn: false, email: '' });
  };

  const addDesign = (design) => {
    setDesigns([...designs, { ...design, id: Date.now().toString(), status: 'pending' }]);
  };

  const markCompleted = (id) => {
    setDesigns(designs.map(d => d.id === id ? { ...d, status: 'completed' } : d));
  };

  const setDesignStockStatus = (id, stockStatus) => {
    setDesigns(designs.map(d => {
      if (d.id === id) {
        const updated = { ...d };
        if (!stockStatus || stockStatus === 'none') {
          delete updated.stockStatus;
        } else {
          updated.stockStatus = stockStatus;
        }
        return updated;
      }
      return d;
    }));
  };

  return (
    <AppContext.Provider value={{ user, login, logout, designs, addDesign, markCompleted, setDesignStockStatus }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(AppContext);
};

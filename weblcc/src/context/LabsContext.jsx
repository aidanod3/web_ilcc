import { createContext, useContext, useState } from 'react';

const LabsContext = createContext(null);

export function LabsProvider({ children }) {
  const [labs, setLabs] = useState([]);

  function addLab(lab) {
    const id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `lab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setLabs((prev) => [...prev, { ...lab, id }]);
  }

  function updateLab(id, updates) {
    setLabs((prev) =>
      prev.map((lab) => (lab.id === id ? { ...lab, ...updates } : lab))
    );
  }

  return (
    <LabsContext.Provider value={{ labs, addLab, updateLab }}>
      {children}
    </LabsContext.Provider>
  );
}

export function useLabs() {
  const ctx = useContext(LabsContext);
  if (!ctx) throw new Error('useLabs must be used within LabsProvider');
  return ctx;
}

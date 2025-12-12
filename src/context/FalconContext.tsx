import React, { createContext, useContext } from 'react';
import { FalconContextValue } from '../types';

export const FalconContext = createContext<FalconContextValue | null>(null);

export const useFalconContext = () => {
  const context = useContext(FalconContext);
  if (!context) {
    throw new Error('useFalcon must be used within a FalconProvider');
  }
  return context;
};


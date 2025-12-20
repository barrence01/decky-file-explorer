import React, { createContext, useContext, ReactNode } from 'react';
import { serverAPI, ServerAPIService } from '../utils/ServerAPI';

interface ServerAPIContextType {
  api: ServerAPIService;
}

const ServerAPIContext = createContext<ServerAPIContextType | undefined>(undefined);

interface ServerAPIProviderProps {
  children: ReactNode;
}

export const ServerAPIProvider: React.FC<ServerAPIProviderProps> = ({ children }) => {
  return (
    <ServerAPIContext.Provider value={{ api: serverAPI }}>
      {children}
    </ServerAPIContext.Provider>
  );
};

export const useServerAPI = (): ServerAPIService => {
  const context = useContext(ServerAPIContext);
  if (context === undefined) {
    throw new Error('useServerAPI must be used within a ServerAPIProvider');
  }
  return context.api;
};
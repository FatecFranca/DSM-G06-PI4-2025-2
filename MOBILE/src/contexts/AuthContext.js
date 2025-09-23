import React, { createContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Carrega tokens do armazenamento seguro quando o app abre
  useEffect(() => {
    async function carregarTokens() {
      const savedAccess = await SecureStore.getItemAsync("accessToken");
      const savedRefresh = await SecureStore.getItemAsync("refreshToken");

      if (savedAccess) setAccessToken(savedAccess);
      if (savedRefresh) setRefreshToken(savedRefresh);
    }
    carregarTokens();
  }, []);

  // Salvar tokens
  const salvarTokens = async (access, refresh) => {
    if (access) {
      await SecureStore.setItemAsync("accessToken", access);
      setAccessToken(access);
    }
    if (refresh) {
      await SecureStore.setItemAsync("refreshToken", refresh);
      setRefreshToken(refresh);
    }
  };

  // Remover tokens (logout)
  const limparTokens = async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    setAccessToken(null);
    setRefreshToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ accessToken, refreshToken, salvarTokens, limparTokens }}
    >
      {children}
    </AuthContext.Provider>
  );
}

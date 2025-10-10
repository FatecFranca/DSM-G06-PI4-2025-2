'use client';

import { useState, useEffect, useContext, createContext } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const login = async (email, senha, tipoLogin = 'App') => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ UsuarioEmail: email, UsuarioSenha: senha, TipoLogin: tipoLogin })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Erro ao fazer login');
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('usuarioEmail', email);

    // Atualiza o estado do contexto imediatamente
    setUser({ token: data.accessToken, email });

    return data;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuarioEmail');
    setUser(null);
    router.push('/login');
  };

  const authFetch = async (url, options = {}) => {
    let token = localStorage.getItem('accessToken');

    const config = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : undefined,
        'Content-Type': 'application/json'
      }
    };

    let response = await fetch(url, config);

    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/token/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: refreshToken })
          });

          const refreshData = await refreshRes.json();

          if (refreshRes.ok) {
            localStorage.setItem('accessToken', refreshData.accessToken);
            const newConfig = {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${refreshData.accessToken}`,
                'Content-Type': 'application/json'
              }
            };
            response = await fetch(url, newConfig);
          } else {
            logout();
          }
        } catch (e) {
          logout();
        }
      } else {
        logout();
      }
    }

    return response;
  };

  // Função para sincronizar o estado do contexto com o localStorage
  const syncUserFromStorage = () => {
    const token = localStorage.getItem('accessToken');
    const email = localStorage.getItem('usuarioEmail');
    if (token && email) {
      setUser({ token, email });
    } else {
      setUser(null);
    }
  };

  // O useEffect inicial carrega o estado uma vez na montagem
  useEffect(() => {
    syncUserFromStorage();
    setLoading(false); // Indica que o estado inicial foi carregado
  }, []);

  // O contexto agora também fornece a função syncUserFromStorage
  // Isso permite que o LoginPage force uma atualização do estado após login
  return (
    <AuthContext.Provider value={{ user, login, logout, loading, authFetch, syncUserFromStorage }}>
      {children}
    </AuthContext.Provider>
  );
}
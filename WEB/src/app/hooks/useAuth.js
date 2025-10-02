// 'use client';

// import { useState, useEffect, useContext, createContext } from 'react';
// import { useRouter } from 'next/navigation';

// const AuthContext = createContext();

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

//   // Verifica se há tokens válidos ao carregar
//   useEffect(() => {
//     const initAuth = async () => {
//       const token = localStorage.getItem('accessToken');
//       if (token) {
//         try {
//           // Verifica se o token ainda é válido
//           const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/token/validar`, {
//             headers: { Authorization: `Bearer ${token}` }
//           });
//           if (res.ok) {
//             setUser({ token });
//           } else {
//             // Token inválido → limpa e redireciona
//             logout();
//           }
//         } catch (error) {
//           console.error('Erro ao validar token:', error);
//           logout();
//         }
//       }
//       setLoading(false);
//     };

//     initAuth();
//   }, []);

//   // Função para fazer login
//   const login = async (email, senha, tipoLogin = 'App') => {
//     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ UsuarioEmail: email, UsuarioSenha: senha, TipoLogin: tipoLogin })
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       throw new Error(data.error || 'Erro ao fazer login');
//     }

//     // Salva tokens
//     localStorage.setItem('accessToken', data.accessToken);
//     localStorage.setItem('refreshToken', data.refreshToken);
//     localStorage.setItem('usuarioEmail', email);
//     setUser({ token: data.accessToken });

//     return data;
//   };

//   // Função para fazer logout
//   const logout = () => {
//     localStorage.removeItem('accessToken');
//     localStorage.removeItem('refreshToken');
//     localStorage.removeItem('usuarioEmail');
//     setUser(null);
//     router.push('/login');
//   };

//   // Função para renovar token
//   const refreshAccessToken = async () => {
//     const refreshToken = localStorage.getItem('refreshToken');
//     if (!refreshToken) {
//       logout();
//       return null;
//     }

//     try {
//       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/token/refresh`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ token: refreshToken })
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         logout();
//         throw new Error(data.error || 'Erro ao renovar token');
//       }

//       localStorage.setItem('accessToken', data.accessToken);
//       setUser({ token: data.accessToken });
//       return data.accessToken;
//     } catch (error) {
//       logout();
//       throw error;
//     }
//   };

//   // Função para fazer requisições autenticadas
//   const authFetch = async (url, options = {}) => {
//     let token = localStorage.getItem('accessToken');

//     // Adiciona o token ao cabeçalho
//     const config = {
//       ...options,
//       headers: {
//         ...options.headers,
//         Authorization: token ? `Bearer ${token}` : undefined,
//         'Content-Type': 'application/json'
//       }
//     };

//     let response = await fetch(url, config);

//     // Se token expirou (401), tenta renovar
//     if (response.status === 401) {
//       try {
//         const newToken = await refreshAccessToken();
//         if (newToken) {
//           // Repete a requisição com o novo token
//           const newConfig = {
//             ...options,
//             headers: {
//               ...options.headers,
//               Authorization: `Bearer ${newToken}`,
//               'Content-Type': 'application/json'
//             }
//           };
//           response = await fetch(url, newConfig);
//         }
//       } catch (error) {
//         logout();
//         throw error;
//       }
//     }

//     return response;
//   };

//   return (
//     <AuthContext.Provider value={{ user, login, logout, loading, authFetch }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

"use client";

import { useState, useEffect, useContext, createContext } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✅ 1. login — definida antes do return
  const login = async (email, senha, tipoLogin = "App") => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/usuarios/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          UsuarioEmail: email,
          UsuarioSenha: senha,
          TipoLogin: tipoLogin,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao fazer login");
    }

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("usuarioEmail", email);
    setUser({ token: data.accessToken });

    return data;
  };

  // ✅ 2. logout — definida antes do return
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("usuarioEmail");
    setUser(null);
    router.push("/login");
  };

  // ✅ 3. authFetch — definida antes do return
  const authFetch = async (url, options = {}) => {
    // const token = localStorage.getItem("accessToken");
    let token = localStorage.getItem("accessToken");
    console.log(" Chamando:", url);
    console.log(" Com token:", !!token);

    const config = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "application/json",
      },
    };

    let response = await fetch(url, config);

    if (response.status === 401) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const refreshRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/token/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: refreshToken }),
            }
          );

          const refreshData = await refreshRes.json();

          if (refreshRes.ok) {
            localStorage.setItem("accessToken", refreshData.accessToken);
            const newConfig = {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${refreshData.accessToken}`,
                "Content-Type": "application/json",
              },
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

  // ✅ 4. useEffect — pode vir depois das funções
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/token/validar`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) {
            setUser({ token });
          } else {
            throw new Error("Token inválido");
          }
        })
        .catch(() => {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("usuarioEmail");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // ✅ 5. Agora todas as funções estão definidas!
  return (
    <AuthContext.Provider value={{ user, login, logout, loading, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

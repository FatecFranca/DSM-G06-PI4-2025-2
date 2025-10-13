// src/app/profile/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth"; // Certifique-se do caminho correto
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header"; // Se estiver usando

export default function ProfilePage() {
  const router = useRouter();
  const { authFetch, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError("");

        // --- CHAMADA PARA A API PARA OBTER OS DADOS ---
        // Esta é a rota correta conforme sua API: GET /usuarios/id/
        const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios/id/`);

        if (!res.ok) {
          const errorData = await res.json();
          // Se for 401, o authFetch já deve ter chamado logout
          throw new Error(errorData.error || `Erro ${res.status} ao carregar perfil.`);
        }

        const data = await res.json();
        console.log("Dados do usuário carregados:", data); // Log para debug
        setUserData(data.usuario); // A API retorna { usuario: {...}, ok: true }

      } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
        setError(`Falha ao carregar perfil: ${err.message}`);
        // O ProtectedRoute e authFetch devem lidar com logout se necessário
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authFetch]); // authFetch é uma dependência estável

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando perfil...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-red-500 p-4 text-center">
            <p>{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Voltar para Login
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-8 bg-gray-50 text-black">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Meu Perfil</h2>

          {userData ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Informações Pessoais</h3>
                <ul className="mt-2 space-y-2">
                  <li><strong>Nome:</strong> {userData.UsuarioNome}</li>
                  <li><strong>E-mail:</strong> {userData.UsuarioEmail}</li>
                  <li><strong>Data de Nascimento:</strong> {userData.UsuarioDtNascimento ? new Date(userData.UsuarioDtNascimento).toLocaleDateString('pt-BR') : '-'}</li>
                  <li><strong>Sexo:</strong> {userData.UsuarioSexo || '-'}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Dados Físicos</h3>
                <ul className="mt-2 space-y-2">
                  <li><strong>Peso:</strong> {userData.UsuarioPeso ? `${userData.UsuarioPeso} kg` : '-'}</li>
                  <li><strong>Altura:</strong> {userData.UsuarioAltura ? `${userData.UsuarioAltura} m` : '-'}</li>
                  <li><strong>Peso Máximo Permitido:</strong> {userData.UsuarioPesoMaximoPorcentagem ? `${userData.UsuarioPesoMaximoPorcentagem}% do seu peso` : '-'}</li>
                </ul>
              </div>

              {/* Se quiser mostrar a foto */}
              {/* {userData.UsuarioFoto && (
                <div>
                  <h3 className="text-lg font-semibold">Foto de Perfil</h3>
                  <img src={userData.UsuarioFoto} alt="Foto de Perfil" className="mt-2 w-24 h-24 object-cover rounded-full" />
                </div>
              )} */}

              <div className="pt-4 mt-6 border-t border-gray-200">
                <button
                  onClick={logout}
                  className="w-full py-2 px-4 bg-red-500 text-white font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Sair da Conta
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center">Nenhum dado de usuário disponível.</p>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
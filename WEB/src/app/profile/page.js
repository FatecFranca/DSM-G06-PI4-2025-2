"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth"; 
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";

export default function ProfilePage() {
  const [loggingOut, setLoggingOut] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // O hook useAuth já lida com a limpeza do localStorage e redirecionamento
      await logout();
      // O redirecionamento para /login já é feito dentro da função logout do hook
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
      alert("Erro ao fazer logout. Tente novamente.");
      setLoggingOut(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen p-8 text-black bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-6">Sair da Conta</h2>
          <p className="mb-6 text-gray-600">
            Clique no botão abaixo para encerrar sua sessão.
          </p>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`w-full py-3 px-4 rounded-lg font-medium ${
              loggingOut
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-400 text-white hover:bg-red-500"
            }`}
          >
            {loggingOut ? "Saindo..." : "Sair"}
          </button>
        </div>
      </main>
    </ProtectedRoute>
  );
}
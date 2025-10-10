"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const { authFetch } = useAuth();

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/alertas/usuario/`); // Supondo que a API retorne os alertas do usuário logado
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Resposta não é JSON. Status:", res.status);
        setAlerts([]);
        return;
      }
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar alertas:", err);
      setError("Erro ao carregar alertas.");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/alertas/${alertId}`, {
        method: "PUT",
        body: JSON.stringify({ AlertaStatus: "Lido" }),
      });
      if (res.ok) {
        setAlerts(alerts.map(a => a.AlertaId === alertId ? { ...a, AlertaStatus: "Lido" } : a));
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao atualizar alerta.");
      }
    } catch (err) {
      console.error("Erro ao marcar alerta como lido:", err);
      alert("Erro de conexão.");
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando alertas...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <ProtectedRoute>
        <Header/>
      <main className="min-h-screen p-8 text-black bg-gray-50">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6">Alertas de Peso</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-500">Nenhum alerta encontrado.</p>
          ) : (
            <ul className="space-y-4">
              {alerts.map((alert) => (
                <li
                  key={alert.AlertaId}
                  className={`p-4 rounded-lg border cursor-pointer ${
                    alert.AlertaStatus === "Lido"
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{alert.AlertaTitulo}</h3>
                      <p className="text-sm text-gray-600">{alert.AlertaDescricao}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(alert.AlertaData).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      {alert.AlertaStatus !== "Lido" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(alert.AlertaId);
                          }}
                          className="bg-blue-400 text-white px-3 py-1 rounded text-sm"
                        >
                          Marcar como lido
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Modal de detalhes do alerta */}
        {selectedAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-2">{selectedAlert.AlertaTitulo}</h3>
              <p className="mb-4">{selectedAlert.AlertaDescricao}</p>
              <p className="text-sm text-gray-500">
                Data: {new Date(selectedAlert.AlertaData).toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-gray-500">
                Nível: {selectedAlert.AlertaNivel}
              </p>
              <p className="text-sm text-gray-500">
                Status: {selectedAlert.AlertaStatus}
              </p>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
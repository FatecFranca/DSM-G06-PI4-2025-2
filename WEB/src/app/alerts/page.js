'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Aqui você pode adicionar a lógica para carregar os alertas
    // Por exemplo, fazer uma chamada à API
  }, []);

  return (
    <main className="flex min-h-screen flex-col p-8">
      <h1 className="text-3xl font-bold mb-6">Alertas</h1>
      <div className="grid gap-4">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div key={alert.id} className="p-4 border rounded-lg shadow-sm">
              {/* Conteúdo do alerta */}
            </div>
          ))
        ) : (
          <p className="text-gray-500">Nenhum alerta encontrado.</p>
        )}
      </div>
    </main>
  );
}


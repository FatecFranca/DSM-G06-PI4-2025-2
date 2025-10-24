// // src/app/alerts/page.js
// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { useAuth } from "@/app/hooks/useAuth";
// import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
// import Header from "@/components/Header/Header";

// export default function AlertsPage() {
//   const router = useRouter();
//   const { authFetch } = useAuth();
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [alertas, setAlertas] = useState([]);
//   const [statusSelecionado, setStatusSelecionado] = useState("Enviar"); // Status padrão

//   // --- 1. CARREGAR ALERTAS COM BASE NO STATUS SELECIONADO ---
//   const loadAlertas = async (status = statusSelecionado) => {
//     try {
//       setLoading(true);
//       setError("");

//       // --- CHAMADA PARA A API PARA OBTER OS ALERTAS DO USUÁRIO COM STATUS ESPECÍFICO ---
//       // Endpoint da sua API: GET /alertas/usuario/:status
//       const res = await authFetch(
//         `${process.env.NEXT_PUBLIC_API_URL}/alertas/usuario/${status}`
//       );
//       // --- FIM DA CHAMADA ---

//       const contentType = res.headers.get("content-type");
//       if (!contentType || !contentType.includes("application/json")) {
//         console.error("Resposta não é JSON. Status:", res.status);
//         setAlertas([]);
//         return;
//       }

//       const data = await res.json();
//       console.log("[AlertsPage] Dados brutos recebidos da API:", data); // Log para debug

//       // A API retorna um array de alertas diretamente
//       setAlertas(Array.isArray(data) ? data : []);
//     } catch (err) {
//       console.error("[AlertsPage] Erro ao carregar alertas:", err);
//       setError(err.message || "Erro desconhecido ao carregar alertas.");
//       setAlertas([]);
//     } finally {
//       setLoading(false);
//     }
//   };
//   // --- FIM DA FUNÇÃO DE CARREGAMENTO ---

//   // --- 2. CARREGAR ALERTAS AO MUDAR O STATUS OU AO MONTAR ---
//   useEffect(() => {
//     loadAlertas(statusSelecionado);
//   }, [statusSelecionado]); // Re-executa ao mudar o statusSelecionado
//   // --- FIM DO USEEFFECT ---

//   // --- 3. FUNÇÃO PARA MARCAR ALERTA COMO LIDO ---
//   const handleMarcarComoLido = async (alertaId) => {
//     try {
//       // Endpoint da sua API: PUT /alertas/:id
//       const res = await authFetch(
//         `${process.env.NEXT_PUBLIC_API_URL}/alertas/${alertaId}`,
//         {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ AlertaStatus: "Lido" }),
//         }
//       );

//       if (!res.ok) {
//         const errorData = await res.json();
//         throw new Error(errorData.error || `Erro ${res.status} ao atualizar alerta.`);
//       }

//       // Atualiza a lista local de alertas
//       setAlertas(prevAlertas =>
//         prevAlertas.map(a =>
//           a.AlertaId === alertaId ? { ...a, AlertaStatus: "Lido" } : a
//         )
//       );

//       // Ou recarrega a lista
//       // loadAlertas();
//     } catch (err) {
//       console.error("[AlertsPage] Erro ao marcar alerta como lido:", err);
//       alert(err.message || "Erro ao marcar alerta como lido.");
//     }
//   };
//   // --- FIM DA FUNÇÃO PARA MARCAR COMO LIDO ---

//   if (loading) {
//     return (
//       <ProtectedRoute>
//         <Header />
//         <div className="min-h-screen flex items-center justify-center bg-gray-50">
//           <p>Carregando alertas ({statusSelecionado})...</p>
//         </div>
//       </ProtectedRoute>
//     );
//   }

//   if (error) {
//     return (
//       <ProtectedRoute>
//         <Header />
//         <div className="min-h-screen flex items-center justify-center bg-gray-50">
//           <div className="text-red-500 p-4 text-center">
//             <p>Erro: {error}</p>
//             <button
//               onClick={() => router.push('/')}
//               className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//             >
//               Voltar para Início
//             </button>
//           </div>
//         </div>
//       </ProtectedRoute>
//     );
//   }

//   return (
//     <ProtectedRoute>
//       <Header />
//       <main className="min-h-screen p-8 bg-gray-50 text-black">
//         <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
//           <h2 className="text-2xl font-bold mb-2">Meus Alertas</h2>
//           <p className="text-gray-600 mb-6">
//             Status:{" "}
//             <select
//               value={statusSelecionado}
//               onChange={(e) => setStatusSelecionado(e.target.value)}
//               className="ml-2 p-1 border rounded"
//             >
//               <option value="Enviar">Enviar</option>
//               <option value="Enviado">Enviado</option>
//               <option value="Lido">Lido</option>
//             </select>
//           </p>

//           {alertas.length > 0 ? (
//             <div className="space-y-4">
//               {alertas.map((alerta) => (
//                 <div
//                   key={alerta.AlertaId}
//                   className={`p-4 rounded-lg border ${
//                     alerta.AlertaStatus === "Lido"
//                       ? "bg-green-50 border-green-200"
//                       : alerta.AlertaStatus === "Enviado"
//                       ? "bg-blue-50 border-blue-200"
//                       : "bg-yellow-50 border-yellow-200"
//                   }`}
//                 >
//                   <div className="flex justify-between items-start">
//                     <div>
//                       <h3 className="font-semibold">{alerta.AlertaTitulo}</h3>
//                       <p className="text-sm text-gray-600 mt-1">
//                         {alerta.AlertaDescricao}
//                       </p>
//                       <p className="text-xs text-gray-400 mt-2">
//                         {new Date(alerta.AlertaData).toLocaleString("pt-BR")}
//                       </p>
//                     </div>
//                     <div className="flex flex-col items-end gap-2">
//                       <span
//                         className={`text-xs px-2 py-1 rounded-full ${
//                           alerta.AlertaStatus === "Lido"
//                             ? "bg-green-100 text-green-800"
//                             : alerta.AlertaStatus === "Enviado"
//                             ? "bg-blue-100 text-blue-800"
//                             : "bg-yellow-100 text-yellow-800"
//                         }`}
//                       >
//                         {alerta.AlertaStatus}
//                       </span>
//                       {alerta.AlertaStatus === "Enviar" && (
//                         <button
//                           onClick={() => handleMarcarComoLido(alerta.AlertaId)}
//                           className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
//                         >
//                           Marcar como Lido
//                         </button>
//                       )}
//                       {alerta.AlertaStatus === "Enviado" && (
//                         <button
//                           onClick={() => handleMarcarComoLido(alerta.AlertaId)}
//                           className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
//                         >
//                           Marcar como Lido
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <p className="text-gray-500 text-center">
//               Nenhum alerta encontrado com status "{statusSelecionado}".
//             </p>
//           )}
//         </div>
//       </main>
//     </ProtectedRoute>
//   );
// }







"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";
import Card from "@/components/Card/Card"; 

export default function AlertsPage() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertas, setAlertas] = useState([]);
  const [statusSelecionado, setStatusSelecionado] = useState("Enviar");

  const loadAlertas = async (status = statusSelecionado) => {
    try {
      setLoading(true);
      setError("");

      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/alertas/usuario/${status}`
      );

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Resposta não é JSON. Status:", res.status);
        setAlertas([]);
        return;
      }

      const data = await res.json();
      console.log("[AlertsPage] Dados brutos recebidos da API:", data);
      setAlertas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[AlertsPage] Erro ao carregar alertas:", err);
      setError(err.message || "Falha ao carregar a lista de alertas.");
      setAlertas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlertas(statusSelecionado);
  }, [statusSelecionado]);

  const handleMarcarComoLido = async (alertaId) => {
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/alertas/${alertaId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ AlertaStatus: "Lido" }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Erro ${res.status} ao atualizar alerta.`);
      }

      setAlertas(prevAlertas =>
        prevAlertas.map(a =>
          a.AlertaId === alertaId ? { ...a, AlertaStatus: "Lido" } : a
        )
      );
    } catch (err) {
      console.error("[AlertsPage] Erro ao marcar alerta como lido:", err);
      alert(err.message || "Erro ao marcar alerta como lido.");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando alertas...</p>
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
            <p>Erro: {error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Voltar para Início
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
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Meus Alertas</h2>
          <p className="text-gray-600 mb-6">
            Status:{" "}
            <select
              value={statusSelecionado}
              onChange={(e) => setStatusSelecionado(e.target.value)}
              className="ml-2 p-1 border rounded"
            >
              <option value="Enviar">Enviar</option>
              <option value="Enviado">Enviado</option>
              <option value="Lido">Lido</option>
            </select>
          </p>

          {alertas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {alertas.map((alerta) => (
                <Card
                  key={alerta.AlertaId}
                  title={alerta.AlertaTitulo}
                  description={alerta.AlertaDescricao}
                  extra={
                    <div className="mt-3 flex flex-col items-center">
                      <p className="text-xs text-gray-500 mb-2">
                        {new Date(alerta.AlertaData).toLocaleString("pt-BR")}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          alerta.AlertaStatus === "Lido"
                            ? "bg-green-100 text-green-800"
                            : alerta.AlertaStatus === "Enviado"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {alerta.AlertaStatus}
                      </span>
                      {alerta.AlertaStatus !== "Lido" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarcarComoLido(alerta.AlertaId);
                          }}
                          className="mt-3 text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                        >
                          Marcar como Lido
                        </button>
                      )}
                    </div>
                  }
                >
                  {/* Se quiser adicionar conteúdo adicional dentro do Card, pode colocar aqui como children */}
                  {/* Por exemplo, um botão para ver detalhes */}
                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/alerts/${alerta.AlertaId}`);
                      }}
                      className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">
              Nenhum alerta encontrado com status "{statusSelecionado}".
            </p>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mochilas, setMochilas] = useState([]);
  const [selectedMochila, setSelectedMochila] = useState("");
  const [reportType, setReportType] = useState("semanal");
  const [reportData, setReportData] = useState([]);
  const [params, setParams] = useState({ mes: "", ano: "", data: "", inicio: "", fim: "" });
  const { authFetch } = useAuth();

  // Carregar mochilas do usuário
  const loadMochilas = async () => {
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarios-mochilas/usuario`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Resposta não é JSON. Status:", res.status);
        setMochilas([]);
        return;
      }
      const data = await res.json();
      setMochilas(Array.isArray(data.mochilas) ? data.mochilas : []);
    } catch (err) {
      console.error("Erro ao carregar mochilas:", err);
      setError("Erro ao carregar mochilas.");
    } finally {
      setLoading(false);
    }
  };

  // Carregar relatório
  const loadReport = async () => {
    if (!selectedMochila) {
      alert("Selecione uma mochila.");
      return;
    }
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/medicoes/relatorio/`;
      if (reportType === "semanal") {
        url += `semanal/${selectedMochila}`;
      } else if (reportType === "mensal") {
        if (!params.ano || !params.mes) {
          alert("Preencha ano e mês.");
          return;
        }
        url += `mensal/${selectedMochila}/${params.ano}/${params.mes}`;
      } else if (reportType === "anual") {
        if (!params.ano) {
          alert("Preencha o ano.");
          return;
        }
        url += `anual/${selectedMochila}/${params.ano}`;
      } else if (reportType === "dia") {
        if (!params.data) {
          alert("Preencha a data.");
          return;
        }
        url += `dia/${selectedMochila}/${params.data}`;
      } else if (reportType === "periodo") {
        if (!params.inicio || !params.fim) {
          alert("Preencha as datas de início e fim.");
          return;
        }
        url += `periodo/${selectedMochila}/${params.inicio}/${params.fim}`;
      }

      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportData(Array.isArray(data) ? data : []);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Erro ao carregar relatório.");
      }
    } catch (err) {
      console.error("Erro ao carregar relatório:", err);
      alert("Erro de conexão.");
    }
  };

  useEffect(() => {
    loadMochilas();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-8 text-black bg-gray-50">
        <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6">Relatórios de Peso</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Mochila</label>
              <select
                value={selectedMochila}
                onChange={(e) => setSelectedMochila(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Selecione uma mochila</option>
                {mochilas.map((m) => (
                  <option key={m.MochilaCodigo} value={m.MochilaCodigo}>
                    {m.MochilaNome || m.MochilaDescricao} ({m.MochilaCodigo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Relatório</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="semanal">Últimos 7 dias</option>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
                <option value="dia">Diário</option>
                <option value="periodo">Por Período</option>
              </select>
            </div>

            {reportType === "mensal" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mês (01-12)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={params.mes}
                    onChange={(e) => setParams({ ...params, mes: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ano (YYYY)</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={params.ano}
                    onChange={(e) => setParams({ ...params, ano: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            )}

            {reportType === "anual" && (
              <div>
                <label className="block text-sm font-medium mb-1">Ano (YYYY)</label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={params.ano}
                  onChange={(e) => setParams({ ...params, ano: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            )}

            {reportType === "dia" && (
              <div>
                <label className="block text-sm font-medium mb-1">Data (AAAA-MM-DD)</label>
                <input
                  type="date"
                  value={params.data}
                  onChange={(e) => setParams({ ...params, data: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            )}

            {reportType === "periodo" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data Início (AAAA-MM-DD)</label>
                  <input
                    type="date"
                    value={params.inicio}
                    onChange={(e) => setParams({ ...params, inicio: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data Fim (AAAA-MM-DD)</label>
                  <input
                    type="date"
                    value={params.fim}
                    onChange={(e) => setParams({ ...params, fim: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={loadReport}
            className="bg-blue-400 text-white px-4 py-2 rounded mb-6"
          >
            Carregar Relatório
          </button>

          {reportData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Data</th>
                    <th className="border p-2">Peso (kg)</th>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Local</th>
                    <th className="border p-2">Peso Mais (kg)</th>
                    <th className="border p-2">Peso % Máx</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((medicao, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                      <td className="border p-2">
                        {new Date(medicao.MedicaoData).toLocaleString("pt-BR")}
                      </td>
                      <td className="border p-2">{medicao.MedicaoPeso}</td>
                      <td className="border p-2">{medicao.MedicaoStatus}</td>
                      <td className="border p-2">{medicao.MedicaoLocal}</td>
                      <td className="border p-2">{medicao.MedicaoPesoMais}</td>
                      <td className="border p-2">{medicao.MedicaoPesoMaximoPorcentagem?.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Nenhum dado encontrado.</p>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
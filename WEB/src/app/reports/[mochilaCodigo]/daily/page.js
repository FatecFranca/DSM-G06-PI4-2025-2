// src/app/reports/[mochilaCodigo]/Daily/page.js
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
// --- IMPORTAÇÃO ADICIONADA ---
import { useAuth } from "@/app/hooks/useAuth";
// --- FIM DA IMPORTAÇÃO ---
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";
import Chart from "@/components/Chart/Chart"; // Certifique-se do caminho correto

export default function DailyReportPage({ params }) {
  const router = useRouter();

  const { authFetch } = useAuth();
  
  const today = new Date();
  const dataFormatada = today.toISOString().split('T')[0]; // 'YYYY-MM-DD'
  
  // Use React.use para resolver a Promise `params` (conforme o aviso anterior)
  const resolvedParams = React.use(params);
  const { mochilaCodigo } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]); // Dados para a tabela
  const [chartData, setChartData] = useState([]); // Dados para o gráfico

  useEffect(() => {
    const fetchDailyReport = async () => {
      try {
        setLoading(true);
        setError("");

        // --- CHAMADA PARA A API PARA OBTER O RELATÓRIO DIÁRIO ---
        // Endpoint da sua API: GET /medicoes/relatorio/:mochilaCodigo
        const res = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/medicoes/dia/${dataFormatada}/${mochilaCodigo}`
        );


        if (!res.ok) {
          // Tenta ler o erro como JSON
          let errorMessage = `Erro ${res.status}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Se não for JSON, pode ser HTML (erro 404/500 do servidor)
            console.error(
              "[DailyReportPage] Erro ao parsear JSON de erro da API:",
              e
            );
          }
          throw new Error(errorMessage);
        }

        const rawData = await res.json();
        console.log(
          "[DailyReportPage] Dados brutos recebidos da API:",
          rawData
        );

        // --- PROCESSAMENTO DOS DADOS ---
        let dadosParaGrafico = [];

        // Se rawData for um array (como os dados colados)
        if (Array.isArray(rawData)) {
          // Mapeia cada objeto do array para um novo objeto com os campos desejados
          dadosParaGrafico = rawData.map((medicao) => ({
            name: new Date(medicao.MedicaoData).toLocaleDateString("pt-BR"), // Converte a data para string legível
            peso: parseFloat(medicao.MedicaoPeso), // Converte string para número
            local: medicao.MedicaoLocal,
            status: medicao.MedicaoStatus,
          }));
        } else {
          // Caso fallback: se não for um array, tenta extrair de um objeto
          console.warn(
            "[WeeklyReportPage] Resposta da API não é um array. Tentando processar como objeto."
          );
          if (rawData && typeof rawData === "object") {
            // Exemplo: se a resposta for { esquerda: {...}, direita: {...} }
            for (const [key, medicao] of Object.entries(rawData)) {
              if (medicao && medicao.MedicaoData) {
                dadosParaGrafico.push({
                  name: key, // ou use new Date(medicao.MedicaoData).toLocaleDateString('pt-BR')
                  peso: parseFloat(medicao.MedicaoPeso),
                  local: medicao.MedicaoLocal,
                  status: medicao.MedicaoStatus,
                });
              }
            }
          }
        }

        setChartData(dadosParaGrafico);
      } catch (err) {
        console.error("[DailyReportPage] Erro ao carregar relatório:", err);
        setError(err.message || "Falha ao carregar o relatório semanal.");
        setChartData([]); // Limpa dados anteriores em caso de erro
        setReportData([]); // Limpa dados da tabela
      } finally {
        setLoading(false);
      }
    };

    fetchDailyReport();
  }, [authFetch, mochilaCodigo]); // Adicione authFetch às dependências

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando relatório semanal...</p>
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
              onClick={() => router.push(`/reports/${mochilaCodigo}`)} // Volta para as opções
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Voltar para Opções
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Header />
      <main className="min-h-screen p-6 bg-gray-50 text-gray-800">
        <div className="max-w-6xl mx-auto">
          {/* Cabeçalho com botão de voltar e título */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
              aria-label="Voltar"
            >
              <FiArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Relatório Semanal</h1>
              <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
            </div>
          </div>

          {/* Conteúdo do Relatório */}
          <div className="mt-8 space-y-8">
            {/* Gráfico */}
            <Chart dados={chartData} titulo="Dados do Relatório Semanal" />

            {/* Tabela de Dados (Exemplo - descomente e adapte conforme necessário) */}
            {/* 
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Dados Detalhados</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peso (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.length > 0 ? (
                      reportData.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.MedicaoData).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.MedicaoPeso}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.MedicaoLocal}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.MedicaoStatus}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                          Nenhum dado disponível.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            */}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute";
import Header from "@/components/Header/Header";
import Chart from "@/components/Chart/Chart";
import { useAuth } from "@/app/hooks/useAuth";

export default function MonthlyReportPage({ params }) {
  const router = useRouter();
  const { authFetch } = useAuth(); // Obtém authFetch do contexto de autenticação
  const resolvedParams = React.use(params);
  const { mochilaCodigo } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]); // Dados para a tabela
  const [chartData, setChartData] = useState([]); // Dados para o gráfico

  useEffect(() => {
    const fetchMonthlyReport = async () => {
      try {
        setLoading(true);
        setError("");

        // --- OBTENÇÃO DE ANO E MÊS ---
        const now = new Date();
        const ano = now.getFullYear();
        const mes = now.getMonth() + 1; // getMonth() retorna 0-11, então soma 1 para 1-12

        // --- CHAMADA PARA A API ---
        const res = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/medicoes/mensal/${ano}/${mes}/${mochilaCodigo}`
        );

        if (!res.ok) {
          let errorMessage = `Erro ${res.status} ao carregar relatório.`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error(
              "[MonthlyReportPage] Erro ao parsear JSON de erro da API:",
              e
            );
          }
          throw new Error(errorMessage);
        }

        const rawData = await res.json();
        console.log(
          "[MonthlyReportPage] Dados brutos recebidos da API:",
          rawData
        );

        console.log("[MonthlyReportPage] Estrutura dos dados brutos:", rawData);

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
          // Isso pode ser útil se a API retornar um único objeto em vez de um array
          console.warn(
            "[MonthlyReportPage] Resposta da API não é um array. Tentando processar como objeto."
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
        console.error("[MonthlyReportPage] Erro ao carregar relatório:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyReport();
  }, [authFetch, mochilaCodigo]); // Re-executa se authFetch ou mochilaCodigo mudarem

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando relatório mensal...</p>
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
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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
              <h1 className="text-2xl font-bold">Relatório Mensal</h1>
              <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
            </div>
          </div>

          {/* Conteúdo do Relatório */}
          <div className="mt-8 space-y-8">
            {/* Gráfico */}
            <Chart dados={chartData} titulo="Relatório Mensal" />

            {/* Tabela de Dados (Exemplo) */}
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
                    {reportData.map((item, index) => (
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
                    ))}
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

"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { useAuth } from "@/app/hooks/useAuth"; 
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoute"; 
import Header from "@/components/Header/Header"; 
import Chart from "@/components/Chart/Chart"; 
import StatCard from "@/components/StatCard/StatCard"; 

// --- FUNÇÃO AUXILIAR PARA ARREDONDAR PARA 2 CASAS DECIMAIS ---
function roundTo2(num) {
  return Math.round(num * 100) / 100;
}
// --- FIM DA FUNÇÃO AUXILIAR ---

export default function DailyReportPage({ params }) {
  const router = useRouter();
  const { authFetch } = useAuth();

  // Use React.use para resolver a Promise `params` (conforme o aviso anterior)
  const resolvedParams = React.use(params);
  const { mochilaCodigo } = resolvedParams;

  // --- Novo estado para controlar a data selecionada ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Data inicial: Hoje
  // --- Fim do novo estado ---

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]); // Dados para a tabela
  const [chartData, setChartData] = useState([]); // Dados para o gráfico
  // --- Estado para as estatísticas ---
  const [estatisticas, setEstatisticas] = useState(null);
  // --- Fim do estado para as estatísticas ---

  // --- FUNÇÃO PARA CALCULAR ESTATÍSTICAS ---
  const calcularEstatisticas = (valoresRaw) => {
    // 1. Filtrar valores válidos (números)
    const valores = valoresRaw
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));

    if (valores.length === 0) {
      return null; // Não há dados para calcular
    }

    const n = valores.length;
    const somatorio = valores.reduce((a, b) => a + b, 0);
    const media = somatorio / n;

    // 2. Mediana
    const sorted = [...valores].sort((a, b) => a - b);
    const mediana = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // 3. Moda (pode haver mais de uma)
    const freq = {};
    valores.forEach(v => {
      const key = roundTo2(v).toString(); // Agrupar por valor arredondado
      freq[key] = (freq[key] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(freq));
    const modaArray = Object.keys(freq)
      .filter(k => freq[k] === maxFreq)
      .map(k => parseFloat(k));

    // 4. Desvio Padrão (populacional)
    const variancia = valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / n;
    const desvioPadrao = Math.sqrt(variancia);

    // 5. Assimetria (Fisher-Pearson)
    // Para evitar divisão por zero
    const denomSkew = Math.pow(desvioPadrao, 3) || 1;
    const assimetria = (valores.reduce((a, b) => a + Math.pow(b - media, 3), 0) / n) / denomSkew;

    // 6. Curtose (Excesso de curtose: kurtosis - 3)
    const denomKurt = Math.pow(desvioPadrao, 4) || 1;
    const curtose = (valores.reduce((a, b) => a + Math.pow(b - media, 4), 0) / n) / denomKurt - 3;

    // 7. Probabilidades (ex: P(X > media))
    const acimaDaMedia = valores.filter(v => v > media).length;
    const probAcimaMedia = acimaDaMedia / n;

    // 8. Regressão Linear (Peso vs. Índice do Array)
    // y = a + bx
    const xVals = valores.map((_, i) => i); // índices 0, 1, 2, ...
    const yVals = valores; // pesos

    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = yVals.reduce((a, b) => a + b, 0);
    const sumXY = xVals.reduce((sum, xi, i) => sum + xi * yVals[i], 0);
    const sumXX = xVals.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      media: roundTo2(media),
      mediana: roundTo2(mediana),
      moda: modaArray.length ? modaArray.map(v => roundTo2(v)).join(", ") : "—",
      desvioPadrao: roundTo2(desvioPadrao),
      assimetria: roundTo2(assimetria),
      curtose: roundTo2(curtose),
      probAcimaMedia: roundTo2(probAcimaMedia * 100), // em %
      regressao: {
        slope: roundTo2(slope),
        intercept: roundTo2(intercept),
        equacao: `y = ${roundTo2(intercept)} + ${roundTo2(slope)}x`
      }
    };
  };
  // --- FIM DA FUNÇÃO PARA CALCULAR ESTATÍSTICAS ---

  // --- Função para carregar o relatório com base na data selecionada ---
  const loadReport = async (dataSelecionada) => {
    try {
      setLoading(true);
      setError("");
      setEstatisticas(null); // Limpa estatísticas anteriores
      setChartData([]);
      setReportData([]);

      // --- CHAMADA PARA A API PARA OBTER O RELATÓRIO DIÁRIO ---
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/medicoes/dia/${dataSelecionada}/${mochilaCodigo}`
      );

      if (!res.ok) {
        let errorMessage = `Erro ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("[DailyReportPage] Erro ao parsear JSON de erro da API:", e);
        }
        throw new Error(errorMessage);
      }

      const rawData = await res.json();
      console.log("[DailyReportPage] Dados brutos recebidos da API:", rawData);

      // --- PROCESSAMENTO DOS DADOS ---
      let dadosParaGrafico = [];
      let pesosParaEstatisticas = []; // Array de números para calcular estatísticas

      if (Array.isArray(rawData)) {
        dadosParaGrafico = rawData.map((medicao) => {
          const pesoNum = parseFloat(medicao.MedicaoPeso);
          pesosParaEstatisticas.push(pesoNum); // Adiciona ao array para estatísticas
          return {
            name: new Date(medicao.MedicaoData).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            peso: pesoNum,
            local: medicao.MedicaoLocal,
            status: medicao.MedicaoStatus
          };
        });
      } else {
        console.warn("[DailyReportPage] Resposta da API não é um array. Tentando processar como objeto.");
        if (rawData && typeof rawData === "object") {
          for (const [key, medicao] of Object.entries(rawData)) {
            if (medicao && medicao.MedicaoData) {
              const pesoNum = parseFloat(medicao.MedicaoPeso);
              pesosParaEstatisticas.push(pesoNum);
              dadosParaGrafico.push({
                name: key,
                peso: pesoNum,
                local: medicao.MedicaoLocal,
                status: medicao.MedicaoStatus
              });
            }
          }
        }
      }

      setChartData(dadosParaGrafico);
      setReportData(rawData); // Para uso futuro (tabela, etc.)

      // --- CALCULAR ESTATÍSTICAS ---
      const stats = calcularEstatisticas(pesosParaEstatisticas);
      setEstatisticas(stats);
      // --- FIM DO CÁLCULO DAS ESTATÍSTICAS ---

    } catch (err) {
      console.error("[DailyReportPage] Erro ao carregar relatório:", err);
      setError(err.message || "Falha ao carregar o relatório diário.");
      setChartData([]);
      setReportData([]);
      setEstatisticas(null);
    } finally {
      setLoading(false);
    }
  };
  // --- FIM DA FUNÇÃO loadReport ---

  // --- Carregar relatório ao montar o componente ou quando selectedDate/mochilaCodigo mudarem ---
  useEffect(() => {
    if (mochilaCodigo) { // Certifique-se de que o código da mochila está disponível
      loadReport(selectedDate);
    }
  }, [selectedDate, mochilaCodigo]); // Re-executa se a data ou o código da mochila mudarem
  // --- FIM DO useEffect ---

  // --- Manipulador para alterar a data ---
  const handleDateChange = (e) => {
    const novaData = e.target.value;
    setSelectedDate(novaData); // Atualiza o estado com a nova data
    // O useEffect acima cuidará de carregar os dados para a nova data
  };
  // --- FIM DO MANIPULADOR ---

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando relatório diário...</p>
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
      <main className="min-h-screen p-6 bg-gray-50 text-black flex flex-col">
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
              <h1 className="text-2xl font-bold">Relatório Diário</h1>
              <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
            </div>
          </div>

          {/* Input de Data */}
          <div className="mb-6 p-4 bg-gray rounded-lg shadow-md items-center">
            <label htmlFor="dataSelecionada" className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a Data
            </label>
            <input
              id="dataSelecionada"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-2xl p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* --- SEÇÃO DE ESTATÍSTICAS (Agora acima do gráfico) --- */}
          {estatisticas ? (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-semibold mb-4">Indicadores Estatísticos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatCard title="Média (kg)" value={estatisticas.media} />
                <StatCard title="Mediana (kg)" value={estatisticas.mediana} />
                <StatCard title="Moda (kg)" value={estatisticas.moda} />
                <StatCard title="Desvio Padrão (kg)" value={estatisticas.desvioPadrao} />
                <StatCard title="Assimetria" value={estatisticas.assimetria} />
                <StatCard title="Curtose" value={estatisticas.curtose} />
                <StatCard title="P(X > μ) (%)" value={`${estatisticas.probAcimaMedia}%`} />
                <StatCard title="Regressão Linear" value={estatisticas.regressao.equacao} />
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <p className="text-gray-500 text-center">Nenhuma medição disponível para cálculo estatístico.</p>
            </div>
          )}
          {/* --- FIM DA SEÇÃO DE ESTATÍSTICAS --- */}

          {/* Conteúdo do Relatório */}
          <div className="mt-8 space-y-8">
            {/* Gráfico */}
            <Chart dados={chartData} titulo={`Dados do Relatório Diário - ${new Date(selectedDate).toLocaleDateString('pt-BR')}`} />
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
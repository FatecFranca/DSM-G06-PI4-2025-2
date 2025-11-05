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

export default function WeeklyReportPage({ params }) {
  const router = useRouter();
  const { authFetch } = useAuth();

  // Use React.use para resolver a Promise `params`
  const resolvedParams = React.use(params);
  const { mochilaCodigo } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]); // Dados para a tabela (opcional)
  const [chartData, setChartData] = useState([]); // Dados para o gráfico
  // --- Estado para as estatísticas ---
  const [estatisticas, setEstatisticas] = useState(null);
  // --- Fim do estado para as estatísticas ---

  // --- Estados para controle da semana ---
  const [selectedWeekStart, setSelectedWeekStart] = useState(null); // Data do início da semana selecionada (segunda-feira)
  const [selectedWeekEnd, setSelectedWeekEnd] = useState(null);   // Data do fim da semana selecionada (domingo)
  // --- Fim dos estados para controle da semana ---

  // --- Função para calcular a data de início (segunda-feira) de uma semana a partir de uma data ---
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // ajusta para segunda-feira (DOMINGO = 0, SEGUNDA = 1, ..., SÁBADO = 6)
    return new Date(d.setDate(diff));
  };

  // --- Função para calcular a data de fim (domingo) de uma semana a partir de uma data ---
  const getEndOfWeek = (date) => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Adiciona 6 dias para chegar ao domingo
    return end;
  };

  // --- Função para formatar data como YYYY-MM-DD ---
  const formatDateISO = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };
  // --- Fim das funções auxiliares ---

  // --- Função para carregar o relatório da semana ---
  const loadReport = async (mochilaCodigo, inicio, fim) => {
    try {
      setLoading(true);
      setError("");
      setEstatisticas(null); // Limpa estatísticas anteriores

      // --- CONSTRUÇÃO DA URL CORRETA PARA O RELATÓRIO DE PERÍODO ---
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/medicoes/periodo/${inicio}/${fim}/${mochilaCodigo}`
      );
      // --- FIM DA CONSTRUÇÃO ---

      if (!res.ok) {
        let errorMessage = `Erro ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("[WeeklyReportPage] Erro ao parsear JSON de erro da API:", e);
        }
        throw new Error(errorMessage);
      }

      const rawData = await res.json();
      console.log("[WeeklyReportPage] Dados brutos recebidos da API:", rawData);

      // --- PROCESSAMENTO DOS DADOS ---
      let dadosParaGrafico = [];
      let pesosParaEstatisticas = [];

      if (Array.isArray(rawData)) {
        dadosParaGrafico = rawData.map((medicao) => {
          const pesoNum = parseFloat(medicao.MedicaoPeso);
          pesosParaEstatisticas.push(pesoNum);
          return {
            name: new Date(medicao.MedicaoData).toLocaleDateString("pt-BR"), // Ex: "21/10/2025"
            peso: pesoNum,
            local: medicao.MedicaoLocal,
            status: medicao.MedicaoStatus,
          };
        });
      } else {
        console.warn("[WeeklyReportPage] Resposta da API não é um array. Tentando processar como objeto.");
        if (rawData && typeof rawData === "object") {
          for (const [key, medicao] of Object.entries(rawData)) {
            if (medicao && medicao.MedicaoData) {
              const pesoNum = parseFloat(medicao.MedicaoPeso);
              pesosParaEstatisticas.push(pesoNum);
              dadosParaGrafico.push({
                name: key,
                peso: pesoNum,
                local: medicao.MedicaoLocal,
                status: medicao.MedicaoStatus,
              });
            }
          }
        }
      }

      setChartData(dadosParaGrafico);
      setReportData(rawData);

      // --- CALCULAR ESTATÍSTICAS ---
      const stats = calcularEstatisticas(pesosParaEstatisticas);
      setEstatisticas(stats);
      // --- FIM DO CÁLCULO DAS ESTATÍSTICAS ---

    } catch (err) {
      console.error("[WeeklyReportPage] Erro ao carregar relatório:", err);
      setError(err.message || "Falha ao carregar o relatório semanal.");
      setChartData([]);
      setReportData([]);
      setEstatisticas(null);
    } finally {
      setLoading(false);
    }
  };
  // --- FIM DA FUNÇÃO loadReport ---

  // --- Função para calcular estatísticas ---
  const calcularEstatisticas = (valoresRaw) => {
    const valores = valoresRaw
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));

    if (valores.length === 0) {
      return null;
    }

    const n = valores.length;
    const somatorio = valores.reduce((a, b) => a + b, 0);
    const media = somatorio / n;

    const sorted = [...valores].sort((a, b) => a - b);
    const mediana = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    const freq = {};
    valores.forEach(v => {
      const key = roundTo2(v).toString();
      freq[key] = (freq[key] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(freq));
    const modaArray = Object.keys(freq)
      .filter(k => freq[k] === maxFreq)
      .map(k => parseFloat(k));

    const variancia = valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / n;
    const desvioPadrao = Math.sqrt(variancia);

    const denomSkew = Math.pow(desvioPadrao, 3) || 1;
    const assimetria = (valores.reduce((a, b) => a + Math.pow(b - media, 3), 0) / n) / denomSkew;

    const denomKurt = Math.pow(desvioPadrao, 4) || 1;
    const curtose = (valores.reduce((a, b) => a + Math.pow(b - media, 4), 0) / n) / denomKurt - 3;

    const acimaDaMedia = valores.filter(v => v > media).length;
    const probAcimaMedia = acimaDaMedia / n;

    const xVals = valores.map((_, i) => i);
    const yVals = valores;

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

  // --- Carregar relatório da semana atual ao montar ---
  useEffect(() => {
    if (mochilaCodigo) {
      const hoje = new Date();
      const inicioSemana = getStartOfWeek(hoje);
      const fimSemana = getEndOfWeek(hoje);

      setSelectedWeekStart(inicioSemana);
      setSelectedWeekEnd(fimSemana);

      const inicioISO = formatDateISO(inicioSemana);
      const fimISO = formatDateISO(fimSemana);

      loadReport(mochilaCodigo, inicioISO, fimISO);
    }
  }, [mochilaCodigo]); // Re-executa se o código da mochila mudar

  // --- Manipulador para selecionar a semana anterior ---
  const handlePreviousWeek = () => {
    if (!selectedWeekStart) return;
    const novaDataInicio = new Date(selectedWeekStart);
    novaDataInicio.setDate(novaDataInicio.getDate() - 7);
    const novaDataFim = new Date(selectedWeekEnd);
    novaDataFim.setDate(novaDataFim.getDate() - 7);

    setSelectedWeekStart(novaDataInicio);
    setSelectedWeekEnd(novaDataFim);

    const inicioISO = formatDateISO(novaDataInicio);
    const fimISO = formatDateISO(novaDataFim);

    loadReport(mochilaCodigo, inicioISO, fimISO);
  };

  // --- Manipulador para selecionar a semana seguinte ---
  const handleNextWeek = () => {
    if (!selectedWeekStart) return;
    const novaDataInicio = new Date(selectedWeekStart);
    novaDataInicio.setDate(novaDataInicio.getDate() + 7);
    const novaDataFim = new Date(selectedWeekEnd);
    novaDataFim.setDate(novaDataFim.getDate() + 7);

    setSelectedWeekStart(novaDataInicio);
    setSelectedWeekEnd(novaDataFim);

    const inicioISO = formatDateISO(novaDataInicio);
    const fimISO = formatDateISO(novaDataFim);

    loadReport(mochilaCodigo, inicioISO, fimISO);
  };

  // --- Manipulador para selecionar a semana atual ---
  const handleCurrentWeek = () => {
    const hoje = new Date();
    const inicioSemana = getStartOfWeek(hoje);
    const fimSemana = getEndOfWeek(hoje);

    setSelectedWeekStart(inicioSemana);
    setSelectedWeekEnd(fimSemana);

    const inicioISO = formatDateISO(inicioSemana);
    const fimISO = formatDateISO(fimSemana);

    loadReport(mochilaCodigo, inicioISO, fimISO);
  };

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
              onClick={() => router.push(`/reports/${mochilaCodigo}`)}
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
              <h1 className="text-2xl font-bold">Relatório Semanal</h1>
              <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
              {/* Exibição da semana selecionada */}
              {selectedWeekStart && selectedWeekEnd && (
                <p className="text-sm text-gray-500">
                  Período: {selectedWeekStart.toLocaleDateString('pt-BR')} a {selectedWeekEnd.toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          {/* Controles da Semana */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md flex justify-between items-center">
            <button
              onClick={handlePreviousWeek}
              className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Semana Anterior
            </button>
            <button
              onClick={handleCurrentWeek}
              className="bg-green-400 hover:bg-green-500 text-white px-4 py-2 rounded-md"
            >
              Esta Semana
            </button>
            <button
              onClick={handleNextWeek}
              className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Próxima Semana
            </button>
          </div>

          {/* --- SEÇÃO DE ESTATÍSTICAS (Acima do gráfico) --- */}
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
            <Chart
              dados={chartData}
              titulo={`Dados do Relatório Semanal - ${selectedWeekStart ? selectedWeekStart.toLocaleDateString('pt-BR') : '...'} a ${selectedWeekEnd ? selectedWeekEnd.toLocaleDateString('pt-BR') : '...'}`}
            />
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
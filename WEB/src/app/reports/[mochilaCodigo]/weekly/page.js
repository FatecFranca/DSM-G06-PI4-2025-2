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
import ComparisonChart from "@/components/ComparisonChart/ComparisonChart";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]); // Dados para a tabela (opcional)
  const [chartData, setChartData] = useState([]); // Dados para o gráfico
  const [dataLoaded, setDataLoaded] = useState(false); // Indica se os dados foram carregados

  // --- Estado para as estatísticas ---
  const [estatisticas, setEstatisticas] = useState(null);
  // --- Fim do estado para as estatísticas ---

  // --- Estados para controle da semana ---
  const [selectedWeekStart, setSelectedWeekStart] = useState(null); // Data do início da semana selecionada (segunda-feira)
  const [selectedWeekEnd, setSelectedWeekEnd] = useState(null);   // Data do fim da semana selecionada (domingo)
  const [selectedDate, setSelectedDate] = useState(new Date());
  // --- Fim dos estados para controle da semana ---

  const [comparisonChartData, setComparisonChartData] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [modoGeral, setModoGeral] = useState(false); // ← NOVO ESTADO

  // --- Função para calcular a data de início (DOMINGO) de uma semana a partir de uma data ---
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // DOMINGO = 0, SEGUNDA = 1, ..., SÁBADO = 6
    const diff = d.getDate() - day; // Subtrai os dias para chegar no domingo
    return new Date(d.setDate(diff));
  };

  // --- Função para calcular a data de fim (SÁBADO) de uma semana a partir de uma data ---
  const getEndOfWeek = (date) => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Adiciona 6 dias para chegar ao sábado
    return end;
  };

  // --- Função para formatar data como YYYY-MM-DD ---
  const formatDateISO = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };
  // --- Fim das funções auxiliares ---

  // --- Manipulador para selecionar uma data específica (SEM buscar automaticamente) ---
  const handleDateChange = (event) => {
    const novaData = new Date(event.target.value);
    setSelectedDate(novaData);

    const inicioSemana = getStartOfWeek(novaData);
    const fimSemana = getEndOfWeek(novaData);

    setSelectedWeekStart(inicioSemana);
    setSelectedWeekEnd(fimSemana);

    // NÃO chama loadReport aqui - só atualiza as datas
    console.log("📅 Nova semana selecionada:", {
      inicio: inicioSemana.toLocaleDateString('pt-BR'),
      fim: fimSemana.toLocaleDateString('pt-BR')
    });
  };

  // --- FUNÇÃO PARA CARREGAR O RELATÓRIO ---
  const loadReport = async (mochilaCodigo, inicio, fim) => {
    try {
      setSearchLoading(true);
      setLoading(true);
      setError("");
      setEstatisticas(null);
      setChartData([]);
      setComparisonChartData([]);

      let url = "";

      if (modoGeral) {
        // 🔹 Modo Relatório Geral
        url = `${process.env.NEXT_PUBLIC_API_URL}/medicoes/geral/${mochilaCodigo}`;
        console.log("📊 Buscando relatório GERAL");
      } else {
        // 🔹 Modo Semana Selecionada
        url = `${process.env.NEXT_PUBLIC_API_URL}/medicoes/periodo/${inicio}/${fim}/${mochilaCodigo}`;
        console.log("📊 Buscando relatório da semana:", { inicio, fim });
      }

      const res = await authFetch(url);

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
      console.log("📦 Dados recebidos da API:", rawData);

      // --- PROCESSAMENTO DOS DADOS CONFORME O MODO ---
      if (modoGeral) {
        processarDadosModoGeral(rawData);
      } else {
        processarDadosModoSemanal(rawData);
      }

      setDataLoaded(true);
    } catch (err) {
      console.error("[WeeklyReportPage] Erro ao carregar relatório:", err);
      setError(err.message || "Falha ao carregar o relatório.");
      setChartData([]);
      setReportData([]);
      setEstatisticas(null);
      setDataLoaded(false);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  // --- FUNÇÃO PARA PROCESSAR DADOS DO MODO GERAL ---
  const processarDadosModoGeral = (rawData) => {
    if (rawData && rawData.dadosProcessados && rawData.estatisticas) {
      console.log("✅ Dados já processados pela API (Modo Geral)");

      const dadosGraficoPrincipal = rawData.dadosProcessados.dailyLabels.map((label, index) => ({
        name: `Dia ${label}`,
        peso: rawData.dadosProcessados.dailyAvgs[index],
      }));

      const dadosGraficoComparacao = rawData.dadosProcessados.dailyLabels.map((label, index) => ({
        name: `Dia ${label}`,
        esquerda: rawData.dadosProcessados.dailyAvgsEsq[index],
        direita: rawData.dadosProcessados.dailyAvgsDir[index]
      }));

      setChartData(dadosGraficoPrincipal);
      setComparisonChartData(dadosGraficoComparacao);
      setEstatisticas(rawData.estatisticas);
      setReportData(rawData);
    }
  };

  // --- FUNÇÃO PARA PROCESSAR DADOS DO MODO SEMANAL ---
  const processarDadosModoSemanal = (rawData) => {
    let dadosParaGrafico = [];
    let totaisParaEstatisticas = []; // ← USAR TOTAIS POR MINUTO como no Mobile

    if (Array.isArray(rawData)) {
      // 🔹 LÓGICA DO GRÁFICO (mantém a atual)
      const dadosPorDia = {};

      // 🔹 LÓGICA DAS ESTATÍSTICAS (igual ao Mobile)
      const minuteMap = {};
      (rawData || []).forEach((m) => {
        try {
          const dt = new Date(m.MedicaoData);
          const hh = String(dt.getHours()).padStart(2, "0");
          const mm = String(dt.getMinutes()).padStart(2, "0");
          const key = `${hh}:${mm}`;
          if (!minuteMap[key]) minuteMap[key] = { left: [], right: [] };

          const local = (m.MedicaoLocal || "").toString().toLowerCase();
          if (local.includes("esquer")) minuteMap[key].left.push(Number(m.MedicaoPeso || 0));
          else if (local.includes("direit")) minuteMap[key].right.push(Number(m.MedicaoPeso || 0));
          else if (local.includes("amb") || local.includes("cent")) {
            minuteMap[key].left.push(Number(m.MedicaoPeso || 0));
            minuteMap[key].right.push(Number(m.MedicaoPeso || 0));
          }
          // Ignora outros casos como no Mobile
        } catch (e) {
          // ignore malformed dates
        }
      });

      // 🔹 CALCULAR TOTAIS POR MINUTO (EXATAMENTE IGUAL AO MOBILE)
      totaisParaEstatisticas = Object.keys(minuteMap).map((k) => {
        const obj = minuteMap[k];
        const avgLeft = obj.left.length ? obj.left.reduce((a, b) => a + b, 0) / obj.left.length : 0;
        const avgRight = obj.right.length ? obj.right.reduce((a, b) => a + b, 0) / obj.right.length : 0;
        return roundTo2((avgLeft || 0) + (avgRight || 0));
      });

      // 🔹 PROCESSAMENTO PARA O GRÁFICO (mantém o atual)
      rawData.forEach((medicao) => {
        const data = new Date(medicao.MedicaoData);
        const diaKey = data.toLocaleDateString("pt-BR");
        const pesoNum = parseFloat(medicao.MedicaoPeso);

        if (!dadosPorDia[diaKey]) {
          dadosPorDia[diaKey] = {
            name: diaKey,
            pesos: [],
            total: 0,
            count: 0
          };
        }

        dadosPorDia[diaKey].pesos.push(pesoNum);
        dadosPorDia[diaKey].total += pesoNum;
        dadosPorDia[diaKey].count++;
      });

      // ORDENAR DIAS CRONOLOGICAMENTE
      const diasOrdenados = Object.keys(dadosPorDia).sort((a, b) => {
        const [diaA, mesA, anoA] = a.split('/').map(Number);
        const [diaB, mesB, anoB] = b.split('/').map(Number);
        const dataA = new Date(anoA, mesA - 1, diaA);
        const dataB = new Date(anoB, mesB - 1, diaB);
        return dataA - dataB;
      });

      // Calcular média por dia
      dadosParaGrafico = diasOrdenados.map(dataKey => {
        const dia = dadosPorDia[dataKey];
        return {
          name: dataKey,
          peso: dia.count > 0 ? roundTo2(dia.total / dia.count) : 0
        };
      });

      console.log("📊 Dados para gráfico:", dadosParaGrafico);
      console.log("📈 Totais para estatísticas:", totaisParaEstatisticas);
      console.log("🔢 Comparação: Gráfico usa", dadosParaGrafico.length, "dias | Estatísticas usam", totaisParaEstatisticas.length, "minutos");
    }

    setChartData(dadosParaGrafico);
    setReportData(rawData);

    // 🔹 USAR TOTAIS POR MINUTO para estatísticas (IGUAL AO MOBILE)
    const stats = calcularEstatisticas(totaisParaEstatisticas);
    setEstatisticas(stats);
  };

  // --- Função para calcular estatísticas ---
  const calcularEstatisticas = (valoresRaw) => {
    // Usar a filtragem mais robusta do Mobile
    const valores = valoresRaw.filter((v) => typeof v === "number" && !isNaN(v));

    if (!valores.length) return null;

    const n = valores.length;
    const somatorio = valores.reduce((a, b) => a + b, 0);
    const media = somatorio / n;

    const sorted = [...valores].sort((a, b) => a - b);
    const mediana = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    // Moda - igual ao Mobile
    const freq = {};
    valores.forEach((v) => {
      const key = roundTo2(v).toString();
      freq[key] = (freq[key] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(freq));
    const modaArray = Object.keys(freq).filter((k) => freq[k] === maxFreq).map((k) => Number(k));

    // Variância e desvio padrão
    const variancia = valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / n;
    const desvioPadrao = Math.sqrt(variancia);

    // CORREÇÃO CRÍTICA: Prevenir divisão por zero como no Mobile
    const denomSkew = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 3);
    const denomKurt = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 4);

    const assimetria = (valores.reduce((a, b) => a + Math.pow(b - media, 3), 0) / n) / denomSkew;
    const curtose = (valores.reduce((a, b) => a + Math.pow(b - media, 4), 0) / n) / denomKurt - 3;

    // Cálculos extras da Web (opcionais, mas úteis)
    const acimaDaMedia = valores.filter(v => v > media).length;
    const probAcimaMedia = acimaDaMedia / n;

    // Regressão Linear (opcional)
    const xVals = valores.map((_, i) => i);
    const yVals = valores;
    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = yVals.reduce((a, b) => a + b, 0);
    const sumXY = xVals.reduce((sum, xi, i) => sum + xi * yVals[i], 0);
    const sumXX = xVals.reduce((sum, xi) => sum + xi * xi, 0);

    let regressao = null;
    const denominador = n * sumXX - sumX * sumX;

    if (denominador !== 0) { // Evitar divisão por zero
      const slope = (n * sumXY - sumX * sumY) / denominador;
      const intercept = (sumY - slope * sumX) / n;
      regressao = {
        slope: roundTo2(slope),
        intercept: roundTo2(intercept),
        equacao: `y = ${roundTo2(intercept)} + ${roundTo2(slope)}x`
      };
    }

    return {
      totalMedicoes: n,
      totalPeso: roundTo2(somatorio),
      media: roundTo2(media),
      mediana: roundTo2(mediana),
      moda: modaArray.length ? modaArray.join(", ") : "—",
      desvioPadrao: roundTo2(desvioPadrao),
      assimetria: roundTo2(assimetria),
      curtose: roundTo2(curtose),
      probAcimaMedia: roundTo2(probAcimaMedia * 100), // em %
      regressao: regressao // Pode ser null se não foi possível calcular
    };
  };
  // --- FIM DA FUNÇÃO PARA CALCULAR ESTATÍSTICAS ---

  // --- Configurar semana atual ao montar, mas NÃO carregar dados automaticamente ---
  useEffect(() => {
    if (mochilaCodigo) {
      const hoje = new Date();
      const inicioSemana = getStartOfWeek(hoje);
      const fimSemana = getEndOfWeek(hoje);

      setSelectedWeekStart(inicioSemana);
      setSelectedWeekEnd(fimSemana);
      setSelectedDate(hoje);

      setLoading(false); // ← Garante que loading seja false após configurar as datas

      console.log("📅 Semana inicial configurada:", {
        inicio: inicioSemana.toLocaleDateString('pt-BR'),
        fim: fimSemana.toLocaleDateString('pt-BR')
      });
    }
  }, [mochilaCodigo]); // Remove modoGeral das dependências

  // --- Manipulador para selecionar a semana anterior ---
  const handlePreviousWeek = () => {
    if (!selectedWeekStart) return;
    const novaData = new Date(selectedDate);
    novaData.setDate(novaData.getDate() - 7);

    setSelectedDate(novaData);

    const inicioSemana = getStartOfWeek(novaData);
    const fimSemana = getEndOfWeek(novaData);

    setSelectedWeekStart(inicioSemana);
    setSelectedWeekEnd(fimSemana);

    const inicioISO = formatDateISO(inicioSemana);
    const fimISO = formatDateISO(fimSemana);

    loadReport(mochilaCodigo, inicioISO, fimISO);
  };

  // --- Manipulador para selecionar a semana seguinte ---
  const handleNextWeek = () => {
    if (!selectedWeekStart) return;
    const novaData = new Date(selectedDate);
    novaData.setDate(novaData.getDate() + 7);

    setSelectedDate(novaData);

    const inicioSemana = getStartOfWeek(novaData);
    const fimSemana = getEndOfWeek(novaData);

    setSelectedWeekStart(inicioSemana);
    setSelectedWeekEnd(fimSemana);

    const inicioISO = formatDateISO(inicioSemana);
    const fimISO = formatDateISO(fimSemana);

    loadReport(mochilaCodigo, inicioISO, fimISO);
  };

  // --- Manipulador para selecionar a semana atual ---
  const handleCurrentWeek = () => {
    const hoje = new Date();
    setSelectedDate(hoje); // Atualiza o seletor para hoje

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
          <p className="text-gray-800">Carregando relatório semanal...</p>
        </div>
      </ProtectedRoute>
    );
  }

  {/* Mensagem quando não há dados carregados */ }
  {
    !modoGeral && !dataLoaded && !loading && (
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <div className="text-blue-600 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-blue-800 mb-2">
          Selecione uma semana
        </h3>
        <p className="text-blue-700 mb-4">
          Escolha uma data e clique em "Buscar Semana" para visualizar os dados
        </p>
        <p className="text-sm text-blue-600">
          Semana atual: {selectedWeekStart?.toLocaleDateString('pt-BR')} a {selectedWeekEnd?.toLocaleDateString('pt-BR')}
        </p>
      </div>
    )
  }

  {/* Mensagem de erro real (problemas de conexão, etc) */ }
  {
    error && (
      <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Erro</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={handleCurrentWeek}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    )
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
            </div>
          </div>

          {/* Botões de Modo */}
          <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6 text-center">Tipo de Relatório Semanal</h2>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <button
                onClick={() => setModoGeral(false)}
                className={`px-8 py-4 rounded-lg font-medium transition-colors flex items-center gap-3 text-lg ${!modoGeral
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Semana Selecionada
              </button>

              <button
                onClick={() => setModoGeral(true)}
                className={`px-8 py-4 rounded-lg font-medium transition-colors flex items-center gap-3 text-lg ${modoGeral
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Relatório Geral
              </button>
            </div>
          </div>

          {/* Seletor de Semana - Mais Largo */}
          {!modoGeral && selectedWeekStart && selectedWeekEnd && (
            <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
              <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                {/* Seletor de Data - Mais Largo */}
                <div className="flex-1 min-w-[300px]">
                  <label htmlFor="weekSelector" className="block text-lg font-medium text-gray-700 mb-3">
                    Selecione uma data na semana:
                  </label>
                  <input
                    id="weekSelector"
                    type="date"
                    value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                    onChange={handleDateChange}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>

                {/* Display da semana - Mais Largo */}
                <div className="flex-1 min-w-[300px] text-center">
                  <p className="text-lg font-medium text-gray-600 mb-2">Semana selecionada:</p>
                  <p className="text-xl font-bold text-green-600">
                    {selectedWeekStart.toLocaleDateString('pt-BR')} a {selectedWeekEnd.toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ({selectedWeekStart.toLocaleDateString('pt-BR', { weekday: 'long' })} a {selectedWeekEnd.toLocaleDateString('pt-BR', { weekday: 'long' })})
                  </p>
                </div>

                {/* Botão de busca - Mais Largo */}
                <div className="flex-1 min-w-[250px]">
                  <button
                    onClick={() => {
                      const inicioISO = formatDateISO(selectedWeekStart);
                      const fimISO = formatDateISO(selectedWeekEnd);
                      loadReport(mochilaCodigo, inicioISO, fimISO);
                    }}
                    disabled={searchLoading}
                    className={`w-full bg-green-500 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-3 text-lg ${searchLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600 shadow-md'
                      }`}
                  >
                    {searchLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        Buscando...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Buscar Semana
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Botão de busca para modo geral - Mais Largo */}
          {modoGeral && (
            <div className="mb-6 flex justify-center">
              <button
                onClick={() => {
                  const inicioISO = formatDateISO(getStartOfWeek(new Date()));
                  const fimISO = formatDateISO(getEndOfWeek(new Date()));
                  loadReport(mochilaCodigo, inicioISO, fimISO);
                }}
                disabled={searchLoading}
                className={`bg-green-500 text-white px-10 py-4 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-3 text-lg ${searchLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600 shadow-md'
                  }`}
              >
                {searchLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Buscando Relatório Geral...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Buscar Relatório Geral
                  </>
                )}
              </button>
            </div>
          )}

          {/* Conteúdo do Relatório - Só mostra se há dados carregados */}
          {(modoGeral || dataLoaded) && (
            <div className="mt-8 space-y-8">
              {/* --- SEÇÃO DE ESTATÍSTICAS --- */}
              {estatisticas ? (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                  <h2 className="text-xl font-semibold mb-4">Indicadores Estatísticos</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Medições" value={estatisticas.totalMedicoes} />
                    <StatCard title="Total Peso (kg)" value={estatisticas.totalPeso} />
                    <StatCard title="Média (kg)" value={estatisticas.media} />
                    <StatCard title="Mediana (kg)" value={estatisticas.mediana} />
                    <StatCard title="Moda (kg)" value={estatisticas.moda} />
                    <StatCard title="Desvio Padrão (kg)" value={estatisticas.desvioPadrao} />
                    <StatCard title="Assimetria" value={estatisticas.assimetria} />
                    <StatCard title="Curtose" value={estatisticas.curtose} />
                    <StatCard title="Regressão Linear" value={estatisticas.regressao.equacao} />
                  </div>
                </div>
              ) : (dataLoaded && !loading) && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                  <p className="text-gray-500 text-center">Nenhuma medição disponível para cálculo estatístico.</p>
                </div>
              )}

              {/* Gráfico Principal */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">
                  {modoGeral ? "📊 Médias por Dia da Semana (Geral)" : "📊 Médias Diárias da Semana"}
                </h3>
                {chartData && chartData.length > 0 ? (
                  <Chart
                    dados={chartData}
                    titulo={modoGeral ? "Médias Gerais por Dia" : `Médias da Semana - ${selectedWeekStart?.toLocaleDateString('pt-BR')} a ${selectedWeekEnd?.toLocaleDateString('pt-BR')}`}
                  />
                ) : (dataLoaded && !loading) && (
                  <div className="bg-gray-100 p-8 rounded-lg text-center">
                    <p className="text-gray-500">
                      {modoGeral ? "Nenhum dado disponível para o relatório geral." : "Nenhum dado disponível para esta semana."}
                    </p>
                  </div>
                )}
              </div>

              {/* Gráfico de Comparação - Só mostra se houver dados de comparação */}
              {comparisonChartData && comparisonChartData.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">
                    {modoGeral ? "⚖️ Comparativo Geral Esquerda vs Direita" : "⚖️ Comparativo Esquerda vs Direita"}
                  </h3>
                  <ComparisonChart
                    dados={comparisonChartData}
                    titulo={modoGeral ? "Comparativo Geral" : `Comparativo - ${selectedWeekStart?.toLocaleDateString('pt-BR')} a ${selectedWeekEnd?.toLocaleDateString('pt-BR')}`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
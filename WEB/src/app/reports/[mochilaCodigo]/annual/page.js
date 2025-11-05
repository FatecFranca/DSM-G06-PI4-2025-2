"use client";

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

export default function AnnualReportPage({ params }) { //  Nome da função corrigido
  const router = useRouter();
  const { authFetch } = useAuth();

  const anoAtual = new Date().getFullYear();
  //  Acesso direto ao params, não é uma Promise no App Router
  const { mochilaCodigo } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState([]); // Dados para a tabela (opcional)
  const [chartData, setChartData] = useState([]); // Dados para o gráfico
  // --- Estado para as estatísticas ---
  const [estatisticas, setEstatisticas] = useState(null);
  // --- Fim do estado para as estatísticas ---
  // --- Estado para selecionar o ano ---
  const [selectedYear, setSelectedYear] = useState(anoAtual);
  // --- Fim do estado para selecionar o ano ---

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
    const assimetria =
      (valores.reduce((a, b) => a + Math.pow(b - media, 3), 0) / n) / denomSkew;

    // 6. Curtose (Excesso de curtose: kurtosis - 3)
    const denomKurt = Math.pow(desvioPadrao, 4) || 1;
    const curtose =
      (valores.reduce((a, b) => a + Math.pow(b - media, 4), 0) / n) / denomKurt - 3;

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

  // --- FUNÇÃO PARA CARREGAR O RELATÓRIO ANUAL ---
  const loadReport = async (mochilaCodigo, ano) => {
    try {
      setLoading(true);
      setError("");
      setEstatisticas(null); // Limpa estatísticas anteriores

      // --- CHAMADA PARA A API PARA OBTER O RELATÓRIO ANUAL ---
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/medicoes/anual/${ano}/${mochilaCodigo}`
      );

      if (!res.ok) {
        let errorMessage = `Erro ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("[AnnualReportPage] Erro ao parsear JSON de erro da API:", e);
        }
        throw new Error(errorMessage);
      }

      const rawData = await res.json();
      console.log("[AnnualReportPage] Dados brutos recebidos da API:", rawData);

      // --- PROCESSAMENTO DOS DADOS ---
      let dadosParaGrafico = [];
      let pesosParaEstatisticas = []; // Array de números para calcular estatísticas

      if (Array.isArray(rawData)) {
        dadosParaGrafico = rawData.map((medicao) => {
          const pesoNum = parseFloat(medicao.MedicaoPeso);
          pesosParaEstatisticas.push(pesoNum); // Adiciona ao array para estatísticas
          return {
            name: new Date(medicao.MedicaoData).toLocaleDateString("pt-BR"), // Ex: "21/10/2025"
            peso: pesoNum,
            local: medicao.MedicaoLocal,
            status: medicao.MedicaoStatus,
          };
        });
      } else {
        console.warn("[AnnualReportPage] Resposta da API não é um array. Tentando processar como objeto.");
        if (rawData && typeof rawData === "object") {
          for (const [key, medicao] of Object.entries(rawData)) {
            if (medicao && medicao.MedicaoData) {
              const pesoNum = parseFloat(medicao.MedicaoPeso);
              if (!isNaN(pesoNum)) { // Verifica se o peso é um número válido antes de adicionar
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
      }

      setChartData(dadosParaGrafico);
      setReportData(rawData); // Para uso futuro (tabela, etc.)

      // --- CALCULAR ESTATÍSTICAS ---
      const stats = calcularEstatisticas(pesosParaEstatisticas);
      setEstatisticas(stats);
      // --- FIM DO CÁLCULO DAS ESTATÍSTICAS ---

    } catch (err) {
      console.error("[AnnualReportPage] Erro ao carregar relatório:", err);
      setError(err.message || "Falha ao carregar o relatório anual.");
      setChartData([]);
      setReportData([]);
      setEstatisticas(null);
    } finally {
      setLoading(false);
    }
  };
  // --- FIM DA FUNÇÃO loadReport ---

  // --- Carregar relatório ao montar ou quando ano/mochilaCodigo mudarem ---
  useEffect(() => {
    if (mochilaCodigo) {
      loadReport(mochilaCodigo, selectedYear);
    }
  }, [mochilaCodigo, selectedYear]);

  // --- Manipulador para mudar o ano ---
  const handleYearChange = (e) => {
    const novoAno = Number(e.target.value);
    setSelectedYear(novoAno);
    // O useEffect acima cuidará de carregar os dados para o novo ano
  };
  // --- Fim do manipulador ---

  if (loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p>Carregando relatório anual...</p>
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
      <main className="min-h-screen p-6 bg-gray-50 text-black">
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
              <h1 className="text-2xl font-bold">Relatório Anual</h1>
              <p className="text-gray-600">Mochila: {mochilaCodigo}</p>
            </div>
          </div>

          {/* Seletor de Ano */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
            <label htmlFor="yearSelector" className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Ano
            </label>
            <select
              id="yearSelector"
              value={selectedYear}
              onChange={handleYearChange}
              className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {[...Array(5)].map((_, i) => {
                const ano = new Date().getFullYear() - 2 + i; // Ex: de 2023 a 2027
                return (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                );
              })}
            </select>
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
              titulo={`Dados do Relatório Anual - ${selectedYear}`}
            />
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
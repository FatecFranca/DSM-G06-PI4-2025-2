import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ToastAndroid,
  Animated,
  Easing,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Ionicons } from "@expo/vector-icons";

import { LINKAPI, PORTAPI } from "../utils/global";
import {
  validarTokens,
  pegarTokens,
  obterDadosUsuario,
  roundTo2,
} from "../utils/validacoes";

import BottomNav from "../components/BottomNav";
import SettingsModal from "../components/SettingsModal";

const screenWidth = Dimensions.get("window").width;

// --- Funções Auxiliares (Movidas para fora para evitar recriação) ---

const localSide = (local) => {
  if (!local) return "outro";
  const l = local.toString().toLowerCase();
  if (l.includes("esquer")) return "esquerda";
  if (l.includes("direit")) return "direita";
  if (l.includes("amb")) return "ambos";
  return "outro";
};

const groupByDay = (dados) => {
  const map = {};
  dados.forEach((m) => {
    const date = parseISO(m.MedicaoData);
    const key = format(date, "yyyy-MM-dd");
    if (!map[key]) map[key] = [];
    map[key].push(m);
  });
  return map;
};

const calcularEstatisticas = (valoresRaw) => {
  const valores = valoresRaw.filter((v) => typeof v === "number" && Number.isFinite(v)); // Ultra-seguro
  if (!valores.length) return null;

  const n = valores.length;
  const somatorio = valores.reduce((a, b) => a + b, 0);
  const media = somatorio / n;

  const sorted = [...valores].sort((a, b) => a - b);
  const mediana =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const freq = {};
  valores.forEach((v) => {
    const key = roundTo2(v).toString();
    freq[key] = (freq[key] || 0) + 1;
  });
  const maxFreq = Math.max(...Object.values(freq));
  const modaArray = Object.keys(freq).filter((k) => freq[k] === maxFreq).map((k) => Number(k));

  const variancia =
    valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / n;
  const desvioPadrao = Math.sqrt(variancia);

  const denomSkew = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 3);
  const denomKurt = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 4);

  const assimetria =
    valores.reduce((a, b) => a + Math.pow(b - media, 3), 0) / n / denomSkew;

  const curtose =
    valores.reduce((a, b) => a + Math.pow(b - media, 4), 0) / n / denomKurt - 3;

  return {
    media: roundTo2(media),
    mediana: roundTo2(mediana),
    moda: modaArray.length ? modaArray.join(", ") : "—",
    desvioPadrao: roundTo2(desvioPadrao),
    assimetria: roundTo2(assimetria),
    curtose: roundTo2(curtose),
  };
};

// --- Função de Regressão Linear (para prever tendência do peso médio diário) ---
const calcularRegressaoLinear = (valores) => {
  if (!valores || valores.length < 2) return null;

  const n = valores.length;
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const ys = valores.map(v => Number(v));

  const mediaX = xs.reduce((a, b) => a + b, 0) / n;
  const mediaY = ys.reduce((a, b) => a + b, 0) / n;

  const numerador = xs.reduce((sum, x, i) => sum + (x - mediaX) * (ys[i] - mediaY), 0);
  const denominador = xs.reduce((sum, x) => sum + Math.pow(x - mediaX, 2), 0);

  if (denominador === 0) return null;

  const a = numerador / denominador; // inclinação
  const b = mediaY - a * mediaX;     // intercepto

  return { a: Number(a.toFixed(2)), b: Number(b.toFixed(2)) };
};


// 🎯 Versão ULTRA-SEGURA da função para evitar Infinity no cálculo da média
const getDailySideAvgs = (medicoes, side) => {
  if (!medicoes || medicoes.length === 0) return [];

  const grouped = groupByDay(medicoes);

  return Object.keys(grouped)
    .sort()
    .map((day) => {
      const items = grouped[day];

      const sideItems = items
        .filter(m => {
          const local = m.MedicaoLocal?.toLowerCase();
          const targetSide = side.toLowerCase();
          return local && (local.includes(targetSide) || local.includes("ambos"));
        })
        .map(m => Number(m.MedicaoPeso || 0));

      const sum = sideItems.reduce((a, b) => a + b, 0);

      // Se sideItems.length for 0, avg é 0. Se for divisão por zero (não deveria ocorrer), forçamos 0.
      let avg = sideItems.length
        ? sum / sideItems.length
        : 0;

      // Filtro final: se por alguma razão for NaN ou Infinity, retorna 0
      if (!Number.isFinite(avg)) {
        avg = 0;
      }

      return roundTo2(avg);
    });
};


// --- Componente Principal ---

export default function MonthlyReportScreen({ navigation, route }) {
  const { codigo, nome } = route.params;

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [medicoes, setMedicoes] = useState([]);
  const [pesoUsuario, setPesoUsuario] = useState(0);
  const [porcentagemMaxima, setPorcentagemMaxima] = useState(10);

  const [estatisticas, setEstatisticas] = useState(null);

  const [dadosProcessados, setDadosProcessados] = useState({
    dailyAvgs: [],
    maiorEsq: null,
    maiorDir: null,
    menorEsq: null,
    menorDir: null,
    totalMedicoes: 0,
    mediçõesAcimaLimite: 0,
    diasComMedicao: 0,
    pesoMaximoPermitido: 0,
  });

  const [statsExpanded, setStatsExpanded] = useState(true);
  const animVal = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    bucarDadosUsuario();
  }, []);

  const bucarDadosUsuario = async () => {
    try {
      const response = await obterDadosUsuario(navigation);
      if (response === "false") return;

      setPesoUsuario(response.usuario.UsuarioPeso || 70);
      setPorcentagemMaxima(
        response.usuario.UsuarioPesoMaximoPorcentagem || 10
      );
    } catch (error) {
      ToastAndroid.show("Erro ao obter dados do usuário", ToastAndroid.SHORT);
    }
  };

  useEffect(() => {
    buscarRelatorioMensal();
  }, [selectedDate]);

  const handleMonthChange = (event, date) => {
    setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };


  // Função processarMedicoes
  const processarMedicoes = (dados, pesoUsuario, porcentagemMaxima) => {
    if (!dados || dados.length === 0) {
      setEstatisticas(null);
      setDadosProcessados({
        dailyAvgs: [],
        maiorEsq: null,
        maiorDir: null,
        menorEsq: null,
        menorDir: null,
        totalMedicoes: 0,
        mediçõesAcimaLimite: 0,
        diasComMedicao: 0,
        pesoMaximoPermitido: 0,
      });
      return;
    }

    const grouped = groupByDay(dados);

    let maiorEsq = null;
    let maiorDir = null;
    let menorEsq = null;
    let menorDir = null;
    let totalMedicoes = 0;
    let mediçõesAcimaLimite = 0;

    const totaisMensais = [];

    const pesoMaximoPermitido = (pesoUsuario * (porcentagemMaxima / 100)) / 2;

    const dailyAvgs = [];

    Object.keys(grouped)
      .sort()
      .forEach((day) => {
        const items = grouped[day];
        const left = [];
        const right = [];

        // --- Cálculo de Totais por Timestamp para as Estatísticas ---
        const mapaHoraMinuto = {};
        items.forEach(item => {
          const d = new Date(item.MedicaoData);
          const chave = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

          if (!mapaHoraMinuto[chave]) mapaHoraMinuto[chave] = [];
          mapaHoraMinuto[chave].push(item);
        });

        Object.values(mapaHoraMinuto).forEach(lista => {
          const esq = lista.filter(v => localSide(v.MedicaoLocal) === "esquerda");
          const dir = lista.filter(v => localSide(v.MedicaoLocal) === "direita");

          const pesoEsq = esq.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / (esq.length || 1);
          const pesoDir = dir.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / (dir.length || 1);

          const total = pesoEsq + pesoDir;
          // Garantindo que seja finito antes de adicionar
          if (Number.isFinite(total)) {
            totaisMensais.push(roundTo2(total));
          }
        });
        // --- Fim Cálculo de Totais por Timestamp

        items.forEach((m) => {
          const side = localSide(m.MedicaoLocal);
          const peso = Number(m.MedicaoPeso || 0);
          totalMedicoes++;

          if (peso > pesoMaximoPermitido) {
            mediçõesAcimaLimite++;
          }

          if (side === "esquerda" || side === "ambos") {
            left.push(peso);
          }
          if (side === "direita" || side === "ambos") {
            right.push(peso);
          }

          const data = parseISO(m.MedicaoData);

          if (side === "esquerda" || side === "ambos") {
            if (!maiorEsq || peso > maiorEsq.peso)
              maiorEsq = { peso, data, lado: "esquerda" };
            if (!menorEsq || peso < menorEsq.peso)
              menorEsq = { peso, data, lado: "esquerda" };
          }
          if (side === "direita" || side === "ambos") {
            if (!maiorDir || peso > maiorDir.peso)
              maiorDir = { peso, data, lado: "direita" };
            if (!menorDir || peso < menorDir.peso)
              menorDir = { peso, data, lado: "direita" };
          }
        });

        const mediaEsq = left.length
          ? left.reduce((a, b) => a + b, 0) / left.length
          : 0;
        const mediaDir = right.length
          ? right.reduce((a, b) => a + b, 0) / right.length
          : 0;

        const totalDiario = mediaEsq + mediaDir;

        // Garantindo que 'total' seja finito
        let safeTotalDiario = totalDiario;
        if (!Number.isFinite(safeTotalDiario)) {
          safeTotalDiario = 0;
        }

        dailyAvgs.push({
          dia: format(parseISO(day), "dd"),
          total: Number(safeTotalDiario.toFixed(2)),
        });
      });

    const stats = calcularEstatisticas(totaisMensais);

    // --- Cálculo da Regressão Linear com base nos totais diários ---
    const totaisDiarios = dailyAvgs.map((d) => d.total).filter((v) => Number.isFinite(v));
    const regressao = calcularRegressaoLinear(totaisDiarios);

    setEstatisticas({ ...stats, regressao });

    const diasComMedicao = Object.keys(grouped).length;

    setDadosProcessados({
      dailyAvgs,
      maiorEsq,
      maiorDir,
      menorEsq,
      menorDir,
      totalMedicoes,
      mediçõesAcimaLimite,
      diasComMedicao,
      pesoMaximoPermitido,
    });
  };

  const buscarRelatorioMensal = async () => {
    try {
      setLoading(true);
      setErro("");
      setMedicoes([]);
      setEstatisticas(null);

      const resposta = await validarTokens(0, navigation);
      if (resposta !== "true")
        return ToastAndroid.show(resposta, ToastAndroid.SHORT);

      const tokens = await pegarTokens();
      const { accessToken } = tokens;

      const mes = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const ano = selectedDate.getFullYear();

      const response = await fetch(
        `${LINKAPI}${PORTAPI}/medicoes/mensal/${ano}/${mes}/${codigo}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const erroData = await response.json();
        setErro(erroData.error || "Erro ao obter relatório mensal");
        return;
      }

      const dados = await response.json();
      setMedicoes(dados || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  // useEffect para processamento (Corrige o "Too many re-renders")
  useEffect(() => {
    processarMedicoes(medicoes, pesoUsuario, porcentagemMaxima);
  }, [medicoes, pesoUsuario, porcentagemMaxima]);

  const {
    dailyAvgs,
    maiorEsq,
    maiorDir,
    menorEsq,
    menorDir,
    totalMedicoes,
    mediçõesAcimaLimite,
    diasComMedicao,
    pesoMaximoPermitido,
  } = dadosProcessados;

  const chartData = {
    labels: dailyAvgs.map((d) => d.dia),
    datasets: [
      {
        data: dailyAvgs.map((d) => d.total),
        color: () => "#43a047",
      },
    ],
  };

  // 🎯 Geração segura dos dados para o LineChart de Comparação (Esquerda x Direita)
  const dailyAvgsEsq = getDailySideAvgs(medicoes, "esquer");
  const dailyAvgsDir = getDailySideAvgs(medicoes, "direit");

  const toggleStats = () => {
    const toValue = statsExpanded ? 0 : 1;
    Animated.timing(animVal, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    setStatsExpanded(!statsExpanded);
  };

  const animatedHeight = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });
  const animatedOpacity = animVal;

  const renderStatCard = (titulo, valor, cor, emoji, footer = null) => {
    return (
      <View style={[styles.statCard, { borderLeftColor: cor }]}>
        <Text style={styles.statCardTitle}>
          {emoji} {titulo}
        </Text>
        <Text style={styles.statCardValue}>{valor}</Text>
        {footer && <Text style={styles.statCardFooter}>{footer}</Text>}
      </View>
    );
  };

  const renderIndicadores = () => {
    if (totalMedicoes === 0) return null;

    const estatisticasCalculadas = estatisticas;

    const percentualAcimaLimite = totalMedicoes > 0 ? (
      (mediçõesAcimaLimite / totalMedicoes) *
      100
    ).toFixed(1) : "0.0";

    const isAlertLimite = mediçõesAcimaLimite > 0;

    return (
      <View style={styles.statsOuter}>
        <TouchableOpacity style={styles.statsHeader} onPress={toggleStats} activeOpacity={0.8}>
          <Text style={styles.statsHeaderText}>📈 Indicadores Estatísticos</Text>
          <Text style={styles.statsHeaderToggle}>{statsExpanded ? "Ocultar" : "Mostrar"}</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.statsAnimated, { height: animatedHeight, opacity: animatedOpacity }]}>
          <ScrollView horizontal contentContainerStyle={styles.statsGrid} showsHorizontalScrollIndicator={false}>
            {renderStatCard(
              "Total Medições",
              `${totalMedicoes}`,
              "#2196F3"
            )}

            {renderStatCard(
              "Dias c/ Medição",
              `${diasComMedicao}`,
              "#4CAF50"
            )}

            {renderStatCard(
              "Média Total",
              `${estatisticasCalculadas?.media ?? "—"} kg`,
              "#00BCD4"
            )}

            {renderStatCard(
              "Mediana",
              `${estatisticasCalculadas?.mediana ?? "—"} kg`,
              "#2196F3"
            )}

            {renderStatCard(
              "Moda",
              `${estatisticasCalculadas?.moda ?? "—"} kg`,
              "#9C27B0"
            )}

            {renderStatCard(
              "Desvio Padrão",
              `${estatisticasCalculadas?.desvioPadrao ?? "—"} kg`,
              "#FF9800"
            )}

            {renderStatCard(
              "Assimetria",
              `${estatisticasCalculadas?.assimetria ?? "—"}`,
              "#F44336"
            )}

            {renderStatCard(
              "Curtose",
              `${estatisticasCalculadas?.curtose ?? "—"}`,
              "#607D8B"
            )}

            {renderStatCard(
              "Regressão Linear",
              estatisticasCalculadas?.regressao
                ? `y = ${estatisticasCalculadas.regressao.a}x + ${estatisticasCalculadas.regressao.b}`
                : "Não aplicável",
              "#455A64"
            )}
          </ScrollView>
        </Animated.View>
      </View>
    );
  };

  const renderMedicaoCard = (titulo, medicao, tipo) => {
    if (!medicao) return null;
    const acimaLimite = medicao.peso > pesoMaximoPermitido;
    return (
      <View
        style={[
          styles.card,
          acimaLimite && styles.alertCard,
          {
            borderLeftWidth: 6,
            borderLeftColor: tipo === "maior" ? "#d32f2f" : "#43a047",
          },
        ]}
      >
        <Text style={styles.bold}>
          {tipo === "maior" ? "📈" : "📉"} {titulo} ({medicao.lado})
        </Text>
        <Text>
          Data:{" "}
          {format(medicao.data, "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </Text>
        <Text>Peso: {medicao.peso.toFixed(2)} kg</Text>
        {acimaLimite && (
          <Text style={styles.alertText}>
            ⚠️ Acima do limite permitido ({pesoMaximoPermitido.toFixed(2)} kg)
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#3A3A3A" />
        </TouchableOpacity>

        <Text style={styles.title}>Relatório Mensal</Text>
        <Text style={styles.subtitle}>
          {nome}
          {"\n"}({codigo})
        </Text>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            📆 {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleMonthChange}
          />
        )}

        <TouchableOpacity style={styles.fetchButton} onPress={buscarRelatorioMensal}>
          <Text style={styles.fetchButtonText}>Buscar Relatório</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text>Carregando...</Text>
          </View>
        ) : erro ? (
          <Text style={styles.errorText}>{erro}</Text>
        ) : medicoes.length === 0 ? (
          <Text style={styles.infoText}>Nenhuma medição encontrada.</Text>
        ) : (
          <>
            {renderIndicadores()}

            <Text style={styles.graphTitle}>📊 Média Diária do Mês</Text>

            {/* 🎯 Garante que chartData.datasets[0].data tenha pontos antes de renderizar */}
            {chartData.datasets[0].data.length > 0 && (
              <LineChart
                data={chartData}
                width={screenWidth - 20}
                height={220}
                yAxisSuffix=" kg"
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#eee",
                  backgroundGradientTo: "#eee",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(0, 88, 136, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  fillShadowGradient: "#43a047", // 🔵 cor da área sob a linha
                  fillShadowGradientOpacity: 0.5, // transparência
                }}
                style={styles.graph}
                bezier
                fromZero
              />
            )}

            {chartData.datasets[0].data.length === 0 && (
              <Text style={styles.infoText}>Gráfico da Média Diária indisponível.</Text>
            )}

            <Text style={[styles.graphTitle, { marginTop: 25 }]}>
              ⚖️ Comparativo Esquerda x Direita
            </Text>

            {/* 🎯 Garante que os dados laterais tenham pontos antes de renderizar */}
            {dailyAvgsEsq.length > 0 && dailyAvgsDir.length > 0 ? (
              <LineChart
                data={{
                  labels: dailyAvgs.map((d) => d.dia),
                  datasets: [
                    {
                      data: dailyAvgsEsq, // Dados seguros (Esquerda)
                      color: () => "#42be42ff",
                      strokeWidth: 2,
                    },
                    {
                      data: dailyAvgsDir, // Dados seguros (Direita)
                      color: () => "#43a047",
                      strokeWidth: 2,
                    },
                  ],
                  legend: ["Esquerda", "Direita"],
                }}
                width={screenWidth - 20}
                height={180}
                yAxisSuffix=" kg"
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#eee",
                  backgroundGradientTo: "#eee",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2" },
                  propsForBackgroundLines: { strokeDasharray: "3" },
                }}
                style={[styles.graph, { marginBottom: 20 }]}
              />
            ) : (
              <Text style={styles.infoText}>Gráfico Comparativo indisponível ou dados insuficientes.</Text>
            )}

            {renderMedicaoCard("Maior Medição", maiorEsq, "maior")}
            {renderMedicaoCard("Maior Medição", maiorDir, "maior")}
            {renderMedicaoCard("Menor Medição", menorEsq, "menor")}
            {renderMedicaoCard("Menor Medição", menorDir, "menor")}
          </>
        )}
      </ScrollView>

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onToggleTheme={() => setDarkTheme(!darkTheme)}
        isDarkTheme={darkTheme}
        onLogout={() => {
          setSettingsVisible(false);
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }}
      />
      <View style={styles.bottomContainer}>
        <BottomNav
          navigation={navigation}
          onOpenSettings={() => setSettingsVisible(true)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eee" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 60,
    color: "#3A3A3A",
  },
  subtitle: { textAlign: "center", color: "#555", marginBottom: 20 },
  dateButton: {
    alignSelf: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#9dadaf",
    marginBottom: 15,
  },
  dateButtonText: { fontSize: 16, color: "#333" },
  fetchButton: {
    backgroundColor: "#2e7d32",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 25,
    alignSelf: "center",
    marginBottom: 20,
  },
  fetchButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loadingContainer: { alignItems: "center", marginTop: 30 },
  errorText: { color: "red", textAlign: "center", marginTop: 20 },
  infoText: { textAlign: "center", color: "#555", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 14,
    borderRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#b0bec5",
  },
  alertCard: {
    borderColor: "#d32f2f",
    backgroundColor: "#ffebee",
    borderWidth: 2,
  },
  alertText: { color: "#d32f2f", marginTop: 5, fontWeight: "bold" },
  bold: { fontWeight: "bold", color: "#000" },
  graphTitle: {
    fontSize: 18,
    textAlign: "center",
    marginVertical: 10,
    color: "#333",
  },
  graph: { alignSelf: "center", borderRadius: 10 },
  bottomContainer: { position: "absolute", bottom: 0, left: 0, right: 0 },
  backButton: { position: "absolute", top: 40, left: 20 },

  statsOuter: {
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d0d7d7",
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#e8f5e9",
  },
  statsHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e7d32",
  },
  statsHeaderToggle: {
    fontSize: 14,
    color: "#2e7d32",
  },
  statsAnimated: {
    paddingVertical: 8,
  },
  statsGrid: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statCard: {
    backgroundColor: "#fff",
    width: 150,
    marginRight: 10,
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    borderLeftWidth: 6,
    borderLeftColor: "#4CAF50",
  },
  statCardTitle: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
    marginBottom: 6,
  },
  statCardValue: {
    fontSize: 16,
    color: "#111",
    fontWeight: "700",
  },
  statCardFooter: {
    fontSize: 12,
    color: "#555",
    marginTop: 3,
  }
});
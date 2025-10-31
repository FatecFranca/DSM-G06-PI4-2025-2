import React, { useState, useEffect, useRef } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { format } from "date-fns";

import { LINKAPI, PORTAPI } from "../utils/global";
import {
  validarTokens,
  pegarTokens,
  obterDadosUsuario,
  // 🎯 roundTo2 deve ser importado ou definido aqui
  roundTo2, 
} from "../utils/validacoes";

import BottomNav from "../components/BottomNav";
import SettingsModal from "../components/SettingsModal";

const screenWidth = Dimensions.get("window").width;

// --- FUNÇÕES AUXILIARES (COPIADAS DO RELATÓRIO MENSAL) ---

// 🎯 Assumindo que roundTo2 está em ../utils/validacoes.js
// Se não estiver, descomente e use esta função:
/*
const roundTo2 = (num) => {
    return Math.round(num * 100) / 100;
};
*/

const localSide = (local) => {
  if (!local) return "outro";
  const l = local.toString().toLowerCase();
  if (l.includes("esquer")) return "esquerda";
  if (l.includes("direit")) return "direita";
  if (l.includes("amb")) return "ambos";
  return "outro";
};

const calcularEstatisticas = (valoresRaw) => {
  // Filtra valores que são números finitos
  const valores = valoresRaw.filter((v) => typeof v === "number" && Number.isFinite(v)); 
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

  // Variância e Desvio Padrão
  const variancia =
    valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / n;
  const desvioPadrao = Math.sqrt(variancia);

  // Denominadores para Assimetria e Curtose (evitando divisão por zero)
  const denomSkew = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 3);
  const denomKurt = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 4);

  // Assimetria
  const assimetria =
    valores.reduce((a, b) => a + Math.pow(b - media, 3), 0) / n / denomSkew;

  // Curtose
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

// --- COMPONENTE PRINCIPAL ---

export default function AnnualReportScreen({ navigation, route }) {
  const { codigo, nome } = route.params;

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [medicoes, setMedicoes] = useState([]);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

  const [pesoUsuario, setPesoUsuario] = useState(0);
  const [porcentagemMaxima, setPorcentagemMaxima] = useState(10);
  
  const [estatisticas, setEstatisticas] = useState(null);
  const [mediasMensais, setMediasMensais] = useState(Array(12).fill(0));

  const [statsExpanded, setStatsExpanded] = useState(true);
  const animVal = useRef(new Animated.Value(1)).current; 

  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  useEffect(() => {
    buscarDadosUsuario();
  }, []);

  useEffect(() => {
    if (pesoUsuario > 0) {
      buscarRelatorioAnual();
    }
  }, [anoSelecionado, pesoUsuario]);
  
  // 🎯 Novo useEffect para processar as medições quando elas mudarem
  useEffect(() => {
    processarMedicoesAnual(medicoes);
  }, [medicoes]);

  const buscarDadosUsuario = async () => {
    try {
      const response = await obterDadosUsuario(navigation);
      if (response === "false") return;

      setPesoUsuario(response.usuario.UsuarioPeso || 70);
      setPorcentagemMaxima(response.usuario.UsuarioPesoMaximoPorcentagem || 10);
    } catch (error) {
      ToastAndroid.show("Erro ao conectar no servidor", ToastAndroid.SHORT);
      navigation.reset({ index: 0, routes: [{ name: "main" }] });
    }
  };

  const buscarRelatorioAnual = async () => {
    try {
      setLoading(true);
      setErro("");
      setMedicoes([]);
      setEstatisticas(null); // Resetar as estatísticas

      const tokenValido = await validarTokens(0, navigation);
      if (tokenValido !== "true") {
        if (tokenValido === "false") return;
        return ToastAndroid.show(tokenValido, ToastAndroid.SHORT);
      }

      const { accessToken } = await pegarTokens();

      const response = await fetch(
        `${LINKAPI}${PORTAPI}/medicoes/anual/${anoSelecionado}/${codigo}`,
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
        setErro(erroData.error || "Erro ao obter relatório anual");
        return;
      }

      const dados = await response.json();
      setMedicoes(dados);
    } catch (e) {
      console.error(e);
      setErro("Erro ao conectar no servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Agrupa medições por mês
  const agruparPorMes = (dados) => {
    const grupos = {};
    dados.forEach((item) => {
      // 0 a 11
      const mes = new Date(item.MedicaoData).getMonth(); 
      if (!grupos[mes]) grupos[mes] = [];
      grupos[mes].push(item);
    });
    return grupos;
  };
  
  // 🎯 Nova função de processamento de dados para o relatório anual
  const processarMedicoesAnual = (dados) => {
    if (!dados || dados.length === 0) {
      setEstatisticas(null);
      setMediasMensais(Array(12).fill(0));
      return;
    }

    const grupos = agruparPorMes(dados);
    const totaisAnuais = [];

    const novasMediasMensais = meses.map((_, i) => {
      const med = grupos[i];
      if (!med || med.length === 0) return 0;

      // Filtra as medições por lado
      const esquerda = med.filter((m) =>
        localSide(m.MedicaoLocal) === "esquerda" || localSide(m.MedicaoLocal) === "ambos"
      );
      const direita = med.filter((m) =>
        localSide(m.MedicaoLocal) === "direita" || localSide(m.MedicaoLocal) === "ambos"
      );
      
      // Média dos pesos medidos para cada lado no mês
      const mediaEsq =
        esquerda.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) /
        (esquerda.length || 1);
      const mediaDir =
        direita.reduce((a, b) => a + Number(b.MedicaoPeso || 0), 0) /
        (direita.length || 1);

      const totalMensal = mediaEsq + mediaDir;
      
      // Garante que o valor é finito antes de adicionar para as estatísticas
      if (Number.isFinite(totalMensal)) {
        // Se o cálculo da média é feito apenas uma vez por mês, usamos o próprio totalMensal
        // Se a intenção for analisar todas as medições diárias do ano, o cálculo seria mais complexo.
        // Assumindo que o "total" mensal é o ponto de dado para a análise estatística anual.
        totaisAnuais.push(roundTo2(totalMensal));
      }
      
      // Filtro final de segurança para o gráfico
      if (!Number.isFinite(totalMensal)) return 0;

      return roundTo2(totalMensal);
    });
    
    setMediasMensais(novasMediasMensais);

    // Calcular as estatísticas usando os totais mensais
    const stats = calcularEstatisticas(totaisAnuais); 
    setEstatisticas(stats);
  };
  
  // UI Helpers (Copiados e adaptados)
  
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
    outputRange: [0, 140], // Altura ajustada para o ScrollView anual
  });
  const animatedOpacity = animVal;

  const renderStatCard = (titulo, valor, cor, emoji) => {
    return (
      <View style={[styles.statCard, { borderLeftColor: cor }]}>
        <Text style={styles.statCardTitle}>
          {emoji} {titulo}
        </Text>
        <Text style={styles.statCardValue}>{valor}</Text>
      </View>
    );
  };
  
  const renderIndicadoresAnuais = () => {
    // Apenas renderiza se houver medições E estatísticas calculadas
    if (medicoes.length === 0 || !estatisticas) return null;
    
    const estatisticasCalculadas = estatisticas;

    return (
      <View style={styles.statsOuter}>
        <TouchableOpacity style={styles.statsHeader} onPress={toggleStats} activeOpacity={0.8}>
          <Text style={styles.statsHeaderText}>📈 Indicadores Estatísticos Anuais</Text>
          <Text style={styles.statsHeaderToggle}>{statsExpanded ? "Ocultar" : "Mostrar"}</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.statsAnimated, { height: animatedHeight, opacity: animatedOpacity }]}>
          <ScrollView horizontal contentContainerStyle={styles.statsGrid} showsHorizontalScrollIndicator={false}>
            {renderStatCard(
              "Média Anual",
              `${estatisticasCalculadas?.media ?? "—"} kg`,
              "#00BCD4",
              "⚖️"
            )}
            {renderStatCard(
              "Mediana",
              `${estatisticasCalculadas?.mediana ?? "—"} kg`,
              "#2196F3",
              "📊"
            )}
            {renderStatCard(
              "Moda",
              `${estatisticasCalculadas?.moda ?? "—"} kg`,
              "#9C27B0",
              "🏆"
            )}
            {renderStatCard(
              "Desvio Padrão",
              `${estatisticasCalculadas?.desvioPadrao ?? "—"} kg`,
              "#FF9800",
              "🧮"
            )}
            {renderStatCard(
              "Assimetria",
              `${estatisticasCalculadas?.assimetria ?? "—"}`,
              "#F44336",
              "🔄"
            )}
            {renderStatCard(
              "Curtose",
              `${estatisticasCalculadas?.curtose ?? "—"}`,
              "#607D8B",
              "📐"
            )}
          </ScrollView>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#3A3A3A" />
        </TouchableOpacity>

        <Text style={styles.title}>Relatório Anual</Text>
        <Text style={styles.subtitle}>
          {"\n"}
          {nome}{"\n"}({codigo})
        </Text>

        <View style={styles.yearSelectorOuter}>
          <Text style={styles.label}>Ano:</Text>
          <View style={styles.pickerWrapper}> 
            <Picker
              selectedValue={anoSelecionado}
              style={styles.picker}
              onValueChange={(value) => setAnoSelecionado(value)}
            >
              {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return <Picker.Item key={year} label={year.toString()} value={year} />;
            })}
            </Picker>
          </View>
        </View>

        <TouchableOpacity style={styles.fetchButton} onPress={buscarRelatorioAnual}>
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
          <Text style={styles.infoText}>Nenhuma medição encontrada. Selecione outro ano e toque em "Buscar Relatório".</Text>
        ) : (
          <>
            {renderIndicadoresAnuais()} 
          
            {/* Gráfico principal */}
            <Text style={styles.graphTitle}>📊 Média de Peso por Mês</Text>
            {mediasMensais.filter(v => v > 0).length > 0 ? (
                <LineChart
                  data={{
                    labels: meses,
                    datasets: [
                      { data: mediasMensais, color: () => "#0288d1", strokeWidth: 2 },
                    ],
                  }}
                  width={screenWidth - 20}
                  height={220}
                  yAxisSuffix="kg"
                  chartConfig={{
                    backgroundColor: "#fff",
                    backgroundGradientFrom: "#e0f7fa",
                    backgroundGradientTo: "#b2ebf2",
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(0, 88, 136, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  style={styles.graph}
                  bezier
                  fromZero
                />
            ) : (
                <Text style={styles.infoText}>Dados insuficientes para gerar o gráfico.</Text>
            )}
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

// --- ESTILOS (Adicionados ou Modificados) ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e0f7fa" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 60,
    color: "#3A3A3A",
  },
  subtitle: { textAlign: "center", color: "#555", marginBottom: 20 },
  yearSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  label: { fontSize: 16, color: "#333", marginRight: 10 },
  picker: { height: 50, width: 150 },
  fetchButton: {
    backgroundColor: "#0288d1",
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
  graphTitle: {
    fontSize: 18,
    textAlign: "center",
    marginVertical: 10,
    color: "#333",
  },
  graph: { alignSelf: "center", borderRadius: 10 },
  bottomContainer: { position: "absolute", bottom: 0, left: 0, right: 0 },
  backButton: { position: "absolute", top: 40, left: 20 },
  
  // Estilos de Indicadores (Adicionados)
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
  yearSelectorOuter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#b0bec5",
    overflow: 'hidden', // Importante para o borderRadius
    height: 50,
    width: 150, // Ajuste este valor se necessário
  },
  picker: {
    width: "100%",
    height: 50,
  },
});
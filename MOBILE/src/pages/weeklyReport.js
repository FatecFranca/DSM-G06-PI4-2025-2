import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ToastAndroid,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  format,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Ionicons } from "@expo/vector-icons";

import { LINKAPI, PORTAPI } from "../utils/global";
import { validarTokens, pegarTokens } from "../utils/validacoes";

import BottomNav from "../components/BottomNav";
import SettingsModal from "../components/SettingsModal";

const screenWidth = Dimensions.get("window").width;

export default function WeeklyReportScreen({ navigation, route }) {
  const { codigo, nome } = route.params;

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [medicoes, setMedicoes] = useState([]);
  const [erro, setErro] = useState("");
  const [expandedDay, setExpandedDay] = useState(null);
  const [modoGeral, setModoGeral] = useState(false); // 👈 controla modo geral/semanal

  const handleWeekChange = (event, date) => {
    setShowDatePicker(false);
    if (date) setSelectedWeek(date);
  };

  useEffect(() => {
    buscarRelatorioSemanal();
  }, [selectedWeek]);

  const buscarRelatorioSemanal = async () => {
    try {
      setLoading(true);
      setErro("");
      setMedicoes([]);

      const resposta = await validarTokens(0, navigation);
      if (resposta !== "true") {
        if (resposta === "false") return;
        return ToastAndroid.show(resposta, ToastAndroid.SHORT);
      }

      const tokens = await pegarTokens();
      const { accessToken } = tokens;

      const response = await fetch(
        `${LINKAPI}${PORTAPI}/medicoes/semanal/${codigo}`,
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
        setErro(erroData.error || "Erro ao obter relatório semanal");
        return;
      }

      const dados = await response.json();
      setMedicoes(dados);
    } catch (e) {
      console.error(e);
      setErro("Erro ao conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Filtra medições da semana selecionada
  const medicoesFiltradas = medicoes.filter((m) =>
    isWithinInterval(parseISO(m.MedicaoData), {
      start: startOfWeek(selectedWeek, { locale: ptBR }),
      end: endOfWeek(selectedWeek, { locale: ptBR }),
    })
  );

  // Agrupar medições por dia
  const agruparPorDia = (lista) => {
    const grupos = {};
    lista.forEach((item) => {
      const data = new Date(item.MedicaoData);
      const dia = format(data, "EEEE, dd/MM", { locale: ptBR });
      if (!grupos[dia]) grupos[dia] = [];
      grupos[dia].push(item);
    });
    return grupos;
  };

  // Se modo geral → usa todas as semanas agrupadas por semana
  // Caso contrário → agrupa por dia
  const grupos = modoGeral ? agruparPorSemana(medicoes) : agruparPorDia(medicoesFiltradas);
  const dias = Object.keys(grupos);

  // Função para agrupar por semana (modo geral)
  function agruparPorSemana(lista) {
    const semanas = {};
    lista.forEach((item) => {
      const data = new Date(item.MedicaoData);
      const inicioSemana = format(startOfWeek(data, { locale: ptBR }), "dd/MM");
      const fimSemana = format(endOfWeek(data, { locale: ptBR }), "dd/MM");
      const chave = `${inicioSemana} - ${fimSemana}`;
      if (!semanas[chave]) semanas[chave] = [];
      semanas[chave].push(item);
    });
    return semanas;
  }

  // Média dos grupos
  const medias = dias.map((d) => {
    const lista = grupos[d];
    // Corrigindo: Se a lista estiver vazia, retorna 0.
    if (lista.length === 0) {
      return 0;
    }

    const media =
      lista.reduce((acc, m) => acc + Number(m.MedicaoPeso || 0), 0) /
      lista.length;
    return parseFloat(media.toFixed(2));
  });

  const chartData = {
    labels: dias.map((d) => (modoGeral ? d.split(" - ")[0] : d.split(",")[0].slice(0, 3))),
    datasets: [
      {
        data: medias,
        color: () => "#0288d1",
        strokeWidth: 2,
      },
    ],
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Botão Voltar */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#3A3A3A" />
        </TouchableOpacity>

        <Text style={styles.title}>Relatório Semanal</Text>
        <Text style={styles.subtitle}>
          {"\n"}
          {nome}{"\n"}({codigo})
        </Text>

        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              !modoGeral && styles.modeButtonActive,
            ]}
            onPress={() => setModoGeral(false)}
          >
            <Text
              style={[
                styles.modeButtonText,
                !modoGeral && styles.modeButtonTextActive,
              ]}
            >
              📅 Semana Selecionada
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, modoGeral && styles.modeButtonActive]}
            onPress={() => setModoGeral(true)}
          >
            <Text
              style={[
                styles.modeButtonText,
                modoGeral && styles.modeButtonTextActive,
              ]}
            >
              📊 Relatório Geral
            </Text>
          </TouchableOpacity>
        </View>

        {!modoGeral && (
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              📆 Semana de{" "}
              {format(startOfWeek(selectedWeek, { locale: ptBR }), "dd/MM")} até{" "}
              {format(endOfWeek(selectedWeek, { locale: ptBR }), "dd/MM")}
            </Text>
          </TouchableOpacity>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={selectedWeek}
            mode="date"
            display="default"
            onChange={handleWeekChange}
          />
        )}

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
            <Text style={styles.graphTitle}>
              {modoGeral
                ? "Média de Peso Semanal\n(Todas as Semanas)"
                : "Média de Peso Diário\n(Semana Selecionada)"}
            </Text>

            {medias.length > 0 && medias.some((v) => v > 0) ? (
              <LineChart
                data={chartData}
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
                onDataPointClick={(data) => {
                  if (!modoGeral) {
                    const diaSelecionado = dias[data.index];
                    setExpandedDay(expandedDay === diaSelecionado ? null : diaSelecionado);
                  }
                }}
              />
            ) : (
              <Text style={styles.infoText}>Nenhum dado disponível para esta semana.</Text>
            )}

            {!modoGeral &&
              dias.map((dia) => (
                <View key={dia} style={styles.blockContainer}>
                  <TouchableOpacity
                    style={[
                      styles.blockHeader,
                      expandedDay === dia && styles.blockHeaderExpanded,
                    ]}
                    onPress={() =>
                      setExpandedDay(expandedDay === dia ? null : dia)
                    }
                  >
                    <Text style={styles.blockTitle}>{dia}</Text>
                    <Text style={styles.blockToggle}>
                      {expandedDay === dia ? "▼" : "▶"}
                    </Text>
                  </TouchableOpacity>

                  {expandedDay === dia &&
                    grupos[dia].map((m, idx) => (
                      <View key={idx} style={styles.card}>
                        <Text style={styles.cardText}>
                          <Text style={styles.bold}>Hora:</Text>{" "}
                          {format(new Date(m.MedicaoData), "HH:mm")}
                        </Text>
                        <Text style={styles.cardText}>
                          <Text style={styles.bold}>Peso:</Text>{" "}
                          {m.MedicaoPeso} kg
                        </Text>
                        <Text style={styles.cardText}>
                          <Text style={styles.bold}>Status:</Text>{" "}
                          {m.MedicaoStatus}
                        </Text>
                        <Text style={styles.cardText}>
                          <Text style={styles.bold}>Local:</Text>{" "}
                          {m.MedicaoLocal || "Desconhecido"}
                        </Text>
                        <Text style={styles.cardText}>
                          <Text style={styles.bold}>Peso Máx. (%):</Text>{" "}
                          {m.MedicaoPesoMaximoPorcentagem || 0}%
                        </Text>
                        <Text style={styles.cardText}>
                          <Text style={styles.bold}>Peso a Mais:</Text>{" "}
                          {m.MedicaoPesoMais || 0} kg
                        </Text>
                      </View>
                    ))}
                </View>
              ))}
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
  container: { flex: 1, backgroundColor: "#e0f7fa" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3A3A3A",
    textAlign: "center",
    marginTop: 60,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },
  modeButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  modeButton: {
    backgroundColor: "#cfd8dc",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 6,
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: "#0288d1",
  },
  modeButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  dateButton: {
    alignSelf: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#9dadaf",
    marginBottom: 15,
  },
  dateButtonText: { fontSize: 16, color: "#333" },
  loadingContainer: { alignItems: "center", marginTop: 30 },
  errorText: { color: "red", textAlign: "center", marginTop: 20, fontSize: 16 },
  infoText: { textAlign: "center", color: "#555", marginTop: 40, fontSize: 15 },
  graphTitle: { fontSize: 18, textAlign: "center", marginBottom: 10, color: "#333" },
  graph: { alignSelf: "center", borderRadius: 10 },
  blockContainer: {
    marginHorizontal: 10,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    elevation: 2,
    overflow: "hidden",
  },
  blockHeader: {
    backgroundColor: "#e0f2f1",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  blockTitle: { fontSize: 16, fontWeight: "600", color: "#00695c" },
  blockToggle: { fontSize: 18, color: "#004d40" },
  blockHeaderExpanded: { backgroundColor: "#b2dfdb" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginVertical: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#b0bec5",
  },
  cardText: { fontSize: 15, color: "#333", marginTop: 5 },
  bold: { fontWeight: "bold" },
  bottomContainer: { position: "absolute", bottom: 0, left: 0, right: 0 },
  backButton: { position: "absolute", top: 40, left: 20 },
});

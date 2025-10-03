import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ToastAndroid, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { LINKAPI, PORTAPI } from "../utils/global";
import { validarTokens, pegarTokens } from "../utils/validacoes";

import BottomNav from "../components/BottomNav";
import SettingsModal from "../components/SettingsModal";

export default function BackpackScreen({ navigation }) {
  const [backpacks, setBackpacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);

  // Função para buscar as mochilas do usuário
  const fetchUserBackpacks = useCallback(async () => {
    try {

      const resposta = await validarTokens(0, navigation);

      if (resposta === 'true') {
      } else if (resposta === 'false') {
        return;
      } else {
        return ToastAndroid.show(resposta, ToastAndroid.SHORT);
      }

      let tokens = await pegarTokens();
      let { accessToken, refreshToken } = tokens;

      // Timeout 10s
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      //console.log(accessToken);

      const response = await fetch(`${LINKAPI}${PORTAPI}/usuarios-mochilas/usuario/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json();
        ToastAndroid.show(errorData.error || "Erro ao buscar mochilas", ToastAndroid.SHORT);
        setBackpacks([]);
        return;
      }

      const data = await response.json();

      const backpacksData = Array.isArray(data.mochilas) ? data.mochilas : [];
      //console.log(backpacksData);

      // Mapeia e formata as datas antes de armazenar
      const formattedData = backpacksData.map(item => ({
        ...item,
        DataInicioUso: item.DataInicioUso ? new Date(item.DataInicioUso) : null,
        DataFimUso: item.DataFimUso ? new Date(item.DataFimUso) : null,
      }));

      // Ordena: mochila em uso primeiro, depois as de último uso por data (mais recente primeiro)
      formattedData.sort((a, b) => {
        if (a.UsoStatus === "Usando" && b.UsoStatus !== "Usando") return -1;
        if (a.UsoStatus !== "Usando" && b.UsoStatus === "Usando") return 1;

        // Se ambos são "Último a Usar", ordena pela data de fim (ou início, se fim for nulo)
        if (a.UsoStatus === "Último a Usar" && b.UsoStatus === "Último a Usar") {
          const dateA = a.DataFimUso || a.DataInicioUso;
          const dateB = b.DataFimUso || b.DataInicioUso;
          return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
        }
        return 0; // Mantém a ordem se os status forem iguais e não forem "Último a Usar"
      });

      setBackpacks(formattedData);
    } catch (error) {
      if (error.name === "AbortError") {
        ToastAndroid.show("Servidor demorou a responder ao buscar mochilas", ToastAndroid.LONG);
        setBackpacks([]);
        return;
      } else {
        console.log(error);
        ToastAndroid.show("Erro ao conectar no servidor", ToastAndroid.LONG);
        setBackpacks([]);
        return;
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUserBackpacks();
  }, [fetchUserBackpacks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserBackpacks();
  }, [fetchUserBackpacks]);

  // Função para formatar a data
  const formatDate = (date) => {
    if (!date) return "N/A";
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  // Função para iniciar o uso de uma mochila
  const handleStartUsing = async (backpackCode) => {
    try {

      const resposta = await validarTokens(0, navigation);

      if (resposta === 'true') {
      } else if (resposta === 'false') {
        return;
      } else {
        return ToastAndroid.show(resposta, ToastAndroid.SHORT);
      }

      let tokens = await pegarTokens();
      let { accessToken, refreshToken } = tokens;

      // Endpoint para iniciar uso da mochila
      const response = await fetch(`${LINKAPI}${PORTAPI}/usuarios-mochilas/assumir/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ MochilaCodigo: backpackCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        ToastAndroid.show(errorData.error || "Erro ao iniciar uso da mochila", ToastAndroid.SHORT);
        return;
      }

      ToastAndroid.show("Iniciado uso da Mochila", ToastAndroid.SHORT);
      fetchUserBackpacks();

    } catch (error) {
      ToastAndroid.show("Erro ao conectar no servidor, tente novamente", ToastAndroid.SHORT);
      await validarTokens(0, navigation);
      return;
    }
  };

  // Função para parar o uso de uma mochila
  const handleStopUsing = async (backpackCode) => {
    try {

      const resposta = await validarTokens(0, navigation);

      if (resposta === 'true') {
      } else if (resposta === 'false') {
        return;
      } else {
        return ToastAndroid.show(resposta, ToastAndroid.SHORT);
      }

      let tokens = await pegarTokens();
      let { accessToken, refreshToken } = tokens;

      // Endpoint para parar uso da mochila
      const response = await fetch(`${LINKAPI}${PORTAPI}/usuarios-mochilas/encerrarUsoApp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ MochilaCodigo: backpackCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        ToastAndroid.show(errorData.error || "Erro ao parar uso da mochila", ToastAndroid.SHORT);
        return;
      }

      ToastAndroid.show("Finalizado uso da Mochila", ToastAndroid.SHORT);
      fetchUserBackpacks();

    } catch (error) {
      ToastAndroid.show("Erro ao conectar no servidor, tente novamente", ToastAndroid.SHORT);
      await validarTokens(0, navigation);
      return;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10, alignItems: "center", textAlign: "center"}}>Carregando mochilas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Minhas Mochilas</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {backpacks.length === 0 ? (
          <Text style={styles.noBackpacksText}>Nenhuma mochila vinculada a você.</Text>
        ) : (
          backpacks.map((backpack) => (
            <View
              key={backpack.MochilaCodigo}
              style={[
                styles.backpackCard,
                backpack.UsoStatus === "Usando" ? styles.inUseCard : styles.lastUsedCard,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.backpackName}>
                  {backpack.MochilaNome}
                </Text>
                <Text
                  style={[
                    styles.backpackStatus,
                    backpack.UsoStatus === "Usando"
                      ? { color: "#28a745" } // Verde para "Usando"
                      : { color: "#6c757d" }, // Cinza para "Último a Usar"
                  ]}
                >
                  {backpack.UsoStatus}
                </Text>
              </View>

              <Text style={styles.statusLabel}>Código: ({backpack.MochilaCodigo})</Text>

              <Text style={styles.backpackDescription}>Descrição: {backpack.MochilaDescricao}</Text>

              <Text style={styles.dateText}>
                {backpack.UsoStatus === "Usando"
                  ? `Data Início: ${formatDate(backpack.DataInicioUso)}`
                  : `Último Uso: ${formatDate(backpack.DataFimUso || backpack.DataInicioUso)}`}
              </Text>

              <View style={styles.buttonContainer}>
                {backpack.UsoStatus === "Usando" ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.stopUsingButton]}
                    onPress={() => handleStopUsing(backpack.MochilaCodigo)}
                  >
                    <Text style={styles.actionButtonText}>Parar de Usar</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.startUsingButton]}
                    onPress={() => handleStartUsing(backpack.MochilaCodigo)}
                  >
                    <Text style={styles.actionButtonText}>Começar a Usar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de Configurações */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onToggleTheme={() => setDarkTheme(!darkTheme)}
        isDarkTheme={darkTheme}
        onLogout={() => {
          setSettingsVisible(false);
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        }}
      />

      {/* Barra inferior reutilizável */}
      <BottomNav
        navigation={navigation}
        onOpenSettings={() => setSettingsVisible(true)} // passa a função
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0f7fa", // Cor de fundo semelhante ao protótipo
    paddingTop: 50, // Espaço para o botão voltar e título
  },
  loadingContainer: {
    justifyContent: 'center',
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3A3A3A",
    marginBottom: 20,
    alignItems: "center",
    textAlign: "center",
  },
  scrollView: {
    width: "100%",
    paddingHorizontal: 10,
  },
  scrollViewContent: {
    alignItems: "center",
    paddingBottom: 20, // Espaço no final da lista
  },
  noBackpacksText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 50,
  },
  backpackCard: {
    width: "95%",
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inUseCard: {
    backgroundColor: "#d4edda", // Verde claro para "Usando"
    borderWidth: 2,
    borderColor: "#28a745", // Borda verde
  },
  lastUsedCard: {
    backgroundColor: "#e2e3e5", // Cinza claro para "Último a Usar"
    borderWidth: 1,
    borderColor: "#adb5bd", // Borda cinza
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  backpackName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3A3A3A",
    flexShrink: 1, // Permite que o texto quebre linha se for longo
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'normal', // Apelido normal, descrição em negrito
    color: '#555',
  },
  backpackStatus: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  backpackDescription: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  dateText: {
    fontSize: 13,
    color: "#777",
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  startUsingButton: {
    backgroundColor: "#007bff", // Azul
  },
  stopUsingButton: {
    backgroundColor: "#dc3545", // Vermelho
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  navBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#3A3A3A",
    paddingVertical: 15,
    alignItems: "center",
  },
  navBarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
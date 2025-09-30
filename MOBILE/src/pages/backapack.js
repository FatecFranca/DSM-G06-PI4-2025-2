import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ToastAndroid, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns"; // Para formatação de datas
import { ptBR } from "date-fns/locale"; // Para formatação em português

import { LINKAPI, PORTAPI } from "../utils/global"; // Assumindo que você tem global.js

// Mock de dados para simular a API. REMOVA EM PRODUÇÃO.
const MOCK_BACKPACKS = [
  {
    UsuarioMochilaId: 101,
    UsuarioMochilaApelido: "Mochila do Dia a Dia",
    MochilaDescricao: "Mochila padrão para trabalho/estudo",
    UsuarioMochilaStatus: "Em Uso",
    UsuarioMochilaDtInicio: new Date(2023, 10, 15, 8, 30), // Mês é 0-indexado (Nov)
    UsuarioMochilaDtFim: null,
  },
  {
    UsuarioMochilaId: 102,
    UsuarioMochilaApelido: "Mochila de Viagem",
    MochilaDescricao: "Para longas viagens e aventuras",
    UsuarioMochilaStatus: "Último Uso",
    UsuarioMochilaDtInicio: new Date(2023, 9, 1, 14, 0), // Out
    UsuarioMochilaDtFim: new Date(2023, 9, 10, 18, 0),
  },
  {
    UsuarioMochilaId: 103,
    UsuarioMochilaApelido: "Mochila de Academia",
    MochilaDescricao: "Leve e prática para os treinos",
    UsuarioMochilaStatus: "Último Uso",
    UsuarioMochilaDtInicio: new Date(2023, 10, 20, 7, 0), // Nov
    UsuarioMochilaDtFim: new Date(2023, 10, 20, 9, 0),
  },
  {
    UsuarioMochilaId: 104,
    UsuarioMochilaApelido: "Mochila Antiga",
    MochilaDescricao: "Minha primeira mochila",
    UsuarioMochilaStatus: "Último Uso",
    UsuarioMochilaDtInicio: new Date(2022, 5, 1, 10, 0), // Jun
    UsuarioMochilaDtFim: new Date(2022, 5, 30, 17, 0),
  },
];


export default function BackapackScreen({ navigation }) {
  const [backpacks, setBackpacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Função para buscar as mochilas do usuário
  const fetchUserBackpacks = useCallback(async () => {
    const {accessToken} = await pegarTokens();

    if (!accessToken || accessToken === "YOUR_ACCESS_TOKEN_HERE") {
      ToastAndroid.show("Token de acesso não encontrado. Faça login novamente.", ToastAndroid.LONG);
      // navigation.navigate("Login"); // Redirecione para o login se não tiver token
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Timeout 10s
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${LINKAPI}${PORTAPI}/mochilas/usuario`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`, // Enviar o token JWT
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json();
        ToastAndroid.show(errorData.error || "Erro ao buscar mochilas", ToastAndroid.SHORT);
        setBackpacks([]); // Limpa as mochilas se houver erro
        return;
      }

      const data = await response.json();

      // Mapeia e formata as datas antes de armazenar
      const formattedData = data.map(item => ({
        ...item,
        UsuarioMochilaDtInicio: item.UsuarioMochilaDtInicio ? new Date(item.UsuarioMochilaDtInicio) : null,
        UsuarioMochilaDtFim: item.UsuarioMochilaDtFim ? new Date(item.UsuarioMochilaDtFim) : null,
      }));

      // Ordena: mochila em uso primeiro, depois as de último uso por data (mais recente primeiro)
      formattedData.sort((a, b) => {
        if (a.UsuarioMochilaStatus === "Em Uso" && b.UsuarioMochilaStatus !== "Em Uso") return -1;
        if (a.UsuarioMochilaStatus !== "Em Uso" && b.UsuarioMochilaStatus === "Em Uso") return 1;
        
        // Se ambos são "Último Uso", ordena pela data de fim (ou início, se fim for nulo)
        if (a.UsuarioMochilaStatus === "Último Uso" && b.UsuarioMochilaStatus === "Último Uso") {
          const dateA = a.UsuarioMochilaDtFim || a.UsuarioMochilaDtInicio;
          const dateB = b.UsuarioMochilaDtFim || b.UsuarioMochilaDtInicio;
          return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
        }
        return 0; // Mantém a ordem se os status forem iguais e não forem "Último Uso"
      });

      setBackpacks(formattedData);
    } catch (error) {
      if (error.name === "AbortError") {
        ToastAndroid.show("Servidor demorou a responder ao buscar mochilas", ToastAndroid.LONG);
      } else {
        ToastAndroid.show("Erro ao conectar no servidor: " + error.message, ToastAndroid.LONG);
      }
      setBackpacks([]);
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
  const handleStartUsing = async (backpackId) => {
    // --- Substitua com a lógica para obter seu token de acesso real ---
    const accessToken = "YOUR_ACCESS_TOKEN_HERE"; // COLOQUE SEU TOKEN AQUI!

    try {
      // Endpoint para iniciar uso da mochila (ex: PUT /usuarios-mochilas/:id/usar)
      const response = await fetch(`${LINKAPI}${PORTAPI}/usuarios-mochilas/${backpackId}/usar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        // body: JSON.stringify({ /* talvez algum dado adicional seja necessário */ }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        ToastAndroid.show(errorData.error || "Erro ao iniciar uso da mochila", ToastAndroid.SHORT);
        return;
      }

      ToastAndroid.show("Mochila agora em uso!", ToastAndroid.SHORT);
      fetchUserBackpacks(); // Recarrega a lista para atualizar o estado
    } catch (error) {
      ToastAndroid.show("Erro ao conectar no servidor", ToastAndroid.SHORT);
    }
  };

  // Função para parar o uso de uma mochila
  const handleStopUsing = async (backpackId) => {
    // --- Substitua com a lógica para obter seu token de acesso real ---
    const accessToken = "YOUR_ACCESS_TOKEN_HERE"; // COLOQUE SEU TOKEN AQUI!

    try {
      // Endpoint para parar uso da mochila (ex: PUT /usuarios-mochilas/:id/parar)
      const response = await fetch(`${LINKAPI}${PORTAPI}/usuarios-mochilas/${backpackId}/parar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        // body: JSON.stringify({ /* talvez algum dado adicional seja necessário */ }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        ToastAndroid.show(errorData.error || "Erro ao parar uso da mochila", ToastAndroid.SHORT);
        return;
      }

      ToastAndroid.show("Mochila não está mais em uso.", ToastAndroid.SHORT);
      fetchUserBackpacks(); // Recarrega a lista para atualizar o estado
    } catch (error) {
      ToastAndroid.show("Erro ao conectar no servidor", ToastAndroid.SHORT);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Carregando mochilas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Botão Voltar (se necessário, aqui é para a stack de navegação) */}
      {/*}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      >
        <Ionicons name="arrow-back" size={28} color="#3A3A3A" />
      </TouchableOpacity>
      {*/}

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
              key={backpack.UsuarioMochilaId}
              style={[
                styles.backpackCard,
                backpack.UsuarioMochilaStatus === "Em Uso" ? styles.inUseCard : styles.lastUsedCard,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.backpackName}>
                  {backpack.UsuarioMochilaApelido}
                  <Text style={styles.statusLabel}> ({backpack.MochilaDescricao})</Text>
                </Text>
                <Text
                  style={[
                    styles.backpackStatus,
                    backpack.UsuarioMochilaStatus === "Em Uso"
                      ? { color: "#28a745" } // Verde para "Em Uso"
                      : { color: "#6c757d" }, // Cinza para "Último Uso"
                  ]}
                >
                  {backpack.UsuarioMochilaStatus}
                </Text>
              </View>

              <Text style={styles.backpackDescription}>{backpack.MochilaDescricao}</Text>
              
              <Text style={styles.dateText}>
                {backpack.UsuarioMochilaStatus === "Em Uso"
                  ? `Data Início: ${formatDate(backpack.UsuarioMochilaDtInicio)}`
                  : `Último Uso: ${formatDate(backpack.UsuarioMochilaDtFim || backpack.UsuarioMochilaDtInicio)}`}
              </Text>

              <View style={styles.buttonContainer}>
                {backpack.UsuarioMochilaStatus === "Em Uso" ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.stopUsingButton]}
                    onPress={() => handleStopUsing(backpack.UsuarioMochilaId)}
                  >
                    <Text style={styles.actionButtonText}>Parar de Usar</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.startUsingButton]}
                    onPress={() => handleStartUsing(backpack.UsuarioMochilaId)}
                  >
                    <Text style={styles.actionButtonText}>Começar a Usar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Navegação Inferior (Nav Bar) - Opcional, dependendo da sua arquitetura */}
      {/* <View style={styles.navBar}>
        <Text style={styles.navBarText}>Nav Bar</Text>
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0f7fa", // Cor de fundo semelhante ao protótipo
    alignItems: "center",
    paddingTop: 60, // Espaço para o botão voltar e título
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
    backgroundColor: "#d4edda", // Verde claro para "Em Uso"
    borderWidth: 2,
    borderColor: "#28a745", // Borda verde
  },
  lastUsedCard: {
    backgroundColor: "#e2e3e5", // Cinza claro para "Último Uso"
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
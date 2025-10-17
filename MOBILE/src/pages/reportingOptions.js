import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import BottomNav from "../components/BottomNav";
import SettingsModal from "../components/SettingsModal";

export default function ReportingOptionsScreen({ navigation, route }) {
  const { codigo, nome } = route.params; // recebe o código da mochila

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);

  const relatorios = [
    { titulo: "Diário", rota: "dailyReport" },
    { titulo: "Semanal", rota: "weeklyReport" },
    { titulo: "Mensal", rota: "RelatorioMensal" },
    { titulo: "Anual", rota: "RelatorioAnual" },
    { titulo: "Por Período", rota: "RelatorioPorPeriodo" },
    { titulo: "Dias de Maior e Menor Peso", rota: "RelatorioMaisMenosPeso" },
  ];

  const handleNavegar = (rota) => {
    navigation.navigate(rota, { codigo: codigo, nome: nome });
  };

  return (
    <View style={styles.container}>
      {/* Botão Voltar */}
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
      
      <Text style={styles.title}>Escolha o Tipo de Relatório</Text>
      <Text style={styles.subtitle}>{nome}{"\n"}({codigo})</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {relatorios.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionButton}
            onPress={() => handleNavegar(item.rota)}
          >
            <Text style={styles.optionText}>{item.titulo}</Text>
          </TouchableOpacity>
        ))}
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
        onOpenSettings={() => setSettingsVisible(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0f7fa",
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3A3A3A",
    textAlign: "center",
    marginBottom: 10,
    marginTop: 25,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },
  scrollView: {
    width: "100%",
    paddingHorizontal: 20,
  },
  scrollViewContent: {
    alignItems: "center",
    paddingBottom: 30,
  },
  optionButton: {
    width: "100%",
    backgroundColor: "#fbfffbff",
    borderRadius: 15,
    paddingVertical: 18,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    borderWidth: 2,
    borderColor: "#aafdaaff",
  },
  optionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3A3A3A",
  },
  backButton: { position: "absolute", top: 40, left: 20 },
});

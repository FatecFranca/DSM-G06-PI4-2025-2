import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ToastAndroid, ScrollView, RefreshControl, ActivityIndicator } from "react-native";

import { LINKAPI, PORTAPI } from "../utils/global";
import { validarTokens, pegarTokens } from "../utils/validacoes";

import BottomNav from "../components/BottomNav";
import SettingsModal from "../components/SettingsModal";

export default function BackpackScreen({ navigation }) {

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Escolha o Tipo de Relatório</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        
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
    backgroundColor: "#e0f7fa",
    paddingTop: 50,
  },
  loadingContainer: {
    justifyContent: 'center',
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
    paddingBottom: 20,
  },
});
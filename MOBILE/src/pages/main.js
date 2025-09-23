import React, { useEffect, useContext } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, ToastAndroid } from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { delay } from "../utils/validacoes";
import { LINKAPI, PORTAPI } from "@env";

export default function MainScreen({ navigation }) {
  const { accessToken, refreshToken, salvarTokens, limparTokens } = useContext(AuthContext);

  const validarEntrada = async () => {
    try {

      await delay(1000); // Simula loading

      if (!accessToken) {
        navigation.replace("login");
        return;
      }

      // 1. Valida accessToken
      let response = await fetch(LINKAPI + PORTAPI + "/tokenJWT/validarToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        navigation.replace("home");
        return;
      }

      // 2. Se expirado, tenta refresh
      if (refreshToken) {
        response = await fetch(LINKAPI + PORTAPI + "/tokenJWT/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          await salvarTokens(data.accessToken, data.refreshToken);
          navigation.replace("home");
          return;
        }
      }

      // 3. Se falhou
      await limparTokens();
      ToastAndroid.show("Sessão expirada, faça login novamente", ToastAndroid.SHORT);
      delay(2000);
      navigation.replace("login");
    } catch (error) {
      console.error("Erro ao validar tokens:", error);
      ToastAndroid.show("Erro ao validar sessão", ToastAndroid.SHORT);
      navigation.replace("login");
    }
  };

  useEffect(() => {
    validarEntrada();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Image
          source={require("../assets/mochila-PI-sem-fundo.png")} // coloque sua imagem aqui
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>MOCHILA{"\n"}INTELIGENTE</Text>
      </View>

      {/* Enquanto valida → loading */}
      <ActivityIndicator size="large" color="#00C200" style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#B6F5C0",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#00C200",
  },
});

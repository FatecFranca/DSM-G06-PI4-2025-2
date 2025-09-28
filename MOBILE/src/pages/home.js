import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, ScrollView, BackHandler } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Progress from "react-native-progress";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function HomeScreen({ navigation }) {

  useEffect(() => {
    const backAction = () => {
      BackHandler.exitApp()
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove(); // limpa o listener ao sair da tela
  }, []);


  const pesoMaximo = 50;
  const pessoa = "mochileiro.png";
  const pesoEsquerdo = 10;
  const pesoDireito = 11;
  const pesoTotal = pesoEsquerdo + pesoDireito;

  const percEsquerdo = pesoEsquerdo / pesoTotal;
  const percDireito = pesoDireito / pesoTotal;

  const dataUltimaAtualizacao = new Date("2024-10-10T14:40:00"); // Exemplo fixo

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Parte de cima com imagem */}
        <View style={styles.topContainer}>
          <Text style={{ color: "#00000", fontWeight: "600", fontSize: 25, marginBottom: 30 }}>
            Peso em Tempo Real
          </Text>
          <Image
            source={require("../assets/" + pessoa)}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Indicador circular */}
        <View style={styles.middleContainer}>
          <Progress.Circle
            style={styles.circleWrapper}
            size={180}
            thickness={20}
            progress={pesoTotal / pesoMaximo}
            showsText={true}
            color={"#f44336"}
            unfilledColor={"#4CAF50"}
            borderWidth={0}
            formatText={() =>
              `${Math.round((pesoTotal / pesoMaximo) * 100)}% \n ${pesoTotal} Kg`
            }
            textStyle={{
              fontSize: 22,
              textAlign: "center",
              fontWeight: "bold",
            }}
          />

          {/* Barra personalizada para comparação */}
          <View style={styles.barraContainer}>
            <View
              style={[
                styles.barraEsquerda,
                { flex: percEsquerdo },
              ]}
            />
            <View
              style={[
                styles.barraDireita,
                { flex: percDireito },
              ]}
            />
          </View>

          {/* Labels */}
          <View style={styles.labels}>
            <Text style={{ color: "#FF7043", fontWeight: "600" }}>
              Esquerdo: {Math.round(percEsquerdo * 100)}% ({pesoEsquerdo} Kg)
            </Text>
            <Text style={{ color: "#4CAF50", fontWeight: "600" }}>
              Direito: {Math.round(percDireito * 100)}% ({pesoDireito} Kg)
            </Text>
          </View>

          <Text style={{ color: "#00000", fontWeight: "600", fontSize: 18, marginTop: 35 }}>
            Atualizado {dataUltimaAtualizacao.toLocaleString()}
          </Text>

        </View>
      </ScrollView>

      {/* Barra inferior */}
      <View style={styles.bottomNav}>
        <Ionicons name="person" size={28} color="black" />
        <MaterialIcons name="backpack" size={28} color="black" />
        <Ionicons name="home" size={28} color="black" />
        <Ionicons name="stats-chart" size={28} color="black" />
        <Ionicons name="settings" size={28} color="black" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  topContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  image: {
    width: 250,
    height: 250,
  },
  middleContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    width: "100%",
  },
  circleWrapper: {
    marginBottom: 20,
  },
  barraContainer: {
    flexDirection: "row",
    width: "90%",
    height: 25,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 20,
  },
  barraEsquerda: {
    backgroundColor: "#FF7043",
  },
  barraDireita: {
    backgroundColor: "#4CAF50",
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 8,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
});

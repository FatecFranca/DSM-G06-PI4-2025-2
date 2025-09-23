import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ToastAndroid } from "react-native";
import { validarEmail, validarSenha } from "../utils/validacoes";

export default function HomeScreen({ navigation }) {

  const validarEntrada = async () => {

    try {
      

    } catch (error) {
      
    }
  };

  return (
    <View style={styles.container}>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#B6F5C0", // Fundo verde claro
    justifyContent: "center",
    alignItems: "center",
  },
});

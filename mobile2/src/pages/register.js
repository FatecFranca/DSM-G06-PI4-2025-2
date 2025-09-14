import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [dtNascimento, setDtNascimento] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sexo, setSexo] = useState("");

  const handleConfirmar = () => {
    console.log({
      nome,
      email,
      senha,
      peso,
      altura,
      dtNascimento,
      sexo,
    });
    // Aqui você faria a chamada à API
  };

  const login = () => {
    navigation.navigate("login");
  };

  return (
    <View style={styles.container}>
      {/* Botão Voltar */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#3A3A3A" />
      </TouchableOpacity>

      <View style={styles.box}>
        <Text style={styles.title}>CADASTRAR-SE</Text>

        <TextInput
          style={styles.input}
          placeholder="INFORME SEU NOME"
          placeholderTextColor="#3A3A3A"
          value={nome}
          maxLength={100}
          onChangeText={setNome}
        />

        <TextInput
          style={styles.input}
          placeholder="INFORME SEU E-MAIL"
          placeholderTextColor="#3A3A3A"
          value={email}
          maxLength={256}
          keyboardType="email-address"
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="INFORME SUA SENHA"
          placeholderTextColor="#3A3A3A"
          secureTextEntry
          value={senha}
          maxLength={16}
          onChangeText={setSenha}
        />

        <View style={{ flexDirection: "row" }}>
          <TextInput
            style={styles.input_metade}
            placeholder="PESO (Kg)"
            placeholderTextColor="#3A3A3A"
            value={peso}
            keyboardType="numeric"
            onChangeText={(text) => {
              // só permite até 2 casas decimais
              const regex = /^\d*\.?\d{0,2}$/;
              if (regex.test(text)) setPeso(text);
            }}
          />

          <TextInput
            style={styles.input_metade}
            placeholder="ALTURA (m)"
            placeholderTextColor="#3A3A3A"
            value={altura}
            keyboardType="numeric"
            onChangeText={(text) => {
              const regex = /^\d*\.?\d{0,2}$/;
              if (regex.test(text)) setAltura(text);
            }}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity
            style={[styles.input_metade, { justifyContent: "center" }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ textAlign: "center", color: "#000" }}>
              {dtNascimento.toLocaleDateString("pt-BR")}
            </Text>
          </TouchableOpacity>

          <View style={[styles.input_metade, { padding: 0 }]}>
            <Picker
              selectedValue={sexo}
              style={{ height: 50, width: "100%" }}
              onValueChange={(itemValue) => setSexo(itemValue)}
            >
              <Picker.Item label="Selecione o sexo" value="" />
              <Picker.Item label="Masculino" value="Masculino" />
              <Picker.Item label="Feminino" value="Feminino" />
              <Picker.Item label="Outro" value="Outro" />
              <Picker.Item label="Prefiro não dizer" value="Prefiro não dizer" />
            </Picker>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={dtNascimento}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDtNascimento(selectedDate);
            }}
          />
        )}

        <TouchableOpacity style={styles.button} onPress={handleConfirmar}>
          <Text style={styles.buttonText}>CONFIRMAR</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={login}>
          <Text style={styles.link}>JÁ POSSUI UMA CONTA? ENTRE</Text>
        </TouchableOpacity>
      </View>
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
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
  },
  box: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: "85%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF5C8D", // Rosa
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#9FFBF7", // Azul claro
    width: "100%",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    textAlign: "center",
    color: "#000",
  },
  input_metade: {
    backgroundColor: "#9FFBF7", // Azul claro
    width: "48%",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    marginLeft: 5,
    marginRight: 5,
    textAlign: "center",
    color: "#000",
  },
  button: {
    backgroundColor: "#5CFF5C", // Verde neon
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginVertical: 15,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
  },
  link: {
    fontSize: 13,
    color: "#3A3A3A",
    marginTop: 5,
  },
});

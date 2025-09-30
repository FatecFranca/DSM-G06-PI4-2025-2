import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ToastAndroid, ScrollView, KeyboardAvoidingView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import { validarEmail, validarSenha, diferencaEntreDatas, delay, pegarTokens, salvarTokens, limparTokens, } from "../utils/validacoes";

import BottomNav from "../components/BottomNav";
import SettingsModal from "../components/SettingsModal";

import { LINKAPI, PORTAPI } from "../utils/global";

export default function ProfileScreen({ navigation }) {

    const [settingsVisible, setSettingsVisible] = useState(false);
    const [darkTheme, setDarkTheme] = useState(false);

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [nome, setNome] = useState("");
    const [peso, setPeso] = useState("");
    const [altura, setAltura] = useState("");
    const [dtNascimento, setDtNascimento] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [sexo, setSexo] = useState("");

    useEffect(() => {
        bucarDados();
    }, []);

    // Buscar os dados do usuário
    const bucarDados = async () => {
        try {

            // Timeout 3s
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            let tokens = await pegarTokens();
            let { accessToken, refreshToken } = tokens;

            if (!accessToken || !refreshToken) {
                console.log("Tokens ausentes");
                await limparTokens();
                navigation.reset({
                    index: 0,
                    routes: [{ name: "login" }],
                });
                return;
            }

            // 1. Valida accessToken
            let response = await fetch(LINKAPI + PORTAPI + "/usuarios/id", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    signal: controller.signal,
                },
            });

            clearTimeout(timeout);

            let data;

            if (!response.ok) {

                // 2. Se expirado, tenta refresh
                response = await fetch(LINKAPI + PORTAPI + "/token/refresh", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: "Bearer " + refreshToken }),
                });

                if (response.ok) {
                    data = await response.json();
                    await salvarTokens(data.accessToken, refreshToken);
                    console.log("Access Token: " + data.accessToken);
                    console.log("Refresh Token: " + refreshToken);
                    response = await fetch(LINKAPI + PORTAPI + "/usuarios/id", {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${String(data.accessToken)}`,
                        },
                    });

                    if (!response.ok) {
                        console.log("Falha ao obter dados do usuário");
                        await limparTokens();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: "login" }],
                        });
                        return;
                    }

                } else {
                    console.log("Falha ao renovar token");
                    await limparTokens();
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "login" }],
                    });
                    return;
                }
            }

            tokens = await pegarTokens();

            accessToken = tokens.accessToken;

            data = await response.json();

            const pesoFor = data.usuario.UsuarioPeso.replace('.', ',');
            const alturaFor = data.usuario.UsuarioAltura.replace('.', ',');

            setAltura(alturaFor);
            setPeso(pesoFor);
            setDtNascimento(new Date(data.usuario.UsuarioDtNascimento));
            setEmail(data.usuario.UsuarioEmail);
            setNome(data.usuario.UsuarioNome);
            setSexo(data.usuario.UsuarioSexo);

        } catch {
            if (error.name === "AbortError") {
                return ToastAndroid.show("Servidor demorou a responder", ToastAndroid.SHORT);
            } else {
                ToastAndroid.show("Erro ao conectar no servidor", ToastAndroid.SHORT);
                console.log(error);
                await limparTokens();
                navigation.reset({
                    index: 0,
                    routes: [{ name: "login" }],
                });
                return;
            }
        }
    }

    const handleConfirmar = async () => {

        const pesoParaAPI = peso.replace(',', '.');
        const alturaParaAPI = altura.replace(',', '.');

        let tokens = await pegarTokens();
        let { accessToken, refreshToken } = tokens;

        // Nome
        if (!nome || nome.trim() === "") {
            ToastAndroid.show("Nome é obrigatório", ToastAndroid.SHORT);
            return;
        }
        if (nome.trim().length < 3 || nome.trim().length > 100) {
            ToastAndroid.show("Nome deve ter entre 3 e 100 caracteres", ToastAndroid.SHORT);
            return;
        }

        // E-mail
        if (!email) {
            ToastAndroid.show("E-mail é obrigatório", ToastAndroid.SHORT);
            return;
        }
        if (!validarEmail(email)) {
            ToastAndroid.show("E-mail inválido", ToastAndroid.SHORT);
            return;
        }
        if (email.length > 256) {
            ToastAndroid.show("E-mail deve ter no máximo 256 caracteres", ToastAndroid.SHORT);
            return;
        }

        // Senha
        if (senha || senha.trim() !== "") {
            const senhaValidada = await validarSenha(senha);

            if (!senhaValidada.valido) {
                ToastAndroid.show(senhaValidada.erro, ToastAndroid.SHORT);
                return;
            }
        }

        // Data de nascimento
        if (!dtNascimento) {
            ToastAndroid.show("Data de nascimento é obrigatória", ToastAndroid.SHORT);
            return;
        }
        const idade = diferencaEntreDatas(dtNascimento, new Date(), "anos", false);
        if (idade < 3) {
            ToastAndroid.show("Usuário deve ter pelo menos 3 anos", ToastAndroid.SHORT);
            return;
        }

        // Peso
        if (!pesoParaAPI) {
            ToastAndroid.show("Peso é obrigatório", ToastAndroid.SHORT);
            return;
        }
        if (Number(pesoParaAPI) < 9) {
            ToastAndroid.show("Peso mínimo para carregar mochila é 9kg", ToastAndroid.SHORT);
            return;
        }

        // Altura
        if (!alturaParaAPI) {
            ToastAndroid.show("Altura é obrigatória", ToastAndroid.SHORT);
            return;
        }
        if (Number(alturaParaAPI) < 0.8) {
            ToastAndroid.show("Altura mínima é 0,80 m", ToastAndroid.SHORT);
            return;
        }

        // Sexo
        if (!sexo) {
            ToastAndroid.show("Selecione o sexo", ToastAndroid.SHORT);
            return;
        }

        try {
            // Timeout 3s
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(LINKAPI + PORTAPI + "/usuarios", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    UsuarioNome: nome,
                    UsuarioEmail: email,
                    UsuarioSenha: senha,
                    UsuarioDtNascimento: dtNascimento,
                    UsuarioPeso: pesoParaAPI,
                    UsuarioAltura: alturaParaAPI,
                    UsuarioSexo: sexo,
                    UsuarioFoto: null,
                    UsuarioPesoMaximoPorcentagem: null
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errorData = await response.json();
                ToastAndroid.show(errorData.error || "Erro ao alterar os dados", ToastAndroid.SHORT);
                return;
            }

            const data = await response.json();
            return ToastAndroid.show("Dados alterados com sucesso!", ToastAndroid.SHORT);

        } catch (error) {
            if (error.name === "AbortError") {
                return ToastAndroid.show("Servidor demorou a responder", ToastAndroid.SHORT);
            } else {
                return ToastAndroid.show("Erro ao conectar no servidor", ToastAndroid.SHORT);
            }
        }
    };

    const handleExcluir = async () => {

        // Senha
        if (!senha || senha.trim() === "") {
            ToastAndroid.show("Senha é obrigatória para exclusão", ToastAndroid.SHORT);
            return;
        }

        try {
            // Timeout 3s
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            let tokens = await pegarTokens();
            let { accessToken, refreshToken } = tokens;

            const response = await fetch(LINKAPI + PORTAPI + "/usuarios", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    UsuarioSenha: senha
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errorData = await response.json();
                ToastAndroid.show(errorData.error || "Erro ao excluir conta", ToastAndroid.SHORT);
                return;
            }

            // const data = await response.json();

            // Remove tokens antes de resetar
            await limparTokens();

            // Redireciona para login
            navigation.reset({
                index: 0,
                routes: [{ name: "login" }],
            });

            ToastAndroid.show("Conta excluida com sucesso!", ToastAndroid.SHORT)

            delay(2000);

            return;

        } catch (error) {
            if (error.name === "AbortError") {
                return ToastAndroid.show("Servidor demorou a responder", ToastAndroid.SHORT);
            } else {
                console.log(error);
                return ToastAndroid.show("Erro ao conectar no servidor", ToastAndroid.SHORT);
            }
        }
    };

    return (
        <View style={styles.container}>

            {/* ScrollView e box de conteúdo para evitar problemas com teclado e BottomNav */}
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.box}>
                    <Text style={styles.title}>ALTERAR DADOS</Text>

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
                                // Permite dígitos, opcionalmente seguidos por vírgula e até 2 casas decimais.
                                const regex = /^\d*\,?\d{0,2}$/;
                                // Se o usuário apagar tudo, aceita string vazia.
                                if (regex.test(text) || text === "") setPeso(text);
                            }}
                        />

                        <TextInput
                            style={styles.input_metade}
                            placeholder="ALTURA (m)"
                            placeholderTextColor="#3A3A3A"
                            value={altura}
                            keyboardType="numeric"
                            onChangeText={(text) => {
                                // Permite dígitos, opcionalmente seguidos por vírgula e até 2 casas decimais.
                                const regex = /^\d*\,?\d{0,2}$/;
                                // Se o usuário apagar tudo, aceita string vazia.
                                if (regex.test(text) || text === "") setAltura(text);
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
                                <Picker.Item label="Sexo" value="" />
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

                    <TouchableOpacity style={styles.buttonDanger} onPress={handleExcluir}>
                        <Text style={styles.buttonText}>EXCLUIR CONTA</Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>

            {/* Modal de Configurações - Fica FORA do ScrollView */}
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

            {/* Barra inferior reutilizável - Fica FORA do ScrollView */}
            <BottomNav
                navigation={navigation}
                onOpenSettings={() => setSettingsVisible(true)} // passa a função
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // Estilo do container da Home
        paddingTop: 50,
        flex: 1,
        backgroundColor: "#b6f5e7ff", // Usamos branco (igual a Home)
    },
    scrollContainer: {
        // Estilo para o conteúdo dentro do ScrollView
        alignItems: "center",
        paddingBottom: 100, // Adiciona espaço extra para a barra inferior
        paddingTop: 20, // Adiciona um pequeno padding no topo
    },
    // O backButton não é mais necessário, mas se quiser mantê-lo:
    // backButton: { position: "absolute", top: 40, left: 20 }, 
    box: {
        backgroundColor: "#fff", // Usando o verde claro que estava no container
        borderRadius: 20,
        padding: 30,
        width: "85%",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        // Adicione margem para centralizar o box verticalmente na tela, se desejar
        marginVertical: 30,
    },
    // Restante dos estilos (input, button, etc.) mantidos.
    title: { fontSize: 20, fontWeight: "bold", color: "#FF5C8D", marginBottom: 20 },
    input: {
        backgroundColor: "#9FFBF7",
        width: "100%",
        padding: 12,
        borderRadius: 10,
        marginBottom: 15,
        textAlign: "center",
        color: "#000",
    },
    input_metade: {
        backgroundColor: "#9FFBF7",
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
        backgroundColor: "#5CFF5C",
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 12,
        marginVertical: 15,
        width: "100%",
        alignItems: "center",
        borderColor: "#5CFF5C",
        borderWidth: 2,
    },
    buttonDanger: {
        backgroundColor: "#fff",
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 12,
        marginVertical: 1,
        width: "100%",
        alignItems: "center",
        borderColor: "red",
        borderWidth: 2,
    },
    buttonText: { fontWeight: "bold", fontSize: 16, color: "#000" },
    link: { fontSize: 13, color: "#3A3A3A", marginTop: 5 },
});
import * as SecureStore from "expo-secure-store";

export function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validarSenha(senha) {
  if (senha.length < 8 || senha.length > 16) {
    return { valido: false, erro: "A senha deve ter de 8 à 16 caracteres." };
  }

  const qtdMaiusculas = (senha.match(/[A-Z]/g) || []).length;
  const qtdMinusculas = (senha.match(/[a-z]/g) || []).length;
  const qtdNumeros = (senha.match(/[0-9]/g) || []).length;
  const qtdEspeciais = (senha.match(/[^A-Za-z0-9]/g) || []).length;

  if (qtdMaiusculas < 2) {
    return { valido: false, erro: "A senha deve ter pelo menos 2 letras maiúsculas." };
  }
  if (qtdMinusculas < 2) {
    return { valido: false, erro: "A senha deve ter pelo menos 2 letras minúsculas." };
  }
  if (qtdNumeros < 2) {
    return { valido: false, erro: "A senha deve ter pelo menos 2 números." };
  }
  if (qtdEspeciais < 2) {
    return { valido: false, erro: "A senha deve ter pelo menos 2 caracteres especiais." };
  }

  return { valido: true, mensagem: "Senha válida!" };
}

// Calcula a diferença entre duas datas em dias, semanas, meses ou anos
// O parâmetro `decimal` define se o resultado será decimal (true) ou inteiro arredondado para baixo (false)
export function diferencaEntreDatas(data1, data2, unidade, decimal) {
  const inicio = new Date(data1);
  const fim = new Date(data2);

  if (isNaN(inicio) || isNaN(fim)) {
    return false; // datas inválidas
  }

  // Diferença em milissegundos
  const diffMs = Math.abs(fim - inicio);

  switch (unidade.toLowerCase()) {
    case "dias": {
      const dias = diffMs / (1000 * 60 * 60 * 24);
      return decimal ? dias : Math.floor(dias);
    }

    case "semanas": {
      const semanas = diffMs / (1000 * 60 * 60 * 24 * 7);
      return decimal ? semanas : Math.floor(semanas);
    }

    case "meses": {
      // Diferença em meses aproximada com dias
      const anos = fim.getFullYear() - inicio.getFullYear();
      const meses = fim.getMonth() - inicio.getMonth();
      const dias = fim.getDate() - inicio.getDate();

      let totalMeses = anos * 12 + meses + dias / 30.4375; // 30.4375 = média de dias por mês
      return decimal ? totalMeses : Math.floor(totalMeses);
    }

    case "anos": {
      // Diferença em anos considerando meses e dias
      const anos = fim.getFullYear() - inicio.getFullYear();
      const meses = fim.getMonth() - inicio.getMonth();
      const dias = fim.getDate() - inicio.getDate();

      let totalAnos = anos + meses / 12 + dias / 365.25; // 365.25 = média de dias por ano (considera bissextos)
      return decimal ? totalAnos : Math.floor(totalAnos);
    }

    default:
      return false;
  }
}

// Salvar tokens
export async function salvarTokens(accessToken, refreshToken) {
  await SecureStore.setItemAsync("accessToken", String(accessToken));
  await SecureStore.setItemAsync("refreshToken", String(refreshToken));
}

// Buscar tokens
export async function pegarTokens() {
  const accessToken = await SecureStore.getItemAsync("accessToken");
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  return { accessToken, refreshToken };
}

// Remover tokens (logout)
export async function limparTokens() {
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
}

export function roundTo2(value) {
  return Math.round(value * 100) / 100; // garante 2 casas
}

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

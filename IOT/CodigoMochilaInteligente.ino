#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "HX711.h"
#include "mbedtls/pk.h"
#include "mbedtls/md.h"
#include "mbedtls/base64.h"
#include "mbedtls/entropy.h"
#include "mbedtls/ctr_drbg.h"

// ====== CONFIGURAÇÃO DE REDE ======
// Redundancia de redes Wi-Fi // Em produção seria somente 1 rede
const char* WIFI_SSID1 = "WIFI1";
const char* WIFI_PASSWORD1 = "SENHA1";

const char* WIFI_SSID2 = "WIFI22";
const char* WIFI_PASSWORD2 = "SENHA2";

const char* WIFI_SSID3 = "WIFI3";
const char* WIFI_PASSWORD3 = "SENHA3";

// ====== ENDPOINTS DA API ======
String apiList[] = {
  "http://172.203.17.144:3001" // VM
};
int apiIndex = 0;

const char* ROTA_LOGIN   = "/mochilas/loginMochila";
const char* ROTA_MEDICAO = "/medicoes";
const char* ROTA_REFRESH = "/token/refresh";

// ====== CHAVE PRIVADA ======
const char* PRIVATE_KEY_PEM = R"KEY(
-----BEGIN PRIVATE KEY-----
CAHAVE AQUI
-----END PRIVATE KEY-----
)KEY";

// ====== DADOS DA MOCHILA ======
String mochilaCodigo = "nopao4Fbm1DW";

// ====== VARIÁVEIS GLOBAIS ======
String accessToken = "";
String refreshToken = "";
unsigned long ultimoEnvio = 0;
const unsigned long intervaloEnvio = 30000; // 30s

// limites e thresholds
const float MAX_ALLOWED_WEIGHT = 999.99; // limite do banco (NUMERIC(5,2))
const float MIN_SENDABLE_WEIGHT = 0.00;  // abaixo disso é considerado ruído e não será enviado

// ====== HX711 (balanças) ======
#define DT_ESQ 4
#define SCK_ESQ 5
#define DT_DIR 6
#define SCK_DIR 7

HX711 balancaEsq;
HX711 balancaDir;

// ====== FILTRAGEM (média móvel simples) ======
const int MA_WINDOW = 10;
float bufferEsq[MA_WINDOW];
float bufferDir[MA_WINDOW];
int bufferPos = 0;
bool bufferFilled = false;

float movingAverageEsq(float value) {
  bufferEsq[bufferPos] = value;
  float sum = 0.0;
  int count = bufferFilled ? MA_WINDOW : (bufferPos + 1);
  for (int i = 0; i < count; i++) sum += bufferEsq[i];
  return sum / count;
}
float movingAverageDir(float value) {
  bufferDir[bufferPos] = value;
  float sum = 0.0;
  int count = bufferFilled ? MA_WINDOW : (bufferPos + 1);
  for (int i = 0; i < count; i++) sum += bufferDir[i];
  return sum / count;
}
void advanceBufferPos() {
  bufferPos++;
  if (bufferPos >= MA_WINDOW) {
    bufferPos = 0;
    bufferFilled = true;
  }
}

// ====== FUNÇÕES PROTÓTIPO ======
void conectarWiFi();
bool loginMochila();
bool enviarMedicao(float peso, String local);
bool renovarToken();
String gerarAssinatura(String mensagem, String chavePrivada);
String gerarTimestampISO8601();

// ====== SETUP ======
void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("\n=== Inicializando ESP32-C3 ===");

  // Inicializa balanças
  balancaEsq.begin(DT_ESQ, SCK_ESQ);
  balancaDir.begin(DT_DIR, SCK_DIR);

  // Ajuste os fatores abaixo conforme sua calibração
  balancaEsq.set_scale(45100.0);  // calibrar depois (valor de exemplo)
  balancaEsq.tare();
  balancaDir.set_scale(45500.0);  // calibrar depois (valor de exemplo)
  balancaDir.tare();

  // inicializa buffers de média móvel com zeros
  for (int i = 0; i < MA_WINDOW; i++) {
    bufferEsq[i] = 0.0;
    bufferDir[i] = 0.0;
  }
  bufferPos = 0;
  bufferFilled = false;

  conectarWiFi();

  Serial.println("\n🔧 Fazendo login inicial...");
  if (loginMochila()) Serial.println("🚀 Mochila autenticada!");
  else Serial.println("❌ Falha ao autenticar mochila.");
}

// ====== LOOP ======
void loop() {
  if (millis() - ultimoEnvio >= intervaloEnvio) {
    ultimoEnvio = millis();

    // Lê algumas amostras e usa média por baixo-nível do HX711
    // get_units(n) já faz média interna; mantemos e aplicamos média móvel por cima
    float leituraEsq = 0.0;
    float leituraDir = 0.0;

    // Verifica se módulos estão prontos (opcional, algumas libs têm is_ready)
    // Faz leituras
    leituraEsq = balancaEsq.get_units(10);
    leituraDir = balancaDir.get_units(10);

    // Aplica média móvel para suavizar ruido
    float avgEsq = leituraEsq; //movingAverageEsq(leituraEsq);
    float avgDir = leituraDir; //movingAverageDir(leituraDir);
    advanceBufferPos();

    Serial.printf("\n📦 Peso Esquerda (raw %.2f -> avg %.2f) | Peso Direita (raw %.2f -> avg %.2f)\n",
                  leituraEsq, avgEsq, leituraDir, avgDir);

    // Envia somente se válido (função fará validações finais)
    enviarMedicao(avgEsq, "esquerda");
    enviarMedicao(avgDir, "direita");
  }
}

// ====== CONECTAR WIFI (com múltiplas tentativas e limpeza) ======
void conectarWiFi() {
  const char* redes[][2] = {
    {WIFI_SSID1, WIFI_PASSWORD1},
    {WIFI_SSID2, WIFI_PASSWORD2},
    {WIFI_SSID3, WIFI_PASSWORD3}
  };

  int totalRedes = 3;
  bool conectado = false;

  for (int i = 0; i < totalRedes && !conectado; i++) {
    const char* ssid = redes[i][0];
    const char* senha = redes[i][1];

    if (strlen(ssid) == 0) continue;

    Serial.printf("\n🌐 Tentando conectar à rede %d: %s\n", i + 1, ssid);

    // duas tentativas por rede
    for (int tentativa = 1; tentativa <= 2 && !conectado; tentativa++) {
      Serial.printf("➡️  Tentativa %d na rede %s...\n", tentativa, ssid);

      // limpa estado WiFi antes de tentar
      WiFi.disconnect(true);
      delay(500);
      WiFi.mode(WIFI_STA);
      WiFi.begin(ssid, senha);

      unsigned long start = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
        // imprime códigos de status para debug a cada iteração
        Serial.print(".");
        delay(500);
      }

      int status = WiFi.status();
      Serial.printf("\n🔁 Status após tentativa: %d\n", status);

      if (status == WL_CONNECTED) {
        conectado = true;
        Serial.printf("✅ Conectado ao Wi-Fi (%s) na tentativa %d!\n", ssid, tentativa);
        Serial.print("📶 IP: ");
        Serial.println(WiFi.localIP());
      } else {
        Serial.printf("❌ Falha na tentativa %d para %s (status=%d).\n", tentativa, ssid, status);
        WiFi.disconnect(true);
        delay(1000);
      }
    }
  }

  if (!conectado) {
    Serial.println("\n🚫 Nenhuma rede Wi-Fi conectada após todas as tentativas.");
  }
}

// ====== LOGIN MOCHILA ======
bool loginMochila() {
  // tenta todas as APIs (a partir de 0)
  for (int i = 0; i < 4; i++) {
    String API_BASE = apiList[i];
    Serial.printf("🔗 Tentando login na API: %s\n", API_BASE.c_str());

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ Wi-Fi desconectado. Tentando reconectar...");
      conectarWiFi();
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ Não há conexão Wi-Fi para tentar login.");
        return false;
      }
    }

    HTTPClient http;
    http.begin(API_BASE + ROTA_LOGIN);
    http.addHeader("Content-Type", "application/json");

    String timestamp = gerarTimestampISO8601();
    String dados = "{\"MochilaCodigo\":\"" + mochilaCodigo + "\",\"timestamp\":\"" + timestamp + "\"}";
    String assinatura = gerarAssinatura(dados, PRIVATE_KEY_PEM);
    if (assinatura == "") {
      Serial.println("❌ Falha ao gerar assinatura.");
      http.end();
      return false;
    }

    String json = "{\"MochilaCodigo\":\"" + mochilaCodigo + "\",\"assinatura\":\"" + assinatura + "\",\"timestamp\":\"" + timestamp + "\"}";
    int code = http.POST(json);

    if (code == 200) {
      String payload = http.getString();
      DynamicJsonDocument doc(1024);
      deserializeJson(doc, payload);

      accessToken = doc["accessToken"].as<String>();
      refreshToken = doc["refreshToken"].as<String>();

      Serial.println("✅ Login bem-sucedido!");
      Serial.println(accessToken);
      http.end();
      apiIndex = i; // guarda a última API válida
      return true;
    } else {
      Serial.printf("❌ Falha na API %s (%d)\n", API_BASE.c_str(), code);
      Serial.println(http.getString());
      http.end();
    }
  }

  Serial.println("🚫 Nenhuma API disponível.");
  return false;
}

// ====== RENOVAR TOKEN ======
bool renovarToken() {
  if (WiFi.status() != WL_CONNECTED) conectarWiFi();
  if (refreshToken == "") return false;

  String API_BASE = apiList[apiIndex];
  HTTPClient http;
  http.begin(API_BASE + ROTA_REFRESH);
  http.addHeader("Content-Type", "application/json");

  String json = "{\"token\":\"" + refreshToken + "\"}";
  int code = http.POST(json);

  if (code == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(512);
    deserializeJson(doc, payload);
    accessToken = doc["accessToken"].as<String>();
    Serial.println("🟡 Token renovado com sucesso!");
    http.end();
    return true;
  }

  Serial.printf("❌ Erro ao renovar token (%d)\n", code);
  http.end();
  return false;
}

// ====== ENVIAR MEDIÇÃO ======
// ====== VARIÁVEIS GLOBAIS PARA CONTROLE DE MEDIÇÕES BAIXAS ======
int lowWeightCount = 0; // Contador de medições baixas consecutivas
const int MAX_LOW_WEIGHT_ATTEMPTS = 10; // Máximo de envios consecutivos com peso baixo
const float LOW_WEIGHT_THRESHOLD = 0.2; // Limite para considerar peso baixo

// ====== ENVIAR MEDIÇÃO ======
bool enviarMedicao(float peso, String local) {
  // matéria-prima: validar NaN
  if (isnan(peso)) {
    Serial.printf("⚠️ [%s] Valor inválido (NaN). Ignorando envio.\n", local.c_str());
    return false;
  }

  // small negative noise or very small positive noise -> ignorar (não enviar 0)
  if (peso < MIN_SENDABLE_WEIGHT) {
    Serial.printf("⚠️ [%s] Peso muito baixo (%.2f kg). Alterado para mínimo (0.0).\n", local.c_str(), peso);
    peso = MIN_SENDABLE_WEIGHT;
  }

  // Impede valores acima do limite permitido pelo banco
  if (peso > MAX_ALLOWED_WEIGHT) {
    Serial.printf("⚠️ [%s] Peso acima do limite (%.2f kg). Alterado para máximo (999.99).\n", local.c_str(), peso);
    peso = MAX_ALLOWED_WEIGHT;
  }

  // Arredondamento seguro para 2 casas
  peso = round(peso * 100.0) / 100.0;

  // ====== NOVA LÓGICA: CONTROLE DE MEDIÇÕES BAIXAS CONSECUTIVAS ======
  // Esta verificação deve ser feita APÓS o processamento do peso (arredondamento, limites)
  
  static float lastLeftWeight = 0.0;
  static float lastRightWeight = 0.0;
  
  // Atualiza o último peso conhecido para o local
  if (local == "esquerda") {
    lastLeftWeight = peso;
  } else if (local == "direita") {
    lastRightWeight = peso;
  }
  
  // Verifica se AMBOS os lados têm peso baixo (apenas quando temos ambos os valores)
  bool bothSidesLow = (lastLeftWeight <= LOW_WEIGHT_THRESHOLD && lastRightWeight <= LOW_WEIGHT_THRESHOLD);
  
  if (bothSidesLow && peso <= LOW_WEIGHT_THRESHOLD) {
    lowWeightCount++;
    Serial.printf("📊 [%s] Peso baixo detectado (%.2f kg). Contador: %d/%d\n", 
                  local.c_str(), peso, lowWeightCount, MAX_LOW_WEIGHT_ATTEMPTS);
    
    // Se excedeu o limite de tentativas, não envia
    if (lowWeightCount > MAX_LOW_WEIGHT_ATTEMPTS) {
      Serial.printf("🚫 [%s] Limite de envios com peso baixo atingido (%d vezes). Ignorando envio.\n", 
                    local.c_str(), MAX_LOW_WEIGHT_ATTEMPTS);
      return false;
    }
  } 
  else if (peso > LOW_WEIGHT_THRESHOLD) {
    // Se algum lado tem peso maior que o threshold, reseta o contador
    if (lowWeightCount > 0) {
      Serial.printf("🔄 [%s] Peso normal detectado (%.2f kg). Resetando contador de pesos baixos.\n", 
                    local.c_str(), peso);
      lowWeightCount = 0;
    }
  }

  // Garante conexão Wi-Fi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ Wi-Fi desconectado. Tentando reconectar antes do envio...");
    conectarWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("❌ Falha ao reconectar Wi-Fi. Medição não enviada.");
      return false;
    }
  }

  // Garante token
  if (accessToken == "") {
    Serial.println("⚠️ Sem token. Tentando login...");
    if (!loginMochila()) {
      Serial.println("❌ Não foi possível autenticar. Medição não enviada.");
      return false;
    }
  }

  String API_BASE = apiList[apiIndex];
  HTTPClient http;
  http.begin(API_BASE + ROTA_MEDICAO);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + accessToken);

  // Monta JSON da medição
  String json = "{\"MedicaoPeso\":" + String(peso, 2) + ",\"MedicaoLocal\":\"" + local + "\"}";
  int code = http.POST(json);

  // Respostas da API
  if (code == 200 || code == 201) {
    Serial.printf("✅ [%s] Medição enviada: %.2f kg\n", local.c_str(), peso);
    http.end();
    return true;
  } 
  else if (code == 401) {
    Serial.println("⚠️ Token expirado. Tentando renovar...");
    http.end();
    if (renovarToken()) return enviarMedicao(peso, local);
    else return loginMochila() && enviarMedicao(peso, local);
  } 
  else {
    String resp = http.getString();
    Serial.printf("❌ [%s] Erro ao enviar medição (%d): %s\n", local.c_str(), code, resp.c_str());
  }

  http.end();
  return false;
}

// ====== TIMESTAMP ======
String gerarTimestampISO8601() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  gmtime_r(&now, &timeinfo);

  char buffer[40];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S.000Z", &timeinfo);
  return String(buffer);
}

// ====== ASSINATURA RSA ======
String gerarAssinatura(String msg, String keyPem) {
  mbedtls_pk_context pk;
  mbedtls_entropy_context entropy;
  mbedtls_ctr_drbg_context ctr_drbg;
  const char* pers = "assinatura";

  mbedtls_pk_init(&pk);
  mbedtls_entropy_init(&entropy);
  mbedtls_ctr_drbg_init(&ctr_drbg);
  if (mbedtls_ctr_drbg_seed(&ctr_drbg, mbedtls_entropy_func, &entropy, (const unsigned char*)pers, strlen(pers)) != 0) return "";

  if (mbedtls_pk_parse_key(&pk, (const unsigned char*)keyPem.c_str(), keyPem.length() + 1, NULL, 0, NULL, NULL) != 0) return "";

  unsigned char hash[32];
  mbedtls_md(mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), (const unsigned char*)msg.c_str(), msg.length(), hash);

  unsigned char assinatura[512];
  size_t assinatura_len;
  if (mbedtls_pk_sign(&pk, MBEDTLS_MD_SHA256, hash, sizeof(hash), assinatura, sizeof(assinatura), &assinatura_len, mbedtls_ctr_drbg_random, &ctr_drbg) != 0)
    return "";

  unsigned char assinatura_base64[1024];
  size_t out_len;
  mbedtls_base64_encode(assinatura_base64, sizeof(assinatura_base64), &out_len, assinatura, assinatura_len);

  mbedtls_pk_free(&pk);
  mbedtls_ctr_drbg_free(&ctr_drbg);
  mbedtls_entropy_free(&entropy);

  return String((char*)assinatura_base64);
}

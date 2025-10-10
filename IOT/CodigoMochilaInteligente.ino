#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "mbedtls/pk.h"
#include "mbedtls/md.h"
#include "mbedtls/base64.h"
#include "mbedtls/entropy.h"
#include "mbedtls/ctr_drbg.h"

// ====== CONFIGURAÇÃO DE REDE ======
const char* WIFI_SSID = "Wifi";
const char* WIFI_PASSWORD = "senhaWifi";

// ====== ENDPOINTS DA API ======
const char* API_BASE = "http://999.999.999.999:9999";
const char* ROTA_LOGIN = "/mochilas/loginMochila";
const char* ROTA_MEDICAO = "/medicoes";
const char* ROTA_REFRESH = "/token/refresh";

// ====== CHAVE PRIVADA (cole aqui sua chave PEM) ======
const char* PRIVATE_KEY_PEM = R"KEY(
-----BEGIN PRIVATE KEY-----
CAHAVEPRIVADA
-----END PRIVATE KEY-----
)KEY";

// ====== DADOS DA MOCHILA ======
String mochilaCodigo = "codigoMochila";  // mesmo código da API

// ====== VARIÁVEIS GLOBAIS ======
String accessToken = "";
String refreshToken = "";

unsigned long ultimoEnvio = 0;
const unsigned long intervaloEnvio = 10000;  // 10 segundos

// ====== SETUP ======
void setup() {
  Serial.begin(115200);
  delay(2000);  // tempo para estabilizar
  Serial.println("\n=== Inicializando ESP32-C3 ===");

  conectarWiFi();

  Serial.println("\n🔧 Iniciando login inicial...");
  if (loginMochila()) {
    Serial.println("🚀 Mochila autenticada!");
  } else {
    Serial.println("❌ Falha ao autenticar mochila.");
  }
}

// ====== LOOP ======
void loop() {
  if (millis() - ultimoEnvio >= intervaloEnvio) {
    ultimoEnvio = millis();

    // Simula pesos — substitua pelos valores das balanças depois
    float pesoEsq = random(2000, 5000) / 1000.0;
    float pesoDir = random(2000, 5000) / 1000.0;

    Serial.printf("\n📦 Peso Esquerda: %.2f kg | Peso Direita: %.2f kg\n", pesoEsq, pesoDir);

    enviarMedicao(pesoEsq, "esquerda");
    enviarMedicao(pesoDir, "direita");
  }
}

// ====== CONECTAR WIFI ======
void conectarWiFi() {
  Serial.printf("🌐 Conectando ao Wi-Fi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    Serial.print(".");
    delay(500);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Wi-Fi conectado!");
    Serial.print("📶 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ Falha na conexão Wi-Fi!");
  }
}

// ====== TIMESTAMP ISO8601 (UTC) ======
String gerarTimestampISO8601() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  gmtime_r(&now, &timeinfo);

  char buffer[40];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S.000Z", &timeinfo);
  return String(buffer);
}

// ====== GERA ASSINATURA RSA-SHA256 ======
String gerarAssinatura(String mensagem, String chavePrivada) {
  mbedtls_pk_context pk;
  mbedtls_entropy_context entropy;
  mbedtls_ctr_drbg_context ctr_drbg;
  const char* pers = "assinatura";

  mbedtls_pk_init(&pk);
  mbedtls_entropy_init(&entropy);
  mbedtls_ctr_drbg_init(&ctr_drbg);

  // Inicializa gerador de números aleatórios
  int ret = mbedtls_ctr_drbg_seed(&ctr_drbg, mbedtls_entropy_func, &entropy,
                                  (const unsigned char*)pers, strlen(pers));
  if (ret != 0) {
    Serial.println("Erro ao inicializar DRBG");
    return "";
  }

  // Lê e carrega a chave privada
  ret = mbedtls_pk_parse_key(
    &pk,
    (const unsigned char*)chavePrivada.c_str(),
    chavePrivada.length() + 1,
    NULL, 0, NULL, NULL  // ← novos parâmetros (IDF 5.x)
  );

  if (ret != 0) {
    Serial.printf("Erro ao carregar chave privada: -0x%04X\n", -ret);
    return "";
  }

  // Gera o hash SHA-256 da mensagem
  unsigned char hash[32];
  mbedtls_md(mbedtls_md_info_from_type(MBEDTLS_MD_SHA256),
             (const unsigned char*)mensagem.c_str(),
             mensagem.length(), hash);

  // Cria buffer para assinatura
  unsigned char assinatura[512];
  size_t assinatura_len = 0;

  // Gera a assinatura (ajustado para IDF 5.x)
  ret = mbedtls_pk_sign(
    &pk,
    MBEDTLS_MD_SHA256,
    hash, sizeof(hash),
    assinatura, sizeof(assinatura), &assinatura_len,
    mbedtls_ctr_drbg_random, &ctr_drbg);

  if (ret != 0) {
    Serial.printf("Erro ao assinar mensagem: -0x%04X\n", -ret);
    return "";
  }

  // Codifica em Base64 para enviar como string
  unsigned char assinatura_base64[1024];
  size_t out_len = 0;
  mbedtls_base64_encode(assinatura_base64, sizeof(assinatura_base64), &out_len,
                        assinatura, assinatura_len);

  // Limpa estruturas
  mbedtls_pk_free(&pk);
  mbedtls_ctr_drbg_free(&ctr_drbg);
  mbedtls_entropy_free(&entropy);

  // Retorna a assinatura codificada
  return String((char*)assinatura_base64);
}

// ====== LOGIN MOCHILA ======
bool loginMochila() {
  HTTPClient http;
  http.begin(String(API_BASE) + String(ROTA_LOGIN));
  http.addHeader("Content-Type", "application/json");

  String timestamp = gerarTimestampISO8601();
  String dadosAssinados = "{\"MochilaCodigo\":\"" + mochilaCodigo + "\",\"timestamp\":\"" + timestamp + "\"}";
  String assinatura = gerarAssinatura(dadosAssinados, PRIVATE_KEY_PEM);

  if (assinatura == "") {
    Serial.println("Falha ao gerar assinatura. Abortando login.");
    return false;
  }

  String json = "{\"MochilaCodigo\":\"" + mochilaCodigo + "\",\"assinatura\":\"" + assinatura + "\",\"timestamp\":\"" + timestamp + "\"}";
  Serial.println("📨 JSON Enviado: " + json);

  int httpResponseCode = http.POST(json);
  if (httpResponseCode == 200) {
    String payload = http.getString();
    Serial.println("✅ Login bem-sucedido!");
    Serial.println(payload);

    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);

    accessToken = doc["accessToken"].as<String>();
    refreshToken = doc["refreshToken"].as<String>();

    Serial.println("🔑 AccessToken salvo:");
    Serial.println(accessToken);

    http.end();
    return true;
  } else {
    Serial.printf("❌ Erro no login (%d): %s\n", httpResponseCode, http.getString().c_str());
    http.end();
    return false;
  }
}

// ====== RENOVAR TOKEN ======
bool renovarToken() {
  if (WiFi.status() != WL_CONNECTED) conectarWiFi();
  if (refreshToken == "") return false;

  HTTPClient http;
  http.begin(String(API_BASE) + String(ROTA_REFRESH));
  http.addHeader("Content-Type", "application/json");

  String json = "{\"token\":\"" + refreshToken + "\"}";

  int code = http.POST(json);
  if (code == 200) {
    String payload = http.getString();
    Serial.println("🟡 Token atualizado com sucesso!");
    Serial.println(payload);

    DynamicJsonDocument doc(512);
    deserializeJson(doc, payload);
    accessToken = doc["accessToken"].as<String>();

    http.end();
    return true;
  } else {
    Serial.printf("❌ Erro ao renovar token (%d): %s\n", code, http.getString().c_str());
  }

  http.end();
  return false;
}

// ====== ENVIAR MEDIÇÃO (simulada) ======
bool enviarMedicao(float peso, String local) {
  if (WiFi.status() != WL_CONNECTED) conectarWiFi();
  if (accessToken == "") {
    Serial.println("⚠️ Sem token, tentando login...");
    if (!loginMochila()) return false;
  }

  HTTPClient http;
  http.begin(String(API_BASE) + String(ROTA_MEDICAO));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + accessToken);

  String json = "{\"MedicaoPeso\":" + String(peso, 2) + ",\"MedicaoLocal\":\"" + local + "\"}";
  int code = http.POST(json);

  if (code == 201 || code == 200) {
    Serial.printf("✅ [%s] Medição enviada: %.2f kg\n", local.c_str(), peso);
    http.end();
    return true;
  } else if (code == 401) {
    Serial.println("⚠️ Token expirado, tentando renovar...");
    http.end();
    if (renovarToken()) {
      return enviarMedicao(peso, local);
    } else {
      Serial.println("🔴 Falha na renovação — refazendo login...");
      if (loginMochila()) {
        return enviarMedicao(peso, local);
      } else {
        Serial.println("❌ Falha total no login.");
        return false;
      }
    }
  } else {
    Serial.printf("❌ Erro ao enviar medição (%d): %s\n", code, http.getString().c_str());
  }

  http.end();
  return false;
}

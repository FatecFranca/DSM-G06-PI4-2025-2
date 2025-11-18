/*
 *   Adaptado de: BrincandoComIdeias
 *   Modificação: leitura automática sem botão
 *   Data: 2025
 */

// INCLUSÃO DE BIBLIOTECAS
#include <HX711.h>

// DEFINIÇÕES DE PINOS
#define pinDT  4
#define pinSCK 5

// DEFINIÇÕES
#define pesoMin 0.010
#define pesoMax 30.0

// coloque aqui o fator de calibração correto após calibrar
#define escala 45500.0f  

// INSTANCIANDO OBJETO
HX711 scale;

// DECLARAÇÃO DE VARIÁVEIS  
float medida = 0;
unsigned long ultimoLeitura = 0;
const unsigned long intervaloLeitura = 2000; // 2 segundos

void setup() {
  Serial.begin(57600);

  scale.begin(pinDT, pinSCK); // CONFIGURANDO OS PINOS DA BALANÇA
  scale.set_scale(escala);    // ENVIANDO O VALOR DA ESCALA CALIBRADO

  delay(2000);
  scale.tare(); // ZERANDO A BALANÇA PARA DESCONSIDERAR A MASSA DA ESTRUTURA
  Serial.println("Setup Finalizado!");
}

void loop() {
  if (millis() - ultimoLeitura >= intervaloLeitura) {
    ultimoLeitura = millis();

    scale.power_up(); // LIGA O SENSOR
    
    medida = scale.get_units(5); // FAZ MÉDIA DE 5 MEDIDAS
    
    if (medida <= pesoMin) {
      scale.tare(); // ZERA SE MASSA FOR MUITO PEQUENA
      medida = 0;
      Serial.println("Tara Configurada (peso muito baixo)");
    } 
    else if (medida >= pesoMax) {
      scale.tare(); // ZERA SE MASSA EXCEDER LIMITE
      medida = 0;
      Serial.println("Tara Configurada (peso muito alto)");
    } 
    else {
      Serial.print("Peso: ");
      Serial.print(medida, 3);
      Serial.println(" kg");
    }

    scale.power_down(); // DESLIGA SENSOR PARA ECONOMIA DE ENERGIA
  }
}

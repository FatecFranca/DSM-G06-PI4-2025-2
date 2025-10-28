import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

// Nome da task
export const TASK_NAME = "MONITORAMENTO_PESO";

// Define a função que será executada em background
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    // Aqui você coloca a lógica do seu monitoramento:
    // por exemplo, buscar peso da API ou do sensor
    const pesoAtual = Math.random() * 10 + 50; // exemplo

    if (pesoAtual > 55) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Alerta de Peso!",
          body: `O peso atual é ${pesoAtual.toFixed(2)} kg.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // dispara imediatamente
      });
    }

    return BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Erro na task:", error);
    return BackgroundFetchResult.Failed;
  }
});

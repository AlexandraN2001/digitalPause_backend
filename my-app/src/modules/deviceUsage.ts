import { NativeModules, Platform } from "react-native";

const { DeviceUsage } = NativeModules;

export interface UsageData {
  day: number;
  week: number;
  month: number;
  note?: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1); // Lunes como inicio de semana
  x.setDate(diff);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export async function ensureUsageAccessAndroid(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  if (!DeviceUsage) {
    console.error("DeviceUsage module no disponible. Verifica la configuración nativa.");
    return false;
  }

  try {
    const hasPermission = await DeviceUsage.hasUsagePermission();
    if (!hasPermission) {
      console.log("Permiso de Usage Access no concedido. Abriendo configuración...");
      DeviceUsage.openUsageAccessSettings();
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error verificando permiso:", error);
    DeviceUsage.openUsageAccessSettings();
    return false;
  }
}

export async function getUsageDayWeekMonthSeconds(
  refDate = new Date()
): Promise<UsageData> {
  if (Platform.OS !== "android") {
    return {
      day: 0,
      week: 0,
      month: 0,
      note: "iOS: La funcionalidad de monitoreo de uso requiere implementación específica",
    };
  }

  if (!DeviceUsage) {
    return {
      day: 0,
      week: 0,
      month: 0,
      note: "Módulo DeviceUsage no disponible. Revisa la configuración nativa.",
    };
  }

  try {
    const now = new Date(refDate);
    
    // Fechas de inicio
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    
    const nowMs = now.getTime();

    // Ejecutar consultas en paralelo
    const [day, week, month] = await Promise.all([
      DeviceUsage.getUsageSeconds(dayStart.getTime(), nowMs),
      DeviceUsage.getUsageSeconds(weekStart.getTime(), nowMs),
      DeviceUsage.getUsageSeconds(monthStart.getTime(), nowMs),
    ]);

    return {
      day: Number(day) || 0,
      week: Number(week) || 0,
      month: Number(month) || 0,
    };
  } catch (error: any) {
    console.error("Error obteniendo uso del dispositivo:", error);
    
    // Si es error de permiso, abrir configuración
    if (error.code === "E_NO_USAGE_ACCESS") {
      DeviceUsage.openUsageAccessSettings();
    }
    
    return {
      day: 0,
      week: 0,
      month: 0,
      note: `Error: ${error.message || "No se pudo obtener el uso"}`,
    };
  }
}

// Función adicional para RF-07: Frecuencia de interacción
export async function getInteractionStats(): Promise<{
  unlocks: number;
  sessions: number;
}> {
  // Implementación para contar desbloqueos y sesiones
  // Requeriría más lógica nativa
  return {
    unlocks: 0,
    sessions: 0,
  };
}
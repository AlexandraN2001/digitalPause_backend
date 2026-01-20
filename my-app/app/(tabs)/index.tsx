import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, ScrollView } from "react-native";
import { 
  ensureUsageAccessAndroid, 
  getUsageDayWeekMonthSeconds,
  type UsageData 
} from "../../src/modules/deviceUsage";

export default function Home() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const checkPermission = async () => {
    try {
      const granted = await ensureUsageAccessAndroid();
      setPermissionGranted(granted);
      return granted;
    } catch (err) {
      setError("Error verificando permisos");
      return false;
    }
  };

  const loadUsageData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Primero verificar permiso
      const hasPermission = await checkPermission();
      
      if (!hasPermission) {
        setError("Por favor, otorga el permiso de 'Usage Access' en configuración");
        setLoading(false);
        return;
      }

      // Obtener datos de uso
      const usageData = await getUsageDayWeekMonthSeconds(new Date());
      setData(usageData);
      
      if (usageData.note) {
        console.log("Nota del sistema:", usageData.note);
      }
    } catch (err: any) {
      setError(`Error: ${err.message || "No se pudo cargar los datos"}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verificar permisos al cargar el componente
    checkPermission();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Monitoreo de Uso Digital (RF-06)</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado de Permisos:</Text>
        <Text style={[
          styles.permissionText,
          permissionGranted === true ? styles.granted : 
          permissionGranted === false ? styles.denied : styles.unknown
        ]}>
          {permissionGranted === true ? "✓ Permiso concedido" :
           permissionGranted === false ? "✗ Permiso requerido" :
           "Verificando..."}
        </Text>
        
        {permissionGranted === false && (
          <Text style={styles.hint}>
            Ve a Configuración → Aplicaciones → {require('../../app.json').expo.name} 
            → Permisos especiales → Acceso de uso
          </Text>
        )}
      </View>

      <Button 
        title={loading ? "Cargando..." : "Obtener Uso del Dispositivo"}
        onPress={loadUsageData}
        disabled={loading}
      />

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {data && !error && (
        <View style={styles.dataCard}>
          <Text style={styles.dataTitle}>Tiempo de Uso Activo:</Text>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Hoy:</Text>
            <Text style={styles.dataValue}>
              {data.day > 0 ? `${(data.day / 60).toFixed(1)} min` : "Sin datos"}
            </Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Esta semana:</Text>
            <Text style={styles.dataValue}>
              {data.week > 0 ? `${(data.week / 3600).toFixed(2)} horas` : "Sin datos"}
            </Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Este mes:</Text>
            <Text style={styles.dataValue}>
              {data.month > 0 ? `${(data.month / 3600).toFixed(1)} horas` : "Sin datos"}
            </Text>
          </View>

          {data.note && (
            <Text style={styles.note}>Nota: {data.note}</Text>
          )}
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Requisito RF-06:</Text>
        <Text style={styles.infoText}>
          • Registrar tiempo activo total por día, semana y mes{"\n"}
          • Cumple con el documento de requerimientos{"\n"}
          • Incluye validación de permisos{"\n"}
          • Prepara base para RF-07 (frecuencia de interacción)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    padding: 8,
    borderRadius: 4,
  },
  granted: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  denied: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  unknown: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorCard: {
    backgroundColor: '#f8d7da',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  errorText: {
    color: '#721c24',
  },
  dataCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    elevation: 2,
  },
  dataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataLabel: {
    fontSize: 16,
    color: '#555',
  },
  dataValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2980b9',
  },
  note: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 12,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#e8f4fc',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2c3e50',
  },
  infoText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
});
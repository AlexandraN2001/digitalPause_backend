package com.example.rf06usagetracker

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            RF06Screen()
        }
    }
}

@Composable
fun RF06Screen() {
    val context = androidx.compose.ui.platform.LocalContext.current

    var allowed by remember { mutableStateOf(hasUsagePermission(context)) }
    var totalsText by remember { mutableStateOf("Cargando...") }

    LaunchedEffect(allowed) {
        if (allowed) {
            val totals = UsageStatsHelper.getTotals(context)
            totalsText = """
                Tiempo activo total del dispositivo
                
                Día:   ${UsageStatsHelper.formatMs(totals.dayMs)}
                Semana:${UsageStatsHelper.formatMs(totals.weekMs)}
                Mes:   ${UsageStatsHelper.formatMs(totals.monthMs)}
            """.trimIndent()
        } else {
            totalsText = " Activa Usage Access"
        }
    }

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("RF-06", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(16.dp))
            Text(totalsText)
            Spacer(Modifier.height(16.dp))

            if (!allowed) {
                Button(onClick = {
                    context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                }) {
                    Text("Abrir ajustes de Usage Access")
                }

                Spacer(Modifier.height(8.dp))

                Button(onClick = {
                    allowed = hasUsagePermission(context) // refrescar al volver
                }) {
                    Text("Ya activé, actualizar")
                }
            } else {
                Button(onClick = {
                    val totals = UsageStatsHelper.getTotals(context)
                    totalsText = """
                        Tiempo activo total del dispositivo
                        
                        Día:   ${UsageStatsHelper.formatMs(totals.dayMs)}
                        Semana:${UsageStatsHelper.formatMs(totals.weekMs)}
                        Mes:   ${UsageStatsHelper.formatMs(totals.monthMs)}
                    """.trimIndent()
                }) {
                    Text("Actualizar")
                }
            }
        }
    }
}

private fun hasUsagePermission(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        context.packageName
    )
    return mode == AppOpsManager.MODE_ALLOWED
}

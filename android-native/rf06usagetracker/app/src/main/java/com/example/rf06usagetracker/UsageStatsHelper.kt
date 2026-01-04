package com.example.rf06usagetracker

import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import java.util.Calendar
import java.util.concurrent.TimeUnit



object UsageStatsHelper {

    data class Totals(val dayMs: Long, val weekMs: Long, val monthMs: Long)

    fun getTotals(context: Context): Totals {
        val now = System.currentTimeMillis()

        val dayStart = startOfDay()

        val weekStart = startOfWeek()
        val monthStart = startOfMonth()

        val day = totalForegroundMs(context, dayStart, now)
        val week = totalForegroundMs(context, weekStart, now)
        val month = totalForegroundMs(context, monthStart, now)

        return Totals(day, week, month)
    }

    private fun totalForegroundMs(context: Context, start: Long, end: Long): Long {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val aggregated = usm.queryAndAggregateUsageStats(start, end)

        var total = 0L
        for (entry in aggregated.values) total += entry.totalTimeInForeground
        return total
    }

    private fun startOfDay(): Long {
        val c = Calendar.getInstance()
        c.set(Calendar.HOUR_OF_DAY, 0)
        c.set(Calendar.MINUTE, 0)
        c.set(Calendar.SECOND, 0)
        c.set(Calendar.MILLISECOND, 0)
        return c.timeInMillis
    }

    private fun startOfWeek(): Long {
        val c = Calendar.getInstance()
        c.firstDayOfWeek = Calendar.MONDAY
        c.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)
        c.set(Calendar.HOUR_OF_DAY, 0)
        c.set(Calendar.MINUTE, 0)
        c.set(Calendar.SECOND, 0)
        c.set(Calendar.MILLISECOND, 0)
        return c.timeInMillis
    }

    private fun startOfMonth(): Long {
        val c = Calendar.getInstance()
        c.set(Calendar.DAY_OF_MONTH, 1)
        c.set(Calendar.HOUR_OF_DAY, 0)
        c.set(Calendar.MINUTE, 0)
        c.set(Calendar.SECOND, 0)
        c.set(Calendar.MILLISECOND, 0)
        return c.timeInMillis
    }

    fun formatMs(ms: Long): String {
        val totalSeconds = ms / 1000
        val h = totalSeconds / 3600
        val m = (totalSeconds % 3600) / 60
        val s = totalSeconds % 60
        return String.format("%02dh %02dm %02ds", h, m, s)
    }
}

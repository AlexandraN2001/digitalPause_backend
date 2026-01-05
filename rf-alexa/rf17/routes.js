import express from "express";
import { pool } from "../db.js";
import { assertParentOwnsChild } from "../utils/linkGuard.js";
import { isWithinTimeWindow } from "../utils/time.js";

const router = express.Router();

// Helper: verificar que el CHILD solo se evalúe a sí mismo,
// y que PARENT solo evalúe a su hijo.
async function resolveChildAccess(req, child_id) {
  if (req.user.role === "CHILD") {
    return req.user.id === child_id;
  }
  if (req.user.role === "PARENT") {
    return await assertParentOwnsChild(req.user.id, child_id);
  }
  return false;
}

router.post("/evaluate", async (req, res) => {
  const {
    child_id,
    device_id = null,
    now_hhmm,
    continuous_usage_ms = 0,
    emotion = null,
    emotion_confidence = 0,
    fast_usage = false
  } = req.body;

  if (!child_id) return res.status(400).json({ error: "child_id es requerido" });
  if (!now_hhmm) return res.status(400).json({ error: "now_hhmm es requerido (HH:MM)" });

  const allowed = await resolveChildAccess(req, child_id);
  if (!allowed) return res.status(403).json({ error: "Sin acceso a ese child_id" });

  // Si el hijo desactivó pausas automáticas (RF-05), no se fuerza nada.
  const cf = await pool.query(
    `SELECT auto_pause_enabled FROM child_features WHERE child_id=$1`,
    [child_id]
  );
  if (cf.rowCount > 0 && cf.rows[0].auto_pause_enabled === false) {
    return res.json({ ok: true, forced: false, reason: "AUTO_PAUSE_DISABLED" });
  }

  // Cargar reglas activas
  const rulesQ = await pool.query(
    `SELECT * FROM pause_rules
     WHERE child_id=$1 AND enabled=TRUE`,
    [child_id]
  );

  // Evaluar reglas y encontrar la primera FORCED que cumpla
  let matchedRule = null;
  let matchedReason = null;

  for (const r of rulesQ.rows) {
    if (r.action_type !== "FORCED") continue;

    if (r.rule_type === "CONTINUOUS_TIME") {
      const limitMs = Number(r.continuous_limit_min) * 60_000;
      if (Number(continuous_usage_ms) >= limitMs) {
        matchedRule = r;
        matchedReason = "CONTINUOUS_TIME";
        break;
      }
    }

    if (r.rule_type === "SCHEDULE") {
      if (r.schedule_start && r.schedule_end) {
        const start = String(r.schedule_start).slice(0, 5); // "HH:MM"
        const end = String(r.schedule_end).slice(0, 5);
        if (isWithinTimeWindow(now_hhmm, start, end)) {
          matchedRule = r;
          matchedReason = "SCHEDULE";
          break;
        }
      }
    }

    if (r.rule_type === "EMOTION") {
      if (emotion && r.emotion_trigger && Number(emotion_confidence) >= Number(r.emotion_min_conf)) {
        if (String(emotion) === String(r.emotion_trigger)) {
          matchedRule = r;
          matchedReason = "EMOTION";
          break;
        }
      }
    }

    if (r.rule_type === "FAST_USAGE") {
      if (fast_usage === true) {
        matchedRule = r;
        matchedReason = "FAST_USAGE";
        break;
      }
    }
  }

  // Si no hay match -> no forzar
  if (!matchedRule) {
    return res.json({ ok: true, forced: false });
  }

  // Evitar spam: no repetir pausa igual si ya hay una reciente (ej 2 min)
  const recent = await pool.query(
    `SELECT 1 FROM pauses_log
     WHERE child_id=$1
       AND pause_type='FORCED'
       AND reason=$2
       AND started_at >= NOW() - INTERVAL '2 minutes'
     LIMIT 1`,
    [child_id, matchedReason]
  );

  if (recent.rowCount > 0) {
    return res.json({
      ok: true,
      forced: false,
      reason: "RECENTLY_TRIGGERED"
    });
  }

  // Registrar pausa (RF-20 también pide registrar todas, ya lo guardas aquí)
  const ins = await pool.query(
    `INSERT INTO pauses_log (child_id, device_id, rule_id, pause_type, reason, duration_min)
     VALUES ($1,$2,$3,'FORCED',$4,$5)
     RETURNING *`,
    [
      child_id,
      device_id,
      matchedRule.id,
      matchedReason,
      matchedRule.pause_duration_min
    ]
  );

  return res.json({
    ok: true,
    forced: true,
    pause: {
      duration_min: ins.rows[0].duration_min,
      reason: ins.rows[0].reason,
      rule_id: ins.rows[0].rule_id,
      started_at: ins.rows[0].started_at
    }
  });
});

export default router;

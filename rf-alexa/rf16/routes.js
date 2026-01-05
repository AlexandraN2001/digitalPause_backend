import express from "express";
import { pool } from "../db.js";
import { assertParentOwnsChild } from "../utils/linkGuard.js";

const router = express.Router();

function validateRuleBody(body) {
  const {
    child_id,
    rule_type,
    action_type,
    pause_duration_min,
    continuous_limit_min,
    schedule_start,
    schedule_end,
    emotion_trigger,
    emotion_min_conf
  } = body;

  if (!child_id) return "child_id es requerido";
  if (!["CONTINUOUS_TIME", "SCHEDULE", "EMOTION", "FAST_USAGE"].includes(rule_type)) {
    return "rule_type inválido";
  }
  if (!["SUGGESTED", "FORCED"].includes(action_type)) {
    return "action_type inválido";
  }
  if (pause_duration_min == null || Number(pause_duration_min) <= 0) {
    return "pause_duration_min debe ser > 0";
  }

  // Validaciones específicas por tipo
  if (rule_type === "CONTINUOUS_TIME") {
    if (continuous_limit_min == null || Number(continuous_limit_min) <= 0) {
      return "continuous_limit_min es requerido para CONTINUOUS_TIME";
    }
  }

  if (rule_type === "SCHEDULE") {
    if (!schedule_start || !schedule_end) {
      return "schedule_start y schedule_end son requeridos para SCHEDULE";
    }
  }

  if (rule_type === "EMOTION") {
    const allowed = ["FRUSTRACION", "TRISTEZA", "ENOJO", "ALEGRIA", "CALMA"];
    if (!allowed.includes(emotion_trigger)) return "emotion_trigger inválido";
    if (emotion_min_conf == null || Number(emotion_min_conf) < 0 || Number(emotion_min_conf) > 1) {
      return "emotion_min_conf debe estar entre 0 y 1";
    }
  }

  return null;
}

// Crear regla (solo PARENT)
router.post("/rules", async (req, res) => {
  if (req.user.role !== "PARENT") return res.status(403).json({ error: "Solo PARENT" });

  const err = validateRuleBody(req.body);
  if (err) return res.status(400).json({ error: err });

  const parent_id = req.user.id;
  const {
    child_id,
    rule_type,
    enabled = true,
    action_type,
    pause_duration_min,
    continuous_limit_min,
    schedule_start,
    schedule_end,
    emotion_trigger,
    emotion_min_conf
  } = req.body;

  const okLink = await assertParentOwnsChild(parent_id, child_id);
  if (!okLink) return res.status(403).json({ error: "No tienes vínculo con ese hijo" });

  const q = await pool.query(
    `INSERT INTO pause_rules
     (parent_id, child_id, rule_type, enabled, continuous_limit_min,
      schedule_start, schedule_end, emotion_trigger, emotion_min_conf,
      action_type, pause_duration_min)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      parent_id, child_id, rule_type, enabled,
      continuous_limit_min ?? null,
      schedule_start ?? null,
      schedule_end ?? null,
      emotion_trigger ?? null,
      emotion_min_conf ?? null,
      action_type, pause_duration_min
    ]
  );

  res.json({ ok: true, rule: q.rows[0] });
});

// Listar reglas de un hijo (solo PARENT, validando vínculo)
router.get("/rules", async (req, res) => {
  if (req.user.role !== "PARENT") return res.status(403).json({ error: "Solo PARENT" });

  const { child_id } = req.query;
  if (!child_id) return res.status(400).json({ error: "child_id es requerido" });

  const okLink = await assertParentOwnsChild(req.user.id, child_id);
  if (!okLink) return res.status(403).json({ error: "No tienes vínculo con ese hijo" });

  const q = await pool.query(
    `SELECT * FROM pause_rules
     WHERE parent_id = $1 AND child_id = $2
     ORDER BY created_at DESC`,
    [req.user.id, child_id]
  );

  res.json({ ok: true, rules: q.rows });
});

// Editar regla completa (solo PARENT)
router.put("/rules/:id", async (req, res) => {
  if (req.user.role !== "PARENT") return res.status(403).json({ error: "Solo PARENT" });

  // Para update también necesitamos child_id en body para validar vínculo
  const err = validateRuleBody(req.body);
  if (err) return res.status(400).json({ error: err });

  const ruleId = req.params.id;
  const parent_id = req.user.id;
  const {
    child_id,
    rule_type,
    enabled = true,
    action_type,
    pause_duration_min,
    continuous_limit_min,
    schedule_start,
    schedule_end,
    emotion_trigger,
    emotion_min_conf
  } = req.body;

  const okLink = await assertParentOwnsChild(parent_id, child_id);
  if (!okLink) return res.status(403).json({ error: "No tienes vínculo con ese hijo" });

  const q = await pool.query(
    `UPDATE pause_rules
     SET rule_type=$1, enabled=$2, continuous_limit_min=$3,
         schedule_start=$4, schedule_end=$5, emotion_trigger=$6,
         emotion_min_conf=$7, action_type=$8, pause_duration_min=$9,
         updated_at=NOW()
     WHERE id=$10 AND parent_id=$11 AND child_id=$12
     RETURNING *`,
    [
      rule_type, enabled,
      continuous_limit_min ?? null,
      schedule_start ?? null,
      schedule_end ?? null,
      emotion_trigger ?? null,
      emotion_min_conf ?? null,
      action_type, pause_duration_min,
      ruleId, parent_id, child_id
    ]
  );

  if (q.rowCount === 0) return res.status(404).json({ error: "Regla no encontrada" });
  res.json({ ok: true, rule: q.rows[0] });
});

// Activar/desactivar (solo PARENT)
router.patch("/rules/:id/enabled", async (req, res) => {
  if (req.user.role !== "PARENT") return res.status(403).json({ error: "Solo PARENT" });

  const ruleId = req.params.id;
  const { enabled, child_id } = req.body;
  if (child_id == null) return res.status(400).json({ error: "child_id requerido" });
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled debe ser boolean" });

  const okLink = await assertParentOwnsChild(req.user.id, child_id);
  if (!okLink) return res.status(403).json({ error: "No tienes vínculo con ese hijo" });

  const q = await pool.query(
    `UPDATE pause_rules
     SET enabled=$1, updated_at=NOW()
     WHERE id=$2 AND parent_id=$3 AND child_id=$4
     RETURNING *`,
    [enabled, ruleId, req.user.id, child_id]
  );

  if (q.rowCount === 0) return res.status(404).json({ error: "Regla no encontrada" });
  res.json({ ok: true, rule: q.rows[0] });
});

// Borrar regla (solo PARENT)
router.delete("/rules/:id", async (req, res) => {
  if (req.user.role !== "PARENT") return res.status(403).json({ error: "Solo PARENT" });

  const ruleId = req.params.id;
  const { child_id } = req.query;
  if (!child_id) return res.status(400).json({ error: "child_id es requerido" });

  const okLink = await assertParentOwnsChild(req.user.id, child_id);
  if (!okLink) return res.status(403).json({ error: "No tienes vínculo con ese hijo" });

  const q = await pool.query(
    `DELETE FROM pause_rules
     WHERE id=$1 AND parent_id=$2 AND child_id=$3
     RETURNING id`,
    [ruleId, req.user.id, child_id]
  );

  if (q.rowCount === 0) return res.status(404).json({ error: "Regla no encontrada" });
  res.json({ ok: true, deletedId: q.rows[0].id });
});

export default router;

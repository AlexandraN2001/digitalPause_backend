import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { CreatePauseRuleDto } from "./dto/create-pause-rule.dto";
import { UpdatePauseRuleDto } from "./dto/update-pause-rule.dto";
import { EvaluatePauseDto } from "./dto/evaluate-pause.dto";

@Injectable()
export class PauseService {
  constructor(private readonly db: Pool) {}

  // ------------- Helpers -------------
  private async getOrCreateUserId(clerkId: string): Promise<string> {
    const r = await this.db.query(`SELECT id FROM users WHERE clerk_id=$1`, [clerkId]);
    if (r.rowCount) return r.rows[0].id;
    const created = await this.db.query(`INSERT INTO users(clerk_id) VALUES($1) RETURNING id`, [clerkId]);
    return created.rows[0].id;
  }

  private isInScheduleWindow(now: Date, windows: any): boolean {
    if (!Array.isArray(windows)) return false;

    // JS: 0 domingo..6 sábado -> convertimos a 1..7 (lunes..domingo=7)
    const jsDay = now.getDay();
    const day = jsDay === 0 ? 7 : jsDay;

    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const current = `${hh}:${mm}`;

    for (const w of windows) {
      if (!w || !w.start || !w.end) continue;
      const days: number[] = Array.isArray(w.days) ? w.days : [];
      if (days.length && !days.includes(day)) continue;

      // Asumimos start < end (misma jornada)
      if (w.start <= current && current <= w.end) return true;
    }
    return false;
  }

  // ------------- RF-16 CRUD Reglas -------------

  async createRule(clerkId: string, dto: CreatePauseRuleDto) {
    const userId = await this.getOrCreateUserId(clerkId);

    // Validación: al menos una condición
    const hasAnyCondition =
      dto.continuous_usage_limit_seconds != null ||
      dto.schedule_windows != null ||
      dto.emotion_trigger != null;

    if (!hasAnyCondition) {
      throw new BadRequestException("La regla debe tener al menos una condición (tiempo, horario o emoción).");
    }

    const res = await this.db.query(
      `INSERT INTO pause_rule (
        user_id, continuous_usage_limit_seconds, schedule_windows,
        emotion_trigger, emotion_confidence_min, pause_duration_minutes, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        userId,
        dto.continuous_usage_limit_seconds ?? null,
        dto.schedule_windows ? JSON.stringify(dto.schedule_windows) : null,
        dto.emotion_trigger ?? null,
        dto.emotion_confidence_min ?? null,
        dto.pause_duration_minutes,
        dto.is_active ?? true
      ]
    );

    return res.rows[0];
  }

  async listRules(clerkId: string) {
    const userId = await this.getOrCreateUserId(clerkId);
    const res = await this.db.query(
      `SELECT * FROM pause_rule WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  async getRule(clerkId: string, ruleId: string) {
    const userId = await this.getOrCreateUserId(clerkId);
    const res = await this.db.query(`SELECT * FROM pause_rule WHERE id=$1`, [ruleId]);
    if (!res.rowCount) throw new NotFoundException("Regla no encontrada");
    if (res.rows[0].user_id !== userId) throw new ForbiddenException();
    return res.rows[0];
  }

  async updateRule(clerkId: string, ruleId: string, dto: UpdatePauseRuleDto) {
    const userId = await this.getOrCreateUserId(clerkId);

    const current = await this.db.query(`SELECT * FROM pause_rule WHERE id=$1`, [ruleId]);
    if (!current.rowCount) throw new NotFoundException("Regla no encontrada");
    if (current.rows[0].user_id !== userId) throw new ForbiddenException();

    const merged = {
      continuous_usage_limit_seconds: dto.continuous_usage_limit_seconds ?? current.rows[0].continuous_usage_limit_seconds,
      schedule_windows: dto.schedule_windows ?? current.rows[0].schedule_windows,
      emotion_trigger: dto.emotion_trigger ?? current.rows[0].emotion_trigger,
      emotion_confidence_min: dto.emotion_confidence_min ?? current.rows[0].emotion_confidence_min,
      pause_duration_minutes: dto.pause_duration_minutes ?? current.rows[0].pause_duration_minutes,
      is_active: dto.is_active ?? current.rows[0].is_active
    };

    const hasAnyCondition =
      merged.continuous_usage_limit_seconds != null ||
      merged.schedule_windows != null ||
      merged.emotion_trigger != null;

    if (!hasAnyCondition) {
      throw new BadRequestException("La regla debe tener al menos una condición (tiempo, horario o emoción).");
    }

    const res = await this.db.query(
      `UPDATE pause_rule SET
        continuous_usage_limit_seconds=$1,
        schedule_windows=$2,
        emotion_trigger=$3,
        emotion_confidence_min=$4,
        pause_duration_minutes=$5,
        is_active=$6,
        updated_at=NOW()
      WHERE id=$7
      RETURNING *`,
      [
        merged.continuous_usage_limit_seconds,
        merged.schedule_windows ? JSON.stringify(merged.schedule_windows) : null,
        merged.emotion_trigger,
        merged.emotion_confidence_min,
        merged.pause_duration_minutes,
        merged.is_active,
        ruleId
      ]
    );

    return res.rows[0];
  }

  async deleteRule(clerkId: string, ruleId: string) {
    const userId = await this.getOrCreateUserId(clerkId);

    const current = await this.db.query(`SELECT user_id FROM pause_rule WHERE id=$1`, [ruleId]);
    if (!current.rowCount) throw new NotFoundException("Regla no encontrada");
    if (current.rows[0].user_id !== userId) throw new ForbiddenException();

    await this.db.query(`DELETE FROM pause_rule WHERE id=$1`, [ruleId]);
    return { ok: true };
  }

  // ------------- RF-17 Pausas automáticas -------------

  async getActivePause(clerkId: string) {
    const userId = await this.getOrCreateUserId(clerkId);

    const res = await this.db.query(
      `SELECT * FROM pause_event
       WHERE user_id=$1 AND status='active' AND ends_at > NOW()
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    return res.rowCount ? res.rows[0] : null;
  }

  async endPause(clerkId: string, pauseId: string) {
    const userId = await this.getOrCreateUserId(clerkId);

    const cur = await this.db.query(`SELECT * FROM pause_event WHERE id=$1`, [pauseId]);
    if (!cur.rowCount) throw new NotFoundException("Pausa no encontrada");
    if (cur.rows[0].user_id !== userId) throw new ForbiddenException();

    const res = await this.db.query(
      `UPDATE pause_event
       SET status='ended'
       WHERE id=$1
       RETURNING *`,
      [pauseId]
    );

    return res.rows[0];
  }

  async evaluateAndMaybeCreatePause(clerkId: string, dto: EvaluatePauseDto) {
    const userId = await this.getOrCreateUserId(clerkId);

    // 0) Si ya hay una pausa activa → devolvemos
    const active = await this.getActivePause(clerkId);
    if (active) return { pause_active: true, reason: "already_active", pause: active };

    // 1) Traer reglas activas
    const rulesRes = await this.db.query(
      `SELECT * FROM pause_rule WHERE user_id=$1 AND is_active=true ORDER BY created_at DESC`,
      [userId]
    );

    const now = new Date(dto.now_iso);

    for (const rule of rulesRes.rows) {

      // A) tiempo continuo
      if (rule.continuous_usage_limit_seconds != null) {
        if (dto.current_continuous_usage_seconds >= rule.continuous_usage_limit_seconds) {
          return await this.createPause(userId, rule.id, "continuous_usage", rule.pause_duration_minutes);
        }
      }

      // B) horario
      if (rule.schedule_windows) {
        if (this.isInScheduleWindow(now, rule.schedule_windows)) {
          return await this.createPause(userId, rule.id, "schedule", rule.pause_duration_minutes);
        }
      }

      // C) emoción
      if (rule.emotion_trigger && dto.emotion && dto.emotion_confidence != null) {
        const okEmotion = dto.emotion === rule.emotion_trigger;
        const okConf = dto.emotion_confidence >= (rule.emotion_confidence_min ?? 0);
        if (okEmotion && okConf) {
          return await this.createPause(userId, rule.id, "emotion", rule.pause_duration_minutes);
        }
      }
    }

    return { pause_active: false };
  }

  private async createPause(userId: string, ruleId: string, trigger: string, durationMin: number) {
    const endsAt = new Date(Date.now() + durationMin * 60_000);

    const res = await this.db.query(
      `INSERT INTO pause_event (user_id, rule_id, trigger, ends_at)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [userId, ruleId, trigger, endsAt.toISOString()]
    );

    return { pause_active: true, trigger, pause: res.rows[0] };
  }
}

import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class EvaluatePauseDto {
  // Cuánto llevas usando el teléfono de forma continua (en segundos)
  @IsInt()
  @Min(0)
  current_continuous_usage_seconds!: number;

  // Hora actual del móvil (ISO) para evaluar horarios
  @IsDateString()
  now_iso!: string;

  // Emoción detectada (opcional)
  @IsOptional()
  @IsString()
  emotion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  emotion_confidence?: number;
}

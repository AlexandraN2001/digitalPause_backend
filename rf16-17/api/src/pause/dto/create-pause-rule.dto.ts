import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

export class CreatePauseRuleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  continuous_usage_limit_seconds?: number;

  // Ej: [{"start":"12:30","end":"13:30","days":[1,2,3,4,5]}]
  @IsOptional()
  @IsObject()
  schedule_windows?: any;

  @IsOptional()
  @IsString()
  emotion_trigger?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  emotion_confidence_min?: number;

  @IsInt()
  @Min(1)
  pause_duration_minutes!: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

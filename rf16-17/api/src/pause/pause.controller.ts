import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ClerkAuthGuard } from "./auth/clerk-auth.guard";
import { PauseService } from "./pause.service";
import { CreatePauseRuleDto } from "./dto/create-pause-rule.dto";
import { UpdatePauseRuleDto } from "./dto/update-pause-rule.dto";
import { EvaluatePauseDto } from "./dto/evaluate-pause.dto";

@Controller()
export class PauseController {
  constructor(private readonly service: PauseService) {}

  // ---------------- RF-16: CRUD Reglas ----------------

  @UseGuards(ClerkAuthGuard)
  @Post("pause-rules")
  createRule(@Req() req: any, @Body() dto: CreatePauseRuleDto) {
    return this.service.createRule(req.user.clerkId, dto);
  }

  @UseGuards(ClerkAuthGuard)
  @Get("pause-rules")
  listRules(@Req() req: any) {
    return this.service.listRules(req.user.clerkId);
  }

  @UseGuards(ClerkAuthGuard)
  @Get("pause-rules/:id")
  getRule(@Req() req: any, @Param("id") id: string) {
    return this.service.getRule(req.user.clerkId, id);
  }

  @UseGuards(ClerkAuthGuard)
  @Patch("pause-rules/:id")
  updateRule(@Req() req: any, @Param("id") id: string, @Body() dto: UpdatePauseRuleDto) {
    return this.service.updateRule(req.user.clerkId, id, dto);
  }

  @UseGuards(ClerkAuthGuard)
  @Delete("pause-rules/:id")
  deleteRule(@Req() req: any, @Param("id") id: string) {
    return this.service.deleteRule(req.user.clerkId, id);
  }

  // ---------------- RF-17: Evaluar + crear pausa ----------------

  @UseGuards(ClerkAuthGuard)
  @Post("pause/evaluate")
  evaluate(@Req() req: any, @Body() dto: EvaluatePauseDto) {
    return this.service.evaluateAndMaybeCreatePause(req.user.clerkId, dto);
  }

  @UseGuards(ClerkAuthGuard)
  @Get("pause/active")
  activePause(@Req() req: any) {
    return this.service.getActivePause(req.user.clerkId);
  }

  @UseGuards(ClerkAuthGuard)
  @Post("pause/end/:pauseId")
  endPause(@Req() req: any, @Param("pauseId") pauseId: string) {
    return this.service.endPause(req.user.clerkId, pauseId);
  }
}

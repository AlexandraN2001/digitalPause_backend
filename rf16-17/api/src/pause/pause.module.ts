import { Module } from "@nestjs/common";
import { PauseController } from "./pause.controller";
import { PauseService } from "./pause.service";
import { DbModule } from "../db/db.module";

@Module({
  imports: [DbModule],
  controllers: [PauseController],
  providers: [PauseService],
})
export class PauseModule {}

import { Controller, Get, Header, Inject, Sse } from "@nestjs/common";
import { exhaustMap, map, timer } from "rxjs";
import { PublicCompetitionService } from "./public-competition.service";

@Controller("api/v1/public/competition")
export class PublicCompetitionController {
  constructor(
    @Inject(PublicCompetitionService)
    private readonly competition: PublicCompetitionService,
  ) {}

  @Get()
  snapshot() {
    return this.competition.snapshot();
  }

  @Sse("stream")
  @Header("X-Accel-Buffering", "no")
  stream() {
    return timer(0, 2000).pipe(
      exhaustMap(() => this.competition.snapshot()),
      map((snapshot) => ({ data: snapshot, retry: 3000 })),
    );
  }
}

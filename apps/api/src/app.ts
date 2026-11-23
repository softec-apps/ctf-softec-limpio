import {
  windowsView,
  windowsCommand,
  submitWindowsFlag,
} from "./windows-lab/service";
import { WINDOWS_INTERACTIVE_CHALLENGES } from "./windows-lab/catalog";
import { isWirelessOperational } from "./wireless/scenarios";
import {
  wirelessView,
  wirelessCommand,
  wirelessCapture,
  submitWirelessFlag,
} from "./wireless/service";
import { changeCategoryAvailability } from "./competition/category-availability";
import {
  registrationChallenge,
  checkRegistrationRate,
  verifyRegistrationProof,
  consumeRegistrationProof,
} from "./registration/guard";
import { readRanking } from "./competition/ranking";
import { readAdminUserResults } from "./competition/admin-users";
import { PublicCompetitionController } from "./competition/public-competition.controller";
import { PublicCompetitionService } from "./competition/public-competition.service";
import { ANALYSIS_CASES } from "./casework/catalog";
import { SPECIALIST_STATIONS } from "../../../packages/specialist-contracts";
import { readOtLab, otCommand, readOtDebrief } from "./ot/service";
import { printerCommand } from "./printer/service";
import {
  domainView,
  domainCommand,
  domainFiles,
  submitDomainFlag,
} from "./domain/service";
import { DOMAIN_CASES, DOMAIN_ROOT } from "./domain/catalog";
import {
  entrancePin,
  entrancePinCookieName,
  matchesEntrancePin,
} from "./entrance/pin";
import {
  entranceTicket,
  hasEntranceTicket,
  entranceCookieName,
} from "./entrance/ticket";
import { creditEntrance } from "./entrance/service";
import { entrancePageTemplate } from "./entrance/page";
import {
  scoreFor,
  pointsFor,
  FINAL_POINTS,
  SCORING_CATEGORIES,
} from "./scoring/policy";
import { maintenance } from "./privileged/service";
import {
  competitionStatus,
  changeCompetition,
  lockCompetition,
  requireOpen,
} from "./competition/service";
import { readWorkstationBytes } from "./workstation-binary";
import { workstationCommand } from "./workstation-terminal";
import { linuxNetwork, linuxCommand } from "./linux-network/service";
import { LINUX_SERVERS } from "./linux-network/catalog";
import { getLab, operateLab, completeLab } from "./network/operations/service";
import {
  commandSchema,
  configureSchema,
  revisionSchema,
} from "./network/operations/requests";
import { readMobileMedia } from "./mobile/media";
import { mobileArtifacts, readMobileFile } from "./mobile/filesystem";
import { MOBILE_ROOT } from "./mobile/catalog";
import "reflect-metadata";
import "dotenv/config";
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Req,
  Res,
  Module,
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Prisma } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import {
  HOME,
  virtualPath,
  readVirtual,
  virtualCommand,
} from "./virtual-filesystem";
import {
  NETWORK_CHALLENGES,
  networkFolder,
  getNetworkChallenge,
} from "./network/catalog";
import { readWindowsFile, windowsEventLogs } from "./windows/filesystem";
import { readWorkstationFile } from "./workstation-files";
import { getCryptoChallenge } from "./crypto/catalog";
import { getWebLab } from "./web-lab/catalog";
import { sceneObjects, inspectSceneObject } from "./scene-objects";
import { readSceneDocument } from "./scene-documents";
import { digest, passwordHash, passwordMatches, matchesFlag } from "./security";

const publicUser = { id: true, alias: true, role: true } as const;
const publicChallenge = {
  id: true,
  title: true,
  description: true,
  category: true,
  device: true,
  points: true,
  enabled: true,
} as const;
const aliasSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_-]{3,24}$/,
    "Usa de 3 a 24 letras minúsculas, números, guion o guion bajo.",
  );
const passwordSchema = z
  .string()
  .min(6, "La contraseña debe tener al menos 6 caracteres.")
  .max(128);
const cookieName =
  process.env.NODE_ENV === "production" ? "__Host-ctf_session" : "ctf_session";
const adminCookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-ctf_admin_session"
    : "ctf_admin_session";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new BadRequestException(
      result.error.issues[0]?.message ?? "Datos inválidos.",
    );
  return result.data;
}

@Injectable()
export class Platform {
  async user(req: Request, scope: "game" | "admin" = "game") {
    const token =
      req.cookies?.[scope === "admin" ? adminCookieName : cookieName];
    if (typeof token !== "string" || token.length > 128)
      throw new UnauthorizedException("Inicia sesión para continuar.");
    const session = await db.session.findUnique({
      where: { tokenHash: digest(token) },
      include: { user: { select: publicUser } },
    });
    if (!session || session.scope !== scope || session.expiresAt < new Date())
      throw new UnauthorizedException("Tu sesión terminó. Vuelve a ingresar.");
    return session.user;
  }
  async admin(req: Request) {
    if (!req.cookies?.[adminCookieName] && req.cookies?.[cookieName])
      throw new ForbiddenException(
        "Entra por el acceso independiente de administración.",
      );
    const user = await this.user(req, "admin");
    if (user.role !== "ADMIN")
      throw new ForbiddenException(
        "Esta operación requiere una cuenta de administrador.",
      );
    return user;
  }
  async session(
    userId: string,
    res: Response,
    scope: "game" | "admin" = "game",
  ) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.session.create({
      data: { userId, tokenHash: digest(token), expiresAt, scope },
    });
    res.cookie(scope === "admin" ? adminCookieName : cookieName, token, {
      ...cookieOptions,
      expires: expiresAt,
    });
  }
  async challenge(id: string) {
    const challenge = await db.challenge.findUnique({ where: { id } });
    if (!challenge || !challenge.enabled)
      throw new NotFoundException("El reto no está disponible.");
    return challenge;
  }
}

@Controller("api/v1")
class ApiController {
  constructor(@Inject(Platform) private readonly platform: Platform) {}
  @Get("health") async health() {
    await db.$queryRaw`SELECT 1`;
    return { status: "ok", version: "0.1.0" };
  }
  @Get("entrance") entrance(@Req() req: Request) {
    return { opened: hasEntranceTicket(req.cookies?.[entranceCookieName()]) };
  }
  @Get("entrance/challenge") entranceChallenge(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pin = entrancePin(req.cookies?.[entrancePinCookieName()]);
    res.setHeader("Cache-Control", "no-store");
    res.cookie(entrancePinCookieName(), pin.token, {
      ...cookieOptions,
      expires: pin.expiresAt,
    });
    return { code: pin.code };
  }
  @Get("entrance/page") async entrancePage(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const html = await entrancePageTemplate();
    const { code } = this.entranceChallenge(req, res);
    res.type("html");
    return html.replace("__ENTRANCE_PIN__", code);
  }
  @Post("entrance/leave") leaveEntrance(
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie(entranceCookieName(), cookieOptions);
    return { opened: false };
  }
  @Post("entrance/unlock") async unlockEntrance(
    @Req() req: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { code } = parse(
      z
        .object({
          code: z.string().regex(/^[0-9]{4}$/, "Introduce cuatro dígitos."),
        })
        .strict(),
      body,
    );
    if (!matchesEntrancePin(code, req.cookies?.[entrancePinCookieName()]))
      throw new BadRequestException("Código incorrecto.");
    let awardedPoints = 0;
    if (req.cookies?.[cookieName]) {
      try {
        awardedPoints = await creditEntrance(await this.platform.user(req));
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) throw error;
      }
    }
    const ticket = entranceTicket();
    res.cookie(entranceCookieName(), ticket.token, {
      ...cookieOptions,
      expires: ticket.expiresAt,
    });
    return {
      opened: true,
      awardedPoints,
      message:
        "Puerta abierta. Usa el computador del laboratorio para continuar.",
    };
  }
  @Post("registration/access") access(@Body() body: unknown) {
    const { code } = parse(
      z.object({ code: z.string().max(100) }).strict(),
      body,
    );
    if (code !== process.env.REGISTRATION_CODE)
      throw new BadRequestException(
        "El código no coincide. Revisa el código fuente de la página.",
      );
    return { accepted: true };
  }
  @Post("auth/registration-challenge") registrationPreparation(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return registrationChallenge(req, res);
  }
  @Post("auth/register") async register(
    @Req() req: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    await checkRegistrationRate(req);
    const data = parse(
      z
        .object({
          alias: aliasSchema,
          password: passwordSchema,
          code: z.string().max(100).optional(),
          website: z.literal("").optional(),
          proof: z
            .object({
              nonce: z.string().regex(/^[a-f0-9]{48}$/),
              solution: z.string().regex(/^\d{1,10}$/),
            })
            .strict(),
        })
        .strict(),
      body,
    );
    if (
      data.code !== undefined
        ? data.code !== process.env.REGISTRATION_CODE
        : !hasEntranceTicket(req.cookies?.[entranceCookieName()])
    )
      throw new BadRequestException("Código de registro inválido.");
    const verification = verifyRegistrationProof(req, data.proof);
    const hashedPassword = passwordHash(data.password);
    let user;
    try {
      user = await db.$transaction(async (tx) => {
        await consumeRegistrationProof(tx, verification);
        return tx.user.create({
          data: {
            alias: data.alias,
            passwordHash: hashedPassword,
            role: "PARTICIPANT",
          },
          select: publicUser,
        });
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      )
        throw new ConflictException("Ese alias ya está registrado.");
      throw e;
    }
    await this.platform.session(user.id, res);
    if (hasEntranceTicket(req.cookies?.[entranceCookieName()]))
      await creditEntrance(user);
    return { user };
  }
  @Post(["auth/login", "admin/auth/login"]) async login(
    @Req() req: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = parse(
      z
        .object({
          alias: aliasSchema,
          password: z.string().min(1).max(128),
          adminOnly: z.boolean().optional(),
        })
        .strict(),
      body,
    );
    const user = await db.user.findUnique({ where: { alias: data.alias } });
    const valid = passwordMatches(
      data.password,
      user?.passwordHash ??
        "ee7b6054d43f695559607333b81ae4da:7d77b27a443d5b002c0eeb523c5164a1bfa6629524958fa3bda0da1489a7ee702da9de2db5ba0364a73ed455b2ba2a81bcf6b594f898c71987456405e10b5f21",
    );
    if (!user || !valid)
      throw new UnauthorizedException("Alias o contraseña incorrectos.");
    const administrative =
      data.adminOnly === true || req.path.endsWith("/admin/auth/login");
    if (administrative && user.role !== "ADMIN")
      throw new ForbiddenException(
        "Esta cuenta es participante. Usa una cuenta administradora para abrir el panel.",
      );
    await this.platform.session(
      user.id,
      res,
      administrative ? "admin" : "game",
    );
    if (
      !administrative &&
      hasEntranceTicket(req.cookies?.[entranceCookieName()])
    )
      await creditEntrance(user);
    return { user: { id: user.id, alias: user.alias, role: user.role } };
  }
  @Post("auth/logout") async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[cookieName];
    if (typeof token === "string")
      await db.session.deleteMany({ where: { tokenHash: digest(token) } });
    res.clearCookie(cookieName, cookieOptions);
    return { ok: true };
  }
  @Get("me") async me(@Req() req: Request) {
    return { user: await this.platform.user(req) };
  }
  @Get("admin/auth/me") async adminMe(@Req() req: Request) {
    return { user: await this.platform.admin(req) };
  }
  @Post("admin/auth/logout") async adminLogout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[adminCookieName];
    if (typeof token === "string")
      await db.session.deleteMany({
        where: { tokenHash: digest(token), scope: "admin" },
      });
    res.clearCookie(adminCookieName, cookieOptions);
    return { ok: true };
  }
  @Get("scene/objects") objects() {
    return { objects: sceneObjects };
  }
  @Get("scene/objects/:id") async inspectObject(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    await this.platform.user(req);
    const object = sceneObjects.find((o) => o.id === id);
    if (!object) throw new NotFoundException("Objeto no encontrado.");
    if (object.challengeIds.length) {
      const available = await db.challenge.findFirst({
        where: { id: { in: object.challengeIds }, enabled: true },
        select: { id: true },
      });
      if (!available)
        throw new NotFoundException(
          "Las pistas de este objeto no están disponibles.",
        );
    }
    const result = inspectSceneObject(id);
    if (
      [
        "crypto-book",
        "osint-board",
        "rack",
        ...SPECIALIST_STATIONS.map((station) => station.id),
      ].includes(id)
    ) {
      const enabled = await db.challenge.findMany({
        where: { id: { in: object.challengeIds }, enabled: true },
        select: { id: true },
      });
      result.documents = result.documents.filter((document) =>
        enabled.some((entry) => entry.id === document.id),
      );
    }
    if (id === "archive") {
      const enabled = await db.challenge.findMany({
        where: { id: { in: object.challengeIds }, enabled: true },
        select: { id: true },
      });
      const ids = new Set(enabled.map((entry) => entry.id));
      result.documents = result.documents.filter((document) =>
        ids.has(document.challengeId ?? "turno-nocturno"),
      );
    }
    return result;
  }
  @Get("scene/objects/:id/documents/:documentId") async sceneDocument(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("documentId") documentId: string,
  ) {
    const inspection = await this.inspectObject(req, id);
    if (
      id === "archive" &&
      !inspection.documents.some((document) => document.id === documentId)
    )
      throw new NotFoundException("Expediente no disponible.");
    if (
      [
        "crypto-book",
        "osint-board",
        "rack",
        ...SPECIALIST_STATIONS.map((station) => station.id),
      ].includes(id)
    )
      await this.platform.challenge(documentId);
    return readSceneDocument(id, documentId);
  }
  @Get("game") async game(@Req() req: Request) {
    const user = await this.platform.user(req);
    const [challenges, solves, competition, final] = await Promise.all([
      db.challenge.findMany({
        where: { enabled: true },
        select: publicChallenge,
        orderBy: { createdAt: "asc" },
      }),
      db.solve.findMany({
        where: { userId: user.id },
        select: { challengeId: true, points: true, createdAt: true },
      }),
      competitionStatus(),
      db.privilegedLab.findUnique({
        where: { userId: user.id },
        select: { awardedPoints: true },
      }),
    ]);
    return {
      challenges: challenges.map((c) => ({
        ...c,
        difficulty: scoreFor(c.id).difficulty,
      })),
      solves,
      score:
        solves.reduce((n, s) => n + s.points, 0) + (final?.awardedPoints ?? 0),
      bonusPoints: final?.awardedPoints ?? 0,
      competition,
    };
  }
  @Get("ranking") async ranking(@Req() req: Request) {
    await this.platform.user(req);
    return {
      competition: await competitionStatus(),
      entries: await readRanking(),
    };
  }

  @Get("domain") async domain(@Req() req: Request) {
    const user = await this.platform.user(req);
    return domainView(user.id);
  }
  @Post("intranet/maintenance") async internalMaintenance(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const action = parse(
      z.discriminatedUnion("op", [
        z
          .object({ op: z.literal("visit"), url: z.string().min(1).max(512) })
          .strict(),
        z
          .object({
            op: z.literal("login"),
            alias: z.string().max(64),
            password: z.string().max(128),
          })
          .strict(),
        z
          .object({
            op: z.literal("recover"),
            code: z.string().regex(/^[0-9]{8}$/),
          })
          .strict(),
        z
          .object({ op: z.literal("restore"), document: z.string().max(2048) })
          .strict(),
        z
          .object({
            op: z.literal("vault"),
            signature: z.string().regex(/^[a-f0-9]{64}$/i),
          })
          .strict(),
        z
          .object({ op: z.literal("submit"), flag: z.string().max(256) })
          .strict(),
      ]),
      body,
    );
    return maintenance(user, action);
  }
  @Post("domain/commands") async domainOperate(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const { command } = parse(
      z.object({ command: z.string().min(1).max(2048) }).strict(),
      body,
    );
    return domainCommand(user, command);
  }
  @Get("linux-network") async getLinuxNetwork(@Req() req: Request) {
    const user = await this.platform.user(req);
    return linuxNetwork(user.id);
  }
  @Post("linux-network/commands") async runLinuxCommand(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const { command } = parse(
      z.object({ command: z.string().max(1024) }).strict(),
      body,
    );
    return linuxCommand(user, command);
  }
  @Post("linux-network/vpn") async setCorporateVpn(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const { connected } = parse(
      z.object({ connected: z.boolean() }).strict(),
      body,
    );
    return linuxCommand(user, connected ? "vpn connect" : "vpn disconnect");
  }
  @Get("challenges/:id/debrief") async otDebrief(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return readOtDebrief(await this.platform.user(req), id);
  }
  @Get("ot") async otStatus(@Req() req: Request) {
    const user = await this.platform.user(req);
    return readOtLab(user.id);
  }
  @Post("ot/commands") async otOperation(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const { command } = parse(
      z.object({ command: z.string().min(1).max(4096) }).strict(),
      body,
    );
    return otCommand(user.id, command);
  }
  @Get("printer") async printerStatus(@Req() req: Request) {
    await this.platform.user(req);
    return printerCommand("printer status");
  }
  @Post("printer/commands") async printerOperation(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    await this.platform.user(req);
    const { command } = parse(
      z.object({ command: z.string().min(1).max(4096) }).strict(),
      body,
    );
    return printerCommand(command);
  }
  @Get("workstation/binary") async workstationBinary(
    @Req() req: Request,
    @Query() query: unknown,
    @Res() res: Response,
  ) {
    await this.platform.user(req);
    const { path } = parse(
      z.object({ path: z.string().min(1).max(256) }).strict(),
      query,
    );
    const enabled = await db.challenge.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    const file = readWorkstationBytes(
      enabled.map((c) => c.id),
      virtualPath(path),
    );
    res.setHeader("Content-Type", file.mime);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(file.bytes);
  }
  @Post("workstation/commands") async workstationTerminal(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const input = parse(
      z
        .object({
          command: z.string().max(1024),
          challengeId: z.string().min(1).max(100),
          cwd: z
            .string()
            .max(256)
            .refine(
              (path) => path === HOME || path.startsWith(HOME + "/"),
              "Ruta virtual inválida",
            )
            .default(HOME),
        })
        .strict(),
      body,
    );
    return workstationCommand(user, input);
  }
  @Post("challenges/:id/commands") async command(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    await this.platform.user(req);
    await this.platform.challenge(id);
    if (
      id !== "primer-rastro" &&
      !getWebLab(id) &&
      !getCryptoChallenge(id) &&
      !getNetworkChallenge(id)
    )
      throw new BadRequestException("Este reto no tiene terminal.");
    const { command, cwd } = parse(
      z
        .object({
          command: z.string().max(256),
          cwd: z
            .enum([
              "/home/analista",
              "/home/analista/evidencia",
              "/home/analista/herramientas",
            ])
            .default("/home/analista"),
        })
        .strict(),
      body,
    );
    return virtualCommand(id, command, cwd);
  }
  @Post("challenges/:id/web") async webRequest(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    await this.platform.user(req);
    await this.platform.challenge(id);
    const lab = getWebLab(id);
    if (!lab) throw new NotFoundException("Este reto no tiene un portal web.");
    const { url } = parse(
      z
        .object({
          url: z
            .string()
            .trim()
            .min(1)
            .max(/^(cloud|ai|database|contract)-/.test(id) ? 8192 : 512),
        })
        .strict(),
      body,
    );
    return lab.request(url);
  }
  @Get("network/labs/:id") async networkLab(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const user = await this.platform.user(req);
    return getLab(user.id, id);
  }
  @Post("network/labs/:id/command") async networkCommand(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const data = parse(commandSchema, body);
    return operateLab(user.id, id, data.revision, {
      kind: "command",
      device: data.device,
      command: data.command,
      context: data.context,
    });
  }
  @Post("network/labs/:id/configure") async networkConfigure(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const data = parse(configureSchema, body);
    return operateLab(user.id, id, data.revision, {
      kind: "configure",
      device: data.device,
      change: data.change,
    });
  }
  @Post("network/labs/:id/reset") async networkReset(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const { revision } = parse(revisionSchema, body);
    return operateLab(user.id, id, revision, { kind: "reset" });
  }
  @Post("network/labs/:id/validate") async networkValidate(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const { revision } = parse(revisionSchema, body);
    return completeLab(user, id, revision);
  }
  @Get("network/labs/:id/capture") async networkLiveCapture(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const user = await this.platform.user(req);
    const lab = await getLab(user.id, id);
    return {
      format: "seventech-capture-v1",
      timezone: "UTC",
      packets: lab.state.capture,
    };
  }
  @Get("wireless/labs/:id") async wirelessLab(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return wirelessView((await this.platform.user(req)).id, id);
  }
  @Post("wireless/labs/:id/commands") async wirelessOperate(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const input = parse(
      z
        .object({
          command: z.string().trim().min(1).max(2048),
          revision: z.number().int().min(0),
        })
        .strict(),
      body,
    );
    return wirelessCommand(user.id, id, input.command, input.revision);
  }
  @Get("wireless/labs/:id/capture") async wirelessPackets(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return wirelessCapture((await this.platform.user(req)).id, id);
  }
  @Get("network/captures") async networkCaptures(@Req() req: Request) {
    const user = await this.platform.user(req);
    const available = await db.challenge.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    const labs = await db.networkLab.findMany({
      where: { userId: user.id },
      select: { scenarioId: true },
    });
    return {
      entries: [
        ...ANALYSIS_CASES.filter(
          (c) =>
            c.station.id === "wireless-ap" &&
            !isWirelessOperational(c.id) &&
            available.some((a) => a.id === c.id),
        ).map((c) => ({
          name: `Inalámbrica ${c.id.slice(-2)}`,
          path: `${c.station.root}/caso-${c.id.slice(-2)}/evidencia/radio.capture.json`,
        })),
        ...available
          .filter((c) => isWirelessOperational(c.id))
          .map((c) => ({
            name: `Sesión inalámbrica · ${c.id}`,
            path: `/wireless/labs/${c.id}/capture`,
          })),
        ...NETWORK_CHALLENGES.filter((c) =>
          available.some((a) => a.id === c.id),
        ).map((c) => ({
          name: `Histórica ${c.id.slice(-2)}`,
          path: `${networkFolder(c.id)}/evidencia/turno.capture.json`,
        })),
        ...labs
          .filter(
            (l) =>
              l.scenarioId === "free" ||
              (l.scenarioId.startsWith("network-") &&
                available.some((a) => a.id === l.scenarioId)),
          )
          .map((l) => ({
            name: `Sesión operativa · ${l.scenarioId === "free" ? "Libre" : l.scenarioId}`,
            path: `/network/labs/${l.scenarioId}/capture`,
          })),
      ],
    };
  }
  @Get("mobile/media/:id") async mobileMedia(
    @Req() req: Request,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    await this.platform.user(req);
    const enabled = await db.challenge.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    const media = readMobileMedia(
      enabled.map((c) => c.id),
      id,
    );
    res.setHeader("Content-Type", media.type);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(media.bytes);
  }
  @Get("mobile/artifacts") async mobileIndex(@Req() req: Request) {
    await this.platform.user(req);
    const enabled = await db.challenge.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    return {
      entries: mobileArtifacts(enabled.map((c) => c.id)).map(
        ({ content, ...entry }) => entry,
      ),
    };
  }
  @Get("mobile/files") async mobileFiles(
    @Req() req: Request,
    @Query() query: unknown,
  ) {
    await this.platform.user(req);
    const { path } = parse(
      z
        .object({ path: z.string().min(1).max(512).default(MOBILE_ROOT) })
        .strict(),
      query,
    );
    const enabled = await db.challenge.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    return readMobileFile(
      enabled.map((c) => c.id),
      path,
    );
  }
  @Get("windows/lab") async windowsLab(@Req() req: Request) {
    const user = await this.platform.user(req);
    return windowsView(user.id);
  }
  @Post("windows/lab/commands") async windowsOperate(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    const { command } = parse(
      z.object({ command: z.string().trim().min(1).max(2048) }).strict(),
      body,
    );
    return windowsCommand(user, command, "local");
  }
  @Get("windows/files") async windowsFiles(
    @Req() req: Request,
    @Query() query: unknown,
  ) {
    await this.platform.user(req);
    const { path, hidden } = parse(
      z
        .object({
          path: z.string().min(1).max(512).default("C:\\"),
          hidden: z.enum(["true", "false"]).default("false"),
        })
        .strict(),
      query,
    );
    const available = await db.challenge.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    return readWindowsFile(
      available.map((entry) => entry.id),
      path,
      hidden === "true",
    );
  }
  @Get("windows/event-logs") async windowsLogs(@Req() req: Request) {
    await this.platform.user(req);
    const available = await db.challenge.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    return { entries: windowsEventLogs(available.map((entry) => entry.id)) };
  }
  @Get("workstation/files") async workstationFiles(
    @Req() req: Request,
    @Query() query: unknown,
  ) {
    const user = await this.platform.user(req);
    const { path } = parse(
      z
        .object({ path: z.string().min(1).max(512).default("/home/analista") })
        .strict(),
      query,
    );
    const normalized = virtualPath(path);
    if (normalized === DOMAIN_ROOT || normalized.startsWith(DOMAIN_ROOT + "/"))
      return domainFiles(user.id, normalized);
    const available = await db.challenge.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    return readWorkstationFile(
      available.map((entry) => entry.id),
      path,
    );
  }
  @Get("challenges/:id/files") async files(
    @Req() req: Request,
    @Param("id") id: string,
    @Query() query: unknown,
  ) {
    await this.platform.user(req);
    await this.platform.challenge(id);
    const { path } = parse(
      z
        .object({ path: z.string().min(1).max(256).default("/home/analista") })
        .strict(),
      query,
    );
    return readVirtual(id, path);
  }
  @Post("challenges/:id/submissions") async submission(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const user = await this.platform.user(req);
    if (user.role !== "PARTICIPANT")
      throw new ForbiddenException(
        "Utiliza una cuenta participante para competir.",
      );
    const challenge = await this.platform.challenge(id);
    const { flag } = parse(
      z.object({ flag: z.string().trim().min(1).max(256) }).strict(),
      body,
    );
    if (WINDOWS_INTERACTIVE_CHALLENGES.some((c) => c.id === id))
      return submitWindowsFlag(user, id, flag);
    if (isWirelessOperational(id)) return submitWirelessFlag(user, id, flag);
    if (DOMAIN_CASES.some((c) => c.id === id))
      return submitDomainFlag(user, id, flag);
    if (LINUX_SERVERS.some((s) => s.id === id))
      throw new BadRequestException(
        "Entrega la clave desde la sesión SSH de la red Linux.",
      );
    if (NETWORK_CHALLENGES.some((c) => c.id === id))
      throw new BadRequestException(
        "Resuelve esta incidencia operando los dispositivos y usa Validar red en el rack.",
      );
    const correct = matchesFlag(flag, challenge.flagVerifier);
    const result = await db.$transaction(async (tx) => {
      requireOpen(await lockCompetition(tx));
      await tx.submission.create({
        data: { userId: user.id, challengeId: id, correct },
      });
      if (!correct) return null;
      const inserted = await tx.solve.createMany({
        data: [{ userId: user.id, challengeId: id, points: pointsFor(id) }],
        skipDuplicates: true,
      });
      const solve = await tx.solve.findUniqueOrThrow({
        where: { userId_challengeId: { userId: user.id, challengeId: id } },
      });
      return { solve, awardedPoints: inserted.count === 1 ? solve.points : 0 };
    });
    return {
      correct,
      awardedPoints: result?.awardedPoints ?? 0,
      message: correct
        ? "Misión resuelta. Tu progreso está guardado."
        : "La flag no coincide. Revisa la evidencia.",
    };
  }
  @Get("admin/users/:id") async adminUserResults(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    await this.platform.admin(req);
    return readAdminUserResults(parse(z.string().min(1).max(128), id));
  }
  @Get("admin/overview") async overview(@Req() req: Request) {
    await this.platform.admin(req);
    const [
      users,
      challenges,
      solves,
      attempts,
      audits,
      competition,
      hiddenCompletions,
    ] = await Promise.all([
      db.user.findMany({
        select: {
          ...publicUser,
          createdAt: true,
          _count: { select: { solves: true } },
          solves: { select: { points: true } },
          privilegedLab: { select: { awardedPoints: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.challenge.findMany({ select: publicChallenge }),
      db.solve.count(),
      db.submission.count(),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          action: true,
          target: true,
          createdAt: true,
          user: { select: { alias: true } },
        },
      }),
      competitionStatus(),
      db.privilegedLab.count({ where: { completedAt: { not: null } } }),
    ]);
    return {
      users: users.map(({ solves, privilegedLab, ...user }) => ({
        ...user,
        score:
          solves.reduce((sum, solve) => sum + solve.points, 0) +
          (privilegedLab?.awardedPoints ?? 0),
        _count: {
          solves: user._count.solves + (privilegedLab?.awardedPoints ? 1 : 0),
        },
      })),
      challenges: challenges.map((c) => ({
        ...c,
        difficulty: scoreFor(c.id).difficulty,
        categoryGroup: scoreFor(c.id).category,
      })),
      solves: solves + hiddenCompletions,
      attempts,
      audits,
      competition,
      hiddenCompletions,
      finalPoints: FINAL_POINTS,
      scoring: SCORING_CATEGORIES.map((group) => {
        const entries = challenges.filter(
          (c) => scoreFor(c.id).category === group.category,
        );
        return {
          category: group.category,
          easy: entries.filter((c) => scoreFor(c.id).difficulty === "easy")
            .length,
          medium: entries.filter((c) => scoreFor(c.id).difficulty === "medium")
            .length,
          hard: entries.filter((c) => scoreFor(c.id).difficulty === "hard")
            .length,
          points: entries.reduce((sum, c) => sum + c.points, 0),
        };
      }),
    };
  }
  @Get("competition") async competition(@Req() req: Request) {
    await this.platform.user(req);
    return { competition: await competitionStatus() };
  }
  @Patch("admin/competition") async updateCompetition(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = await this.platform.admin(req);
    const change = parse(
      z
        .object({ open: z.boolean(), revision: z.number().int().min(0) })
        .strict(),
      body,
    );
    return { competition: await changeCompetition(user.id, change) };
  }
  @Patch("admin/categories/availability") async categoryAvailability(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const user = await this.platform.admin(req);
    const change = parse(
      z
        .object({ category: z.string().min(1).max(100), enabled: z.boolean() })
        .strict(),
      body,
    );
    return changeCategoryAvailability(user.id, change.category, change.enabled);
  }
  @Patch("admin/challenges/:id") async updateChallenge(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const user = await this.platform.admin(req);
    const data = parse(
      z
        .object({
          enabled: z.boolean(),
          points: z.number().int().min(1).max(10000),
        })
        .strict(),
      body,
    );
    if (
      !(await db.challenge.findUnique({ where: { id }, select: { id: true } }))
    )
      throw new NotFoundException("Reto no encontrado.");
    if (data.points !== pointsFor(id))
      throw new BadRequestException(
        "La puntuación está fijada por dificultad: fácil 1, medio 2 y difícil 3. Actualiza el panel para ver la escala vigente.",
      );
    return db.$transaction(async (tx) => {
      const challenge = await tx.challenge.update({
        where: { id },
        data,
        select: publicChallenge,
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "challenge.updated", target: id },
      });
      return { challenge };
    });
  }
}

@Module({
  controllers: [ApiController, PublicCompetitionController],
  providers: [Platform, PublicCompetitionService],
})
class AppModule {}

export async function createApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn"],
  });
  app.getHttpAdapter().getInstance().set("trust proxy", "loopback");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { scriptSrc: ["'self'", "'wasm-unsafe-eval'"] },
      },
    }),
  );
  app.use(cookieParser());
  const buckets = new Map<string, { count: number; expires: number }>();
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin !== process.env.APP_ORIGIN
    )
      return res
        .status(403)
        .json({ message: "Origen de la petición no permitido." });
    const now = Date.now();
    if (buckets.size > 10000)
      for (const [k, v] of buckets) if (v.expires < now) buckets.delete(k);
    const auth = /\/auth\/login$|\/registration\/|\/entrance\/unlock$/.test(
      req.path,
    );
    const submit =
      (req.path.endsWith("/intranet/maintenance") &&
        ["submit", "recover", "login", "vault"].includes(req.body?.op)) ||
      req.path.endsWith("/submissions") ||
      req.path.endsWith("/validate") ||
      ((req.path.endsWith("/linux-network/commands") ||
        req.path.endsWith("/workstation/commands")) &&
        /^submit(?:\s|$)/.test(req.body?.command ?? ""));
    const scope = auth ? "auth" : submit ? "flags" : "api";
    const key = `${req.ip}:${scope}`;
    const max = auth ? 30 : submit ? 60 : 600;
    const windowMs = auth ? 15 * 60 * 1000 : 60000;
    let bucket = buckets.get(key);
    if (!bucket || bucket.expires < now) {
      bucket = { count: 0, expires: now + windowMs };
      buckets.set(key, bucket);
    }
    if (++bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((bucket.expires - now) / 1000));
      return res
        .status(429)
        .json({ message: "Demasiados intentos. Espera antes de continuar." });
    }
    next();
  });
  app.enableShutdownHooks();
  return app;
}

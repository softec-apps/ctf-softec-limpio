import { z } from "zod";
export const deviceSchema = z.enum(["pc1", "sw1", "r1", "dns1", "files1"]);
const serviceSchema = z
  .object({
    http: z.boolean(),
    https: z.boolean(),
    certificateName: z.string().min(1).max(100),
    minTls: z.enum(["1.0", "1.2", "1.3"]),
    ftp: z.boolean(),
    passive: z.boolean(),
  })
  .strict();
export const revisionSchema = z
  .object({ revision: z.number().int().nonnegative() })
  .strict();
export const commandSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    device: deviceSchema,
    command: z
      .string()
      .trim()
      .min(1)
      .max(240)
      .regex(/^[\x20-\x7e]+$/),
    context: z
      .object({
        mode: z.enum(["user", "privileged", "config", "interface"]),
        port: z.number().int().min(1).max(8).optional(),
        interface: z.enum(["lan", "servers"]).optional(),
      })
      .strict()
      .default({ mode: "user" }),
  })
  .strict();
const changeSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("port"),
      number: z.number().int().min(1).max(8),
      up: z.boolean(),
      vlan: z.union([z.literal(8), z.literal(9), z.literal(99)]),
      mode: z.enum(["access", "trunk"]),
      trusted: z.boolean(),
    })
    .strict(),
  z.object({ kind: z.literal("snooping"), enabled: z.boolean() }).strict(),
  z
    .object({
      kind: z.literal("interface"),
      name: z.enum(["lan", "servers"]),
      ip: z.string().min(1).max(20),
      up: z.boolean(),
      mtu: z.number().int().min(576).max(9000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("acl"),
      rule: z
        .object({
          id: z.number().int().min(1).max(9999),
          action: z.enum(["permit", "deny"]),
          protocol: z.enum(["any", "tcp", "udp", "icmp"]),
          source: z.string().max(20),
          destination: z.string().max(20),
          port: z.number().int().min(1).max(65535).nullable(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("delete-acl"),
      id: z.number().int().min(1).max(9999),
    })
    .strict(),
  z
    .object({
      kind: z.literal("dns"),
      name: z.string().min(1).max(100),
      ip: z.string().max(15),
    })
    .strict(),
  z.object({ kind: z.literal("dns-service"), running: z.boolean() }).strict(),
  z.object({ kind: z.literal("services"), value: serviceSchema }).strict(),
  z.object({ kind: z.literal("ntp"), server: z.string().max(15) }).strict(),
]);
export const configureSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    device: deviceSchema,
    change: changeSchema,
  })
  .strict();

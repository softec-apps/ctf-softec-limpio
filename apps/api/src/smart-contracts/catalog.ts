import {
  SigningKey,
  computeAddress,
  hashMessage,
  recoverAddress,
  TypedDataEncoder,
} from "ethers";
import { consoleLabs, type ConsoleCase } from "../console-labs/build";
const PLAYER = "0x2222222222222222222222222222222222222222",
  OWNER = "0x3333333333333333333333333333333333333333",
  OFFER = "0x4444444444444444444444444444444444444444",
  EVIL = "0x5555555555555555555555555555555555555555";
// Dedicated fixture key. No wallet or RPC connection exists in this laboratory.
const key = new SigningKey("0x" + "71".repeat(32)),
  signer = computeAddress(key.publicKey);
const message = "ChainLab voucher: player=2222; credit=10",
  signature = key.sign(hashMessage(message)).serialized;
const domain = { name: "ChainLab", version: "1" },
  types = {
    Voucher: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
  voucher = { recipient: PLAYER, amount: 10 };
const typedSignature = key.sign(
  TypedDataEncoder.hash(domain, types, voucher),
).serialized;
const result = (accepted: boolean, output: unknown) => ({ accepted, output });
const json = (v: unknown) => JSON.stringify(v, null, 2);
function entry(
  title: string,
  question: string,
  initial: Record<string, unknown>,
  source: string,
  state: unknown,
  run: ConsoleCase["run"],
  files: Record<string, string> = {},
): ConsoleCase {
  return {
    title,
    question,
    initial,
    files: {
      "contract.sol": source,
      "state.json": json(state),
      "alcance.txt":
        "Modelo de estados y llamadas del juego. No ejecuta bytecode EVM ni conecta a una cadena. Saldos ficticios. Las firmas secp256k1 sí se verifican criptográficamente. Cada operación inicia el escenario de nuevo. Los campos de addresses distinguen mayúsculas; usa los del expediente.",
      ...files,
    },
    run,
  };
}
export const CONTRACT_CASES: ConsoleCase[] = [
  entry(
    "Propiedad sin guardia",
    "Obtén la propiedad del contrato como player. Lee state.json y contract.sol.",
    { method: "status" },
    "function setOwner(address next) external { owner = next; }",
    { owner: OWNER, player: PLAYER },
    (i) => {
      let owner = OWNER;
      if (i.method === "setOwner" && i.owner === PLAYER) owner = PLAYER;
      return result(owner === PLAYER, { owner, caller: PLAYER });
    },
  ),
  entry(
    "El origen equivocado",
    "Reproduce la llamada de owner a offer y de offer a vault para transferir el saldo a player.",
    { method: "status" },
    "function withdraw(address recipient) external { require(tx.origin == owner); payable(recipient).transfer(address(this).balance); }",
    { owner: OWNER, offer: OFFER, player: PLAYER, balance: 40 },
    (i) => {
      const trace = Array.isArray(i.trace) ? i.trace : [];
      const accepted =
        trace.length === 2 &&
        trace[0] === OWNER &&
        trace[1] === OFFER &&
        i.recipient === PLAYER;
      return result(accepted, {
        trace,
        origin: trace[0],
        caller: trace[1],
        received: accepted ? 40 : 0,
      });
    },
  ),
  entry(
    "Inicialización olvidada",
    "Inicializa el contrato expuesto y conserva la propiedad como player.",
    { method: "status" },
    "function initialize(address next) external { require(owner == address(0)); owner = next; }",
    { owner: null, player: PLAYER },
    (i) =>
      result(i.method === "initialize" && i.owner === PLAYER, {
        owner: i.method === "initialize" && i.owner === PLAYER ? PLAYER : null,
      }),
  ),
  entry(
    "Azar de calendario",
    "Acierta el sorteo usando el bloque publicado. Método play, campo guess entero.",
    { method: "play", guess: 0 },
    "function play(uint guess) external { require(guess == block.timestamp % 16); won[msg.sender] = true; }",
    { timestamp: 1730563223, player: PLAYER },
    (i) =>
      result(i.method === "play" && i.guess === 1730563223 % 16, {
        won: i.method === "play" && i.guess === 1730563223 % 16,
      }),
  ),
  entry(
    "Retirar antes de actualizar",
    "Obtén más que tu depósito con withdraw y reentries entre 0 y 3. Cada reentrada vuelve a retirar antes de poner el crédito en cero.",
    { method: "withdraw", reentries: 0 },
    'function withdraw() external { uint n=credit[msg.sender]; (bool ok,)=msg.sender.call{value:n}(""); require(ok); credit[msg.sender]=0; }',
    { credit: 10, vault: 100, player: PLAYER },
    (i) => {
      let vault = 100,
        credit = 10,
        received = 0;
      const n = i.reentries;
      if (
        i.method !== "withdraw" ||
        !Number.isInteger(n) ||
        Number(n) < 0 ||
        Number(n) > 3
      )
        return result(false, { error: "reentries: entero 0..3" });
      const withdraw = (depth: number) => {
        const amount = credit;
        if (amount > vault) return;
        vault -= amount;
        received += amount;
        if (depth > 0) withdraw(depth - 1);
        credit = 0;
      };
      withdraw(Number(n));
      return result(received > 10, { vault, credit, received });
    },
  ),
  entry(
    "La transferencia que falló",
    "Demuestra que settle marca deuda pagada aunque el destinatario rechaza el pago. Campo recipientMode: accept o reject.",
    { method: "settle", recipientMode: "accept" },
    'function settle(address recipient) external { recipient.call{value:20}(""); paid[recipient]=true; }',
    { debt: 20, paid: false },
    (i) => {
      const settled =
        i.method === "settle" &&
        ["accept", "reject"].includes(String(i.recipientMode));
      return result(settled && i.recipientMode === "reject", {
        paid: settled,
        transferred: settled && i.recipientMode === "accept" ? 20 : 0,
      });
    },
  ),
  entry(
    "Contador de otra época",
    "Supera el límite de 20 en una llamada spend. amount admite enteros de 0 a 255. El contrato es anterior a Solidity 0.8.",
    { method: "spend", amount: 5 },
    "pragma solidity 0.7.6; contract Budget { uint8 used=10; function spend(uint8 amount) external { require(uint8(used+amount)<=20); used+=amount; } }",
    { used: 10, limit: 20 },
    (i) => {
      const amount = i.amount;
      if (
        i.method !== "spend" ||
        !Number.isInteger(amount) ||
        Number(amount) < 0 ||
        Number(amount) > 255
      )
        return result(false, { error: "amount: uint8" });
      const used = (10 + Number(amount)) % 256,
        allowed = used <= 20;
      return result(allowed && Number(amount) > 20, {
        allowed,
        used: allowed ? used : 10,
        spent: allowed ? amount : 0,
      });
    },
  ),
  entry(
    "Vale sin consumo",
    "Canjea dos veces el vale capturado. Envía method redeem, message, signature y repeats (1 o 2). No alteres los bytes firmados.",
    { method: "redeem", message, signature, repeats: 1 },
    "function redeem(bytes32 digest, bytes signature) external { require(recover(digest,signature)==issuer); credit[msg.sender]+=10; /* no nonce */ }",
    { issuer: signer, player: PLAYER },
    (i) => {
      try {
        const valid =
          i.message === message &&
          typeof i.signature === "string" &&
          recoverAddress(hashMessage(String(i.message)), i.signature) ===
            signer;
        const count = i.repeats === 2 ? 2 : i.repeats === 1 ? 1 : 0;
        return result(i.method === "redeem" && valid && count === 2, {
          valid,
          credit: i.method === "redeem" && valid ? count * 10 : 0,
        });
      } catch {
        return result(false, { valid: false });
      }
    },
    { "captured-voucher.json": json({ message, signature }) },
  ),
  entry(
    "Una firma entre dos cadenas",
    "Reutiliza el vale en el destino distinto al emisor. Envía method redeem, domain, voucher, signature, chainId y verifyingContract. Conserva la validez de la firma.",
    {
      method: "redeem",
      domain,
      voucher,
      signature: typedSignature,
      chainId: 31337,
      verifyingContract: OWNER,
    },
    "// EIP712Domain(string name,string version) omite chainId y verifyingContract.\n// redeem valida firma, pero admite el mismo vale en despliegues distintos.",
    {
      issuer: signer,
      issuedFor: { chainId: 31337, verifyingContract: OWNER },
      target: { chainId: 31338, verifyingContract: OFFER },
      player: PLAYER,
    },
    (i) => {
      try {
        const d = i.domain as typeof domain,
          v = i.voucher as typeof voucher;
        const valid =
          !!d &&
          !!v &&
          Object.keys(d).sort().join(",") === "name,version" &&
          v.recipient === PLAYER &&
          Number(v.amount) === 10 &&
          recoverAddress(
            TypedDataEncoder.hash(d, types, v),
            String(i.signature),
          ) === signer;
        return result(
          i.method === "redeem" &&
            valid &&
            i.chainId === 31338 &&
            i.verifyingContract === OFFER,
          {
            valid,
            credit: i.method === "redeem" && valid ? 10 : 0,
            chainId: i.chainId,
          },
        );
      } catch {
        return result(false, { valid: false });
      }
    },
    {
      "typed-voucher.json": json({
        domain,
        types,
        voucher,
        signature: typedSignature,
      }),
    },
  ),
  entry(
    "Dos contratos, una ranura",
    "Sobrescribe la implementación del proxy mediante initialize y después vacía el saldo a player. Usa calls de dos objetos method/owner o method/recipient.",
    { calls: [] },
    "// Proxy: slot0 implementation; slot1 admin. fallback delegatecall(slot0).\n// Logic: slot0 owner. initialize(address next) escribe owner.\n// Evil: withdraw(address recipient) transfiere todo el saldo.",
    {
      slots: { slot0: OWNER, slot1: OWNER },
      logic: OWNER,
      evil: EVIL,
      player: PLAYER,
      balance: 90,
    },
    (i) => {
      let implementation = OWNER,
        balance = 90,
        received = 0;
      const calls = Array.isArray(i.calls) ? i.calls : [];
      if (calls.length > 2)
        return result(false, { error: "Hasta dos llamadas" });
      for (const raw of calls) {
        if (!raw || typeof raw !== "object") continue;
        const call = raw as Record<string, unknown>;
        if (
          implementation === OWNER &&
          call.method === "initialize" &&
          call.owner === EVIL
        )
          implementation = EVIL;
        else if (
          implementation === EVIL &&
          call.method === "withdraw" &&
          call.recipient === PLAYER
        ) {
          received += balance;
          balance = 0;
        }
      }
      return result(received === 90, {
        slots: { slot0: implementation, slot1: OWNER },
        balance,
        received,
      });
    },
  ),
];
export const CONTRACT_LABS = consoleLabs("contract-", CONTRACT_CASES);

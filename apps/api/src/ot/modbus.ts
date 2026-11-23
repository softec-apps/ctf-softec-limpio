import type { OtState } from "./state";

type ModbusReply = {
  response: string;
  changed: boolean;
  caseId?: string;
  exposed?: boolean;
  event?: string;
};

export function executeModbus(
  state: OtState,
  hex: string,
  privateText: string,
): ModbusReply {
  if (!/^(?:[a-f0-9]{2}){8,260}$/i.test(hex))
    throw new Error("Trama Modbus TCP hexadecimal inválida.");
  const frame = Buffer.from(hex, "hex");
  if (
    frame.readUInt16BE(2) !== 0 ||
    frame.readUInt16BE(4) !== frame.length - 6 ||
    frame[6] !== 1
  )
    throw new Error("Cabecera MBAP o unidad no válida.");
  const fn = frame[7];
  const reply = (pdu: Buffer) => {
    const header = Buffer.from(frame.subarray(0, 7));
    header.writeUInt16BE(pdu.length + 1, 4);
    return Buffer.concat([header, pdu]).toString("hex");
  };
  const exception = (code: number) => ({
    response: reply(Buffer.from([fn | 0x80, code])),
    changed: false,
  });
  if (![3, 5, 6].includes(fn)) return exception(1);
  if (frame.length !== 12)
    throw new Error("La PDU no tiene la longitud exigida por la función.");
  const address = frame.readUInt16BE(8),
    value = frame.readUInt16BE(10);
  if (fn === 3) {
    if (value < 1 || value > 32 || address + value > 65536) return exception(3);
    const payload = Buffer.alloc(value * 2),
      secret = Buffer.alloc(38);
    Buffer.from(privateText).copy(secret);
    let reserved = false;
    for (let i = 0; i < value; i++) {
      const register = address + i;
      if (register >= 300 && register < 319) {
        secret.copy(payload, i * 2, (register - 300) * 2, (register - 299) * 2);
        reserved = true;
      } else
        payload.writeUInt16BE(
          register === 30
            ? state.fanRpm
            : register === 40
              ? state.alarmThresholdDeciC
              : register === 100
                ? state.temperatureDeciC
                : 0,
          i * 2,
        );
    }
    return {
      response: reply(
        Buffer.concat([Buffer.from([3, payload.length]), payload]),
      ),
      changed: false,
      caseId: reserved ? "ot-04" : undefined,
    };
  }
  if (fn === 5) {
    if (address !== 200) return exception(2);
    if (value !== 0 && value !== 0xff00) return exception(3);
    state.beaconManual = value === 0xff00;
    return {
      response: reply(frame.subarray(7)),
      changed: true,
      caseId: "ot-01",
      exposed: state.beaconManual,
      event: "Escritura remota de la indicación azul",
    };
  }
  if (address !== 40) return exception(2);
  state.alarmThresholdDeciC = value;
  return {
    response: reply(frame.subarray(7)),
    changed: true,
    caseId: "ot-07",
    exposed: (value < 100 || value > 700) && value >= state.temperatureDeciC,
    event: "Escritura del umbral térmico",
  };
}

import { useState } from "react";
import { Network, Monitor, Server } from "lucide-react";
import CopyButton from "../web-lab/toolkit/CopyButton";
import { useDomainLab, domainCommandText } from "./useDomainLab";
import "./domain.css";
const operations = [
  { id: "scan", label: "Servicios del dominio", args: ["scan"], fields: [] },
  { id: "users", label: "LDAP · Cuentas", args: ["ldap", "users"], fields: [] },
  {
    id: "groups",
    label: "LDAP · Grupos",
    args: ["ldap", "groups"],
    fields: [],
  },
  { id: "acls", label: "LDAP · Permisos", args: ["ldap", "acls"], fields: [] },
  {
    id: "spns",
    label: "LDAP · Servicios registrados",
    args: ["ldap", "spns"],
    fields: [],
  },
  {
    id: "templates",
    label: "LDAP · Plantillas",
    args: ["ldap", "templates"],
    fields: [],
  },
  {
    id: "gpos",
    label: "LDAP · Directivas",
    args: ["ldap", "gpos"],
    fields: [],
  },
  {
    id: "computers",
    label: "LDAP · Equipos",
    args: ["ldap", "computers"],
    fields: [],
  },
  {
    id: "shares",
    label: "SMB · Recursos compartidos",
    args: ["shares"],
    fields: [],
  },
  {
    id: "smb",
    label: "SMB · Leer archivo",
    args: ["smb"],
    fields: ["Recurso SMB", "Archivo del recurso"],
  },
  {
    id: "asrep",
    label: "Kerberos · Solicitar AS-REP",
    args: ["capture", "asrep"],
    fields: ["Cuenta solicitada"],
  },
  {
    id: "tgs",
    label: "Kerberos · Solicitar TGS",
    args: ["capture", "tgs"],
    fields: ["Cuenta de servicio"],
  },
  {
    id: "group",
    label: "Grupos · Agregar miembro",
    args: ["group", "add"],
    fields: ["Grupo", "Miembro"],
  },
  {
    id: "password",
    label: "Identidad · Restablecer clave",
    args: ["password"],
    fields: ["Cuenta de destino", "Nueva clave del dominio"],
  },
  {
    id: "policy",
    label: "Directiva · Guardar acción",
    args: ["gpo", "set"],
    fields: ["Acción de inicio"],
  },
  {
    id: "apply",
    label: "Directiva · Aplicar en WS01",
    args: ["gpo", "apply"],
    fields: [],
  },
  {
    id: "cert",
    label: "Certificados · Solicitar identidad",
    args: ["cert"],
    fields: ["Plantilla", "Identidad solicitada"],
  },
  {
    id: "machine",
    label: "Equipos · Registrar cuenta",
    args: ["machine"],
    fields: ["Nombre de equipo con $", "Clave de equipo"],
  },
  {
    id: "delegate",
    label: "Delegación · Configurar recurso",
    args: ["delegate"],
    fields: ["Equipo de destino", "Equipo autorizado con $"],
  },
  {
    id: "ticket",
    label: "Kerberos · Ticket delegado",
    args: ["ticket"],
    fields: ["Cuenta de equipo con $", "Identidad representada"],
  },
  {
    id: "winrm",
    label: "WinRM · Leer archivo remoto",
    args: ["winrm"],
    fields: ["Ruta Windows"],
  },
];
export default function DomainExplorer() {
  const lab = useDomainLab(),
    [operation, setOperation] = useState("scan"),
    [fields, setFields] = useState(["", ""]),
    [user, setUser] = useState(""),
    [password, setPassword] = useState(""),
    [ticket, setTicket] = useState(""),
    [output, setOutput] = useState("");
  const selected = operations.find((op) => op.id === operation)!;
  async function run() {
    const args = [...selected.args, ...fields.slice(0, selected.fields.length)];
    if (ticket && ["smb", "winrm"].includes(operation))
      args.push("--ticket", ticket);
    else if (user || password) {
      if (operation === "ticket") args.push("-p", password);
      else args.push("-u", user, "-p", password);
    }
    const reply = await lab.send(domainCommandText(args));
    if (reply) setOutput(reply.output);
  }
  return (
    <section className="domain-tool" aria-label="Explorador de dominio">
      <header>
        <Network size={26} />
        <div>
          <h2>Explorador de dominio</h2>
          <p>{lab.view?.domain ?? "Seventech · Identidad y recursos"}</p>
        </div>
        <span className={lab.view?.connected ? "is-connected" : ""}>
          {lab.view?.connected ? "VPN conectada" : "VPN desconectada"}
        </span>
      </header>
      <div className="domain-hosts">
        <span>
          <Server size={17} />
          DC01 · {lab.view?.controller.ip ?? "10.77.0.40"}
        </span>
        <span>
          <Monitor size={17} />
          WS01 · Portátil Windows · {lab.view?.target.ip ?? "10.77.0.50"}
        </span>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
      >
        <div className="domain-fields">
          <label>
            Usuario del dominio
            <input
              aria-label="Usuario del dominio"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label>
            Contraseña del dominio
            <input
              aria-label="Contraseña del dominio"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </label>
        </div>
        <label>
          Operación
          <select
            aria-label="Operación del dominio"
            value={operation}
            onChange={(e) => {
              setOperation(e.target.value);
              setFields(["", ""]);
            }}
          >
            {operations.map((op) => (
              <option key={op.id} value={op.id}>
                {op.label}
              </option>
            ))}
          </select>
        </label>
        <div className="domain-fields">
          {selected.fields.map((label, index) => (
            <label key={label}>
              {label}
              <input
                aria-label={label}
                value={fields[index]}
                onChange={(event) =>
                  setFields((current) =>
                    current.map((value, i) =>
                      i === index ? event.target.value : value,
                    ),
                  )
                }
                required
                maxLength={256}
                autoComplete="off"
              />
            </label>
          ))}
        </div>
        {["smb", "winrm"].includes(operation) && (
          <label>
            Credencial emitida (opcional)
            <input
              aria-label="Credencial emitida"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="Ruta del archivo de ticket o certificado"
            />
          </label>
        )}
        <div className="domain-actions">
          <button disabled={lab.busy}>
            {lab.busy ? "Consultando…" : "Ejecutar operación"}
          </button>
          <button
            type="button"
            disabled={lab.busy}
            onClick={() =>
              void lab.send("domain help").then((reply) => {
                if (reply) setOutput(reply.output);
              })
            }
          >
            Manual de herramientas
          </button>
        </div>
      </form>
      {lab.error && <p role="alert">{lab.error}</p>}
      {output && (
        <section className="domain-results">
          <h3>Resultado</h3>
          <textarea
            aria-label="Resultado del dominio"
            value={output}
            readOnly
            spellCheck={false}
          />
          <CopyButton text={output} label="Copiar resultado del dominio" />
        </section>
      )}
      <p className="domain-footnote">
        Origen: PC Linux · Destino: portátil WS01. Las capturas se guardan en
        /home/analista/dominio.
      </p>
    </section>
  );
}

import { flagContent } from "./flag-format";
import "./flag-input.css";

export default function FlagInput({
  id,
  name = "flag",
  value,
  onChange,
  disabled = false,
  required = true,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <span className="flag-input" data-disabled={disabled || undefined}>
      <span className="flag-input-prefix" aria-hidden="true">
        CTF{"{"}
      </span>
      <input
        className="flag-input-content"
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(flagContent(event.target.value))}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (/^CTF\{[\s\S]*\}$/i.test(pasted.trim())) {
            event.preventDefault();
            onChange(flagContent(pasted).slice(0, 251));
          }
        }}
        maxLength={251}
        required={required}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Tu respuesta"
        disabled={disabled}
        aria-description="Escribe solo el contenido. CTF y las llaves se añaden automáticamente."
      />
      <span className="flag-input-suffix" aria-hidden="true">
        {"}"}
      </span>
    </span>
  );
}

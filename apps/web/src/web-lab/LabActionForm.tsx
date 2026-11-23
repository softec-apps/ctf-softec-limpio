import { useState } from "react";
export type LabForm = {
  action: string;
  submitLabel: string;
  fields: { name: string; label: string; value: string; maxLength?: number }[];
};
export default function LabActionForm({
  form,
  onVisit,
}: {
  form: LabForm;
  onVisit: (path: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.fields.map((field) => [field.name, field.value])),
  );
  return (
    <form
      className="web-lab-action"
      onSubmit={(event) => {
        event.preventDefault();
        const query = new URLSearchParams(values);
        onVisit(form.action + "?" + query.toString());
      }}
    >
      {form.fields.map((field) => (
        <label key={field.name}>
          {field.label}
          <textarea
            rows={field.value.length > 80 ? 3 : 1}
            value={values[field.name] ?? ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.name]: event.target.value,
              }))
            }
            maxLength={field.maxLength ?? 300}
            spellCheck={false}
          />
        </label>
      ))}
      <button>{form.submitLabel}</button>
    </form>
  );
}

import type { AccommodationFaqInput } from "../api/types";
import { PrimeIcon } from "./PrimeIcon";

interface Props {
  value: AccommodationFaqInput[];
  onChange: (items: AccommodationFaqInput[]) => void;
  propertyName?: string;
}

const emptyItem = (): AccommodationFaqInput => ({
  question: "",
  answer: "",
});

export function AccommodationFaqEditor({ value, onChange, propertyName }: Props) {
  const add = () => onChange([...value, emptyItem()]);

  const update = (index: number, patch: Partial<AccommodationFaqInput>) => {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= value.length) return;
    const copy = [...value];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    onChange(copy);
  };

  return (
    <fieldset className="full faq-fieldset">
      <legend>Preguntas frecuentes</legend>
      <p className="hint">
        {propertyName
          ? `Responde dudas comunes sobre «${propertyName}» (desayuno, habitaciones, ubicación…).`
          : "Responde dudas comunes que suelen tener los huéspedes antes de reservar."}
      </p>

      {value.length === 0 ? (
        <p className="muted faq-empty">Aún no hay preguntas. Agrega la primera.</p>
      ) : (
        <ul className="faq-editor-list">
          {value.map((item, index) => (
            <li key={index} className="card faq-editor-item">
              <div className="faq-editor-item-head">
                <span className="faq-editor-num">#{index + 1}</span>
                <div className="faq-editor-item-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Subir"
                  >
                    <PrimeIcon name="pi-arrow-up" size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Bajar"
                  >
                    <PrimeIcon name="pi-arrow-down" size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm faq-remove-btn"
                    onClick={() => remove(index)}
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <label>
                Pregunta
                <input
                  type="text"
                  value={item.question}
                  placeholder="Ej. ¿Qué tipo de desayuno se sirve?"
                  onChange={(e) => update(index, { question: e.target.value })}
                />
              </label>
              <label>
                Respuesta
                <textarea
                  rows={3}
                  value={item.answer}
                  placeholder="Describe la respuesta para los huéspedes…"
                  onChange={(e) => update(index, { answer: e.target.value })}
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn btn-ghost" onClick={add}>
        + Agregar pregunta
      </button>
    </fieldset>
  );
}

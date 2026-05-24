import { useMemo } from "react";
import type { AccommodationFaq } from "../api/types";

interface Props {
  propertyName: string;
  faqs: AccommodationFaq[];
}

function FaqColumn({ items }: { items: AccommodationFaq[] }) {
  return (
    <div className="property-faq-column">
      {items.map((faq) => (
        <details key={faq.id} className="property-faq-item">
          <summary className="property-faq-question">{faq.question}</summary>
          <div className="property-faq-answer">
            <p>{faq.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

export function AccommodationFaqSection({ propertyName, faqs }: Props) {
  const [left, right] = useMemo(() => {
    const mid = Math.ceil(faqs.length / 2);
    return [faqs.slice(0, mid), faqs.slice(mid)];
  }, [faqs]);

  if (faqs.length === 0) return null;

  return (
    <section className="property-section property-faq-section" id="preguntas-frecuentes">
      <h2>Preguntas frecuentes sobre {propertyName}</h2>
      <div className="property-faq-grid">
        <FaqColumn items={left} />
        {right.length > 0 && <FaqColumn items={right} />}
      </div>
    </section>
  );
}

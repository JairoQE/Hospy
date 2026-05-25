/** Renderizado mínimo de markdown para mensajes de Hospix. */
export function HospixMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="hospix-md">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <br key={i} />;
        if (trimmed.startsWith("- ")) {
          return (
            <p key={i} className="hospix-md-bullet">
              {renderInline(trimmed.slice(2))}
            </p>
          );
        }
        return (
          <p key={i} className="hospix-md-line">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

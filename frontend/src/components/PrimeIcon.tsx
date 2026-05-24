type Props = {
  /** Clase PrimeIcons, p. ej. `pi-search` o `pi pi-search`. */
  name: string;
  size?: number;
  className?: string;
};

function resolveIconClass(name: string): string {
  if (name.includes(" ")) return name;
  if (name.startsWith("pi-")) return `pi ${name}`;
  return `pi pi-${name}`;
}

export function PrimeIcon({ name, size, className }: Props) {
  return (
    <i
      className={[resolveIconClass(name), className].filter(Boolean).join(" ")}
      style={size ? { fontSize: size } : undefined}
      aria-hidden
    />
  );
}

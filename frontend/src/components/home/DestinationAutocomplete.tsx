import { useCallback, useEffect, useId, useRef, useState } from "react";
import { api } from "../../api/client";
import { TOP_DESTINATIONS, type DestinationOption } from "../../data/destinationOptions";
import { PrimeIcon } from "../PrimeIcon";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: DestinationOption) => void;
  placeholder: string;
  ariaDescribedBy?: string;
}

function normalizeQuery(q: string) {
  return q.trim();
}

export function DestinationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  ariaDescribedBy,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<DestinationOption[]>([]);
  const [loading, setLoading] = useState(false);

  const showList = open && suggestions.length > 0;

  const loadSuggestions = useCallback(async (query: string) => {
    const q = normalizeQuery(query);
    if (q.length < 2) {
      setSuggestions(TOP_DESTINATIONS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<DestinationOption[]>(
        `/ubigeo/buscar/?q=${encodeURIComponent(q)}&limit=16`,
        false,
      );
      const apiSuggestions = Array.isArray(data) ? data : [];

      // Garantiza que sugerencias frecuentes como "Tingo María" aparezcan aunque
      // el backend aún esté recalculando o en caso de ordenación por ranking.
      const localMatches = TOP_DESTINATIONS.filter((d) =>
        d.nombre.toLowerCase().includes(q.toLowerCase()),
      );

      const merged = [...apiSuggestions, ...localMatches];
      const seen = new Set<string>();
      const unique = merged.filter((d) => {
        const k = `${d.tipo}-${d.nombre}-${d.departamento ?? ""}-${d.provincia ?? ""}-${d.distrito ?? ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      setSuggestions(unique.slice(0, 16));
    } catch {
      setSuggestions(
        TOP_DESTINATIONS.filter((d) =>
          d.nombre.toLowerCase().includes(q.toLowerCase()),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadSuggestions(value);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [value, open, loadSuggestions]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (option: DestinationOption) => {
    onSelect(option);
    onChange(option.nombre);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        setSuggestions(TOP_DESTINATIONS);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex]!);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`hero-destination${open ? " is-open" : ""}${showList ? " has-suggestions" : ""}`}
    >
      <span className="hero-search-input-wrap">
        <PrimeIcon name="pi-map-marker" className="hero-search-field-icon" size={22} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
          }
          placeholder={placeholder}
          aria-describedby={ariaDescribedBy}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            setOpen(true);
            if (normalizeQuery(value).length < 2) {
              setSuggestions(TOP_DESTINATIONS);
            }
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {value.trim() ? (
          <button
            type="button"
            className="hero-destination-clear"
            aria-label="Borrar destino"
            onClick={() => {
              onChange("");
              setOpen(true);
              setSuggestions(TOP_DESTINATIONS);
              inputRef.current?.focus();
            }}
          >
            <PrimeIcon name="pi-times" size={16} />
          </button>
        ) : null}
      </span>

      {showList ? (
        <ul id={listId} className="hero-destination-list" role="listbox">
          {loading && suggestions.length === 0 ? (
            <li className="hero-destination-item hero-destination-item--muted">
              Buscando…
            </li>
          ) : null}
          {suggestions.map((item, index) => (
            <li key={`${item.tipo}-${item.nombre}-${item.departamento ?? ""}`} role="presentation">
              <button
                type="button"
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`hero-destination-item${index === activeIndex ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
              >
                <PrimeIcon
                  name="pi-map-marker"
                  className="hero-destination-item-icon"
                  size={18}
                />
                <span className="hero-destination-item-text">
                  <span className="hero-destination-item-name">{item.nombre}</span>
                  <span className="hero-destination-item-sub">{item.subtitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

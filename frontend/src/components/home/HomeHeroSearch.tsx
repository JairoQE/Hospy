import { useCallback, useEffect, useRef, useState } from "react";
import type { DestinationOption } from "../../data/destinationOptions";
import { TOP_DESTINATIONS } from "../../data/destinationOptions";
import { api } from "../../api/client";
import { PrimeIcon } from "../PrimeIcon";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { DateRangePicker } from "../calendar/DateRangePicker";
import { todayPlusDays } from "../../utils/format";
import type { SearchFilters } from "../SearchBar";
import { DestinationAutocomplete } from "./DestinationAutocomplete";
import { normalizePlaceText } from "../../utils/normalizePlaceText";

interface Props {
  onSearch: (filters: SearchFilters) => void;
}

const MOBILE_CAROUSEL_STEPS = 2;

export function HomeHeroSearch({ onSearch }: Props) {
  const { t } = useLocaleCurrency();
  const [ciudad, setCiudad] = useState("");
  const [destination, setDestination] = useState<DestinationOption | null>(null);
  const [entrada, setEntrada] = useState(todayPlusDays(7));
  const [salida, setSalida] = useState(todayPlusDays(9));
  const [carouselStep, setCarouselStep] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const stepLabels = [t("search.destination"), t("search.datesStep")];

  const scrollToStep = useCallback((index: number) => {
    const slide = slideRefs.current[index];
    if (!slide) return;
    slide.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    setCarouselStep(index);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.slide);
          if (Number.isNaN(index)) continue;
          const ratio = entry.intersectionRatio;
          if (!best || ratio > best.ratio) {
            best = { index, ratio };
          }
        }
        if (best && best.ratio >= 0.45) {
          setCarouselStep(best.index);
        }
      },
      { root: track, threshold: [0.45, 0.6, 0.85] },
    );

    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const resolveFreeTextDestination = async (
    query: string,
  ): Promise<DestinationOption | null> => {
    const q = query.trim();
    if (q.length < 2) return null;

    const target = normalizePlaceText(q);

    const localExact =
      TOP_DESTINATIONS.find((d) => normalizePlaceText(d.nombre) === target) ?? null;
    if (localExact) return localExact;

    try {
      const data = await api.get<DestinationOption[]>(
        `/ubigeo/buscar/?q=${encodeURIComponent(q)}&limit=20`,
        false,
      );
      const rows = Array.isArray(data) ? data : [];
      const exact =
        rows.find((d) => normalizePlaceText(d.nombre) === target) ??
        rows.find((d) => normalizePlaceText(d.ciudad) === target) ??
        null;
      return exact;
    } catch {
      return null;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const base: SearchFilters = {
      ciudad: "",
      entrada,
      salida,
      tipo: "",
      precio_min: "",
      precio_max: "",
      ordenar: "-rating",
    };

    let dest = destination;
    if (!dest) {
      dest = await resolveFreeTextDestination(ciudad);
      if (dest) setDestination(dest);
    }

    if (!dest) {
      onSearch({ ...base, ciudad: ciudad.trim() });
      return;
    }

    if (dest.tipo === "departamento") {
      onSearch({
        ...base,
        departamento: dest.departamento ?? dest.nombre,
      });
      return;
    }

    if (dest.tipo === "provincia") {
      onSearch({
        ...base,
        departamento: dest.departamento ?? undefined,
        provincia: dest.provincia ?? dest.nombre,
      });
      return;
    }

    onSearch({
      ...base,
      ciudad: dest.ciudad,
      departamento: dest.departamento ?? undefined,
      provincia: dest.provincia ?? undefined,
      distrito: dest.distrito ?? dest.nombre,
    });
  };

  return (
    <form className="hero-search hero-search--v2" onSubmit={submit}>
      <div className="hero-search-carousel">
        <div
          ref={trackRef}
          className="hero-search-carousel-track"
          aria-label={t("search.carouselLabel")}
        >
          <div
            ref={(el) => {
              slideRefs.current[0] = el;
            }}
            className="hero-search-slide"
            data-slide={0}
          >
            <label className="hero-search-field hero-search-field-wide hero-search-field-destination">
              <span className="hero-search-label">{t("search.where")}</span>
              <span id="hero-destination-hint" className="hero-search-field-hint">
                {t("search.destinationHint")}
              </span>
              <DestinationAutocomplete
                value={ciudad}
                onChange={(v) => {
                  setCiudad(v);
                  setDestination(null);
                }}
                onSelect={(opt) => setDestination(opt)}
                placeholder={t("search.destinationPlaceholder")}
                ariaDescribedBy="hero-destination-hint"
              />
            </label>
          </div>

          <div
            ref={(el) => {
              slideRefs.current[1] = el;
            }}
            className="hero-search-slide"
            data-slide={1}
          >
            <div className="hero-search-field hero-search-field-dates">
              <DateRangePicker
                variant="hero"
                className="hero-date-picker"
                startDate={entrada}
                endDate={salida}
                minDate={todayPlusDays(0)}
                showPresets
                onChange={(start, end) => {
                  setEntrada(start);
                  if (end) setSalida(end);
                }}
              />
            </div>
          </div>
        </div>

        <div className="hero-search-carousel-footer" aria-hidden={false}>
          <p className="hero-search-carousel-step-name">{stepLabels[carouselStep]}</p>
          <div
            className="hero-search-carousel-dots"
            role="tablist"
            aria-label={t("search.carouselLabel")}
          >
            {Array.from({ length: MOBILE_CAROUSEL_STEPS }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                className={`hero-search-carousel-dot${carouselStep === i ? " is-active" : ""}`}
                aria-selected={carouselStep === i}
                aria-label={stepLabels[i]}
                onClick={() => scrollToStep(i)}
              />
            ))}
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-hero-search btn-hero-search--v2">
        <PrimeIcon name="pi-search" size={24} />
        <span>{t("search.searchBtn")}</span>
      </button>
    </form>
  );
}

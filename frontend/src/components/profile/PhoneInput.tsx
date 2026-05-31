import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildPhoneValue,
  formatNationalDigits,
  parsePhoneValue,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from "../../utils/phoneCountries";
import { PhoneFlag } from "./PhoneFlag";
import "../../styles/phone-input.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
};

export function PhoneInput({ value, onChange, disabled, id }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const countryBtnRef = useRef<HTMLButtonElement>(null);
  const parsed = parsePhoneValue(value);
  const [country, setCountry] = useState<PhoneCountry>(parsed.country);
  const [nationalDigits, setNationalDigits] = useState(parsed.nationalDigits);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const next = parsePhoneValue(value);
    setCountry(next.country);
    setNationalDigits(next.nationalDigits);
  }, [value]);

  const updateDropdownPosition = () => {
    const btn = countryBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      minWidth: Math.max(rect.width, 260),
      zIndex: 10000,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const portal = document.getElementById(listId);
      if (portal?.contains(target)) return;
      setOpen(false);
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, listId]);

  const emit = (nextCountry: PhoneCountry, nextNational: string) => {
    onChange(buildPhoneValue(nextCountry, nextNational));
  };

  const selectCountry = (next: PhoneCountry) => {
    setCountry(next);
    setOpen(false);
    emit(next, nationalDigits);
  };

  const onNationalChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, country.maxNational);
    setNationalDigits(digits);
    emit(country, digits);
  };

  const displayNational = formatNationalDigits(nationalDigits, country.groups);

  const dropdown =
    open &&
    createPortal(
      <ul
        id={listId}
        className="phone-input-dropdown"
        role="listbox"
        style={dropdownStyle}
      >
        {PHONE_COUNTRIES.map((c) => (
          <li key={c.iso} role="option" aria-selected={c.iso === country.iso}>
            <button
              type="button"
              className="phone-input-dropdown-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectCountry(c)}
            >
              <PhoneFlag iso={c.iso} />
              <span className="phone-input-dropdown-name">{c.name}</span>
              <span className="phone-input-dropdown-dial">+{c.dial}</span>
            </button>
          </li>
        ))}
      </ul>,
      document.body,
    );

  return (
    <>
      <div
        ref={rootRef}
        className={`phone-input${disabled ? " phone-input--disabled" : ""}`}
      >
        <div className="phone-input-country-wrap">
          <button
            ref={countryBtnRef}
            type="button"
            className="phone-input-country"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listId}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          >
            <PhoneFlag iso={country.iso} />
            <span className="phone-input-caret" aria-hidden />
          </button>
        </div>
        <span className="phone-input-prefix" aria-hidden>
          +{country.dial}
        </span>
        <input
          id={id}
          type="tel"
          className="phone-input-field"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          value={displayNational}
          placeholder={formatNationalDigits(
            "912345678".slice(0, country.maxNational),
            country.groups,
          )}
          onChange={(e) => onNationalChange(e.target.value)}
        />
      </div>
      {dropdown}
    </>
  );
}

/** Formatea un teléfono guardado para mostrar en lectura. */
export function formatPhoneDisplay(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "Sin registrar";
  const { country, nationalDigits } = parsePhoneValue(trimmed);
  if (!nationalDigits) return trimmed;
  return buildPhoneValue(country, nationalDigits);
}

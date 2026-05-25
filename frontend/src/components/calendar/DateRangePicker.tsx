import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { compareDateStr, formatDisplayDate, nightsBetween } from "../../utils/calendarDates";
import { DateRangeCalendar } from "./DateRangeCalendar";
import "../../styles/date-range-calendar.css";

const POPOVER_WIDTH = 720;

type Props = {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  minDate?: string;
  mode?: "range" | "single";
  checkInLabel?: string;
  checkOutLabel?: string;
  showPresets?: boolean;
  marketingHint?: string;
  className?: string;
  variant?: "default" | "hero";
  onApply?: () => void;
  applyLabel?: string;
  confirmLabel?: string;
};

type PopoverCoords = {
  top: number;
  left: number;
  width: number;
};

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate,
  mode = "range",
  checkInLabel,
  checkOutLabel,
  showPresets = true,
  marketingHint,
  className = "",
  variant = "default",
  onApply,
  applyLabel,
  confirmLabel,
}: Props) {
  const { language, t } = useLocaleCurrency();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const fromLabel = checkInLabel ?? t("search.checkIn");
  const toLabel = checkOutLabel ?? t("search.checkOut");
  const isHero = variant === "hero";

  useEffect(() => {
    if (open) {
      setDraftStart(startDate);
      setDraftEnd(endDate);
    }
  }, [open, startDate, endDate]);

  const updatePosition = useCallback(() => {
    const anchor = wrapRef.current;
    if (!anchor) return;

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (mobile) {
      setCoords({ top: 0, left: 0, width: window.innerWidth });
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - 24);
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    const top = rect.bottom + 10;
    setCoords({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    if (window.matchMedia("(max-width: 767px)").matches) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleDraftChange = (start: string | null, end: string | null) => {
    setDraftStart(start ?? "");
    setDraftEnd(end ?? "");
    if (mode === "single" && start) {
      onChange(start, "");
      setOpen(false);
    }
  };

  const canConfirm =
    mode === "single"
      ? Boolean(draftStart)
      : Boolean(
          draftStart && draftEnd && compareDateStr(draftEnd, draftStart) > 0,
        );

  const confirmSelection = () => {
    if (!canConfirm) return;
    onChange(draftStart, mode === "range" ? draftEnd : "");
    onApply?.();
    setOpen(false);
  };

  const draftSummary =
    mode === "range" && draftStart && draftEnd
      ? `${formatDisplayDate(draftStart, language)} → ${formatDisplayDate(draftEnd, language)}`
      : draftStart
        ? formatDisplayDate(draftStart, language)
        : "—";

  const nights =
    mode === "range" && draftStart && draftEnd
      ? nightsBetween(draftStart, draftEnd)
      : 0;

  const confirmText =
    confirmLabel ??
    applyLabel ??
    (onApply ? t("detail.viewPrices") : t("calendar.selectDates"));

  const toggle = () => setOpen((o) => !o);

  const popover =
    open &&
    coords &&
    createPortal(
      <>
        <div
          className="date-picker-backdrop"
          aria-hidden
          onClick={() => setOpen(false)}
        />
        <div
          ref={popoverRef}
          className={`date-picker-popover date-picker-popover--portal${isHero ? " date-picker-popover--hero" : ""}`}
          id={`${id}-popover`}
          role="dialog"
          aria-modal="true"
          aria-label={t("calendar.dialogLabel")}
          style={
            isMobile
              ? undefined
              : {
                  position: "fixed",
                  top: coords.top,
                  left: coords.left,
                  width: coords.width,
                }
          }
        >
          <div className="date-picker-popover-head">
            <span className="date-picker-popover-summary">{draftSummary}</span>
            {nights > 0 && (
              <span className="date-picker-popover-nights">
                {language === "en"
                  ? nights === 1
                    ? "1 night"
                    : `${nights} nights`
                  : nights === 1
                    ? "1 noche"
                    : `${nights} noches`}
              </span>
            )}
          </div>
          <DateRangeCalendar
            mode={mode}
            startDate={draftStart || null}
            endDate={draftEnd || null}
            onChange={handleDraftChange}
            minDate={minDate}
            language={language}
            showPresets={showPresets}
            showToolbar={!isHero}
            showFooter={!isHero}
            marketingHint={isHero ? undefined : marketingHint}
          />
          <div className="date-picker-popover-footer">
            <button
              type="button"
              className="date-picker-btn-cancel"
              onClick={() => setOpen(false)}
            >
              {t("calendar.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary date-picker-btn-confirm"
              disabled={!canConfirm}
              onClick={confirmSelection}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </>,
      document.body,
    );

  const displaySummary =
    mode === "range" && startDate && endDate
      ? `${formatDisplayDate(startDate, language)} → ${formatDisplayDate(endDate, language)}`
      : startDate
        ? formatDisplayDate(startDate, language)
        : "—";

  return (
    <div
      className={`date-picker-wrap${open ? " is-open" : ""}${isHero ? " date-picker-wrap--hero" : ""} ${className}`.trim()}
      ref={wrapRef}
    >
      <div className="date-picker-mobile-bar" aria-live="polite">
        {open ? draftSummary : displaySummary}
        {nights > 0 && open && (
          <span className="date-picker-mobile-bar-nights">
            {language === "en" ? `${nights} nights` : `${nights} noches`}
          </span>
        )}
      </div>
      <div className="date-picker-trigger-row">
        <button
          type="button"
          className={`date-picker-trigger${open ? " is-open" : ""}`}
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={`${id}-popover`}
        >
          <span className="date-picker-trigger-label">{fromLabel}</span>
          <span className="date-picker-trigger-value">
            {startDate ? formatDisplayDate(startDate, language) : "—"}
          </span>
        </button>
        {mode === "range" && (
          <button
            type="button"
            className={`date-picker-trigger${open ? " is-open" : ""}`}
            onClick={toggle}
            aria-expanded={open}
          >
            <span className="date-picker-trigger-label">{toLabel}</span>
            <span className="date-picker-trigger-value">
              {endDate ? formatDisplayDate(endDate, language) : "—"}
            </span>
          </button>
        )}
      </div>
      {popover}
    </div>
  );
}

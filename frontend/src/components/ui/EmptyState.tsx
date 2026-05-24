import { PrimeIcon } from "../PrimeIcon";

type Props = {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon = "pi-search",
  title,
  message,
  actionLabel,
  onAction,
}: Props) {
  return (
    <div className="empty-state" role="status">
      <PrimeIcon name={icon} className="empty-state-icon" />
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

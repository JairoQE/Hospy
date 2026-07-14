import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { fetchUserFollowers, fetchUserFollowing, toggleUserFollow } from "../../api/follows";
import type { FollowListUser } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { peerPublicProfilePath } from "../../utils/peerProfilePath";
import { IconSpinner } from "../icons";
import { PrimeIcon } from "../PrimeIcon";
import { showAppToast } from "../ui/AppToast";
import { UserAvatar } from "../UserAvatar";
import { UserNameWithBadge } from "../UserNameWithBadge";

export type FollowListTab = "followers" | "following";

type Props = {
  open: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  followersCount: number;
  followingCount: number;
  initialTab?: FollowListTab;
};

function formatTabCount(n: number): string {
  return n.toLocaleString("es-PE");
}

function canFollowUser(item: FollowListUser, meId?: number): boolean {
  if (item.is_self) return false;
  if (meId != null && item.id === meId) return false;
  return true;
}

export function FollowListModal({
  open,
  onClose,
  userId,
  userName,
  followersCount,
  followingCount,
  initialTab = "followers",
}: Props) {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [tab, setTab] = useState<FollowListTab>(initialTab);
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [followLoadingId, setFollowLoadingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!open || !userId) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const data =
        tab === "followers"
          ? await fetchUserFollowers(userId)
          : await fetchUserFollowing(userId);
      setUsers(data);
    } catch (e) {
      setUsers([]);
      setLoadFailed(true);
      showAppToast(
        e instanceof ApiError ? e.message : "No se pudo cargar la lista",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [open, tab, userId]);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handleFollowToggle = async (target: FollowListUser) => {
    if (!canFollowUser(target, me?.id)) return;
    if (!me) {
      onClose();
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }
    setFollowLoadingId(target.id);
    try {
      const res = await toggleUserFollow(target.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, is_following: res.following } : u)),
      );
    } catch (e) {
      showAppToast(
        e instanceof ApiError ? e.message : "No se pudo actualizar el seguimiento",
        "error",
      );
    } finally {
      setFollowLoadingId(null);
    }
  };

  if (!open) return null;

  const emptyLabel = loadFailed
    ? "No se pudo cargar la lista."
    : tab === "followers"
      ? "Todavía no tiene seguidores."
      : "Todavía no sigue a nadie.";

  return (
    <div
      className="follow-list-overlay"
      role="dialog"
      aria-modal
      aria-labelledby="follow-list-title"
      onClick={onClose}
    >
      <div className="follow-list-modal" onClick={(e) => e.stopPropagation()}>
        <header className="follow-list-header">
          <h2 id="follow-list-title" className="follow-list-title">
            {userName}
          </h2>
          <button
            type="button"
            className="follow-list-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <PrimeIcon name="pi-times" size={18} />
          </button>
        </header>

        <nav className="follow-list-tabs" aria-label="Seguidores y siguiendo">
          <button
            type="button"
            className={`follow-list-tab${tab === "followers" ? " is-active" : ""}`}
            onClick={() => setTab("followers")}
          >
            Seguidores {formatTabCount(followersCount)}
          </button>
          <button
            type="button"
            className={`follow-list-tab${tab === "following" ? " is-active" : ""}`}
            onClick={() => setTab("following")}
          >
            Siguiendo {formatTabCount(followingCount)}
          </button>
        </nav>

        <div className="follow-list-body">
          {loading ? (
            <div className="follow-list-state">
              <IconSpinner size={28} />
            </div>
          ) : users.length === 0 ? (
            <div className="follow-list-state">
              <p className="follow-list-empty">{emptyLabel}</p>
              {loadFailed && (
                <button type="button" className="follow-list-retry" onClick={() => void load()}>
                  Reintentar
                </button>
              )}
            </div>
          ) : (
            <ul className="follow-list-users">
              {users.map((item) => {
                const profilePath = peerPublicProfilePath(item.id, item.role);
                const showFollow = canFollowUser(item, me?.id);
                return (
                  <li key={item.id} className="follow-list-row">
                    <Link
                      to={profilePath}
                      className="follow-list-user-link"
                      onClick={onClose}
                    >
                      <UserAvatar user={item} size="md" className="follow-list-avatar" />
                      <span className="follow-list-user-text">
                        <UserNameWithBadge
                          name={<strong className="follow-list-user-name">{item.display_name}</strong>}
                          verified={item.is_identity_verified}
                          badgeSize={15}
                        />
                        <span className="follow-list-user-handle">@{item.username}</span>
                      </span>
                    </Link>
                    {showFollow ? (
                      <button
                        type="button"
                        className={`follow-list-follow-btn${
                          item.is_following ? " is-following" : ""
                        }`}
                        disabled={followLoadingId === item.id}
                        onClick={() => void handleFollowToggle(item)}
                      >
                        {followLoadingId === item.id
                          ? "…"
                          : item.is_following
                            ? "Siguiendo"
                            : "Seguir"}
                      </button>
                    ) : (
                      <span className="follow-list-you-badge">Tú</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

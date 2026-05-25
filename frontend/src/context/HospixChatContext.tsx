import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useChatDock } from "./ChatDockContext";
import { useInboxSummary } from "../hooks/useInboxSummary";
import { proactiveHint } from "../data/chatFlows";
import {
  getHospixSessionId,
  hospixUseBackend,
  mapFlowState,
  postHospixChat,
  setHospixSessionId,
} from "../api/hospix";
import {
  getWelcomeReplies,
  processAction,
  processUserInput,
  simulateReplyDelay,
} from "../services/hospixEngine";
import type {
  HospixAction,
  HospixAudience,
  HospixContext,
  HospixFlowState,
  HospixMessage,
} from "../types/hospix";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function withIds(partials: Omit<HospixMessage, "id" | "at">[]): HospixMessage[] {
  const now = Date.now();
  return partials.map((p, i) => ({
    ...p,
    id: uid(),
    at: now + i,
  }));
}

function resolveAudience(
  pathname: string,
  role: string | undefined,
  isAuthenticated: boolean,
): HospixAudience {
  if (pathname.startsWith("/admin")) return "admin";
  if (role === "propietario" && pathname.startsWith("/panel")) return "propietario";
  if (role === "administrador") return "admin";
  if (role === "propietario") return "propietario";
  if (isAuthenticated) return "huesped";
  return "guest";
}

function buildHistoryForApi(messages: HospixMessage[]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "hospix")
    .slice(-10)
    .map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text ?? m.markdown ?? "",
    }))
    .filter((h) => h.content.trim());
}

type HospixChatContextValue = {
  context: HospixContext;
  messages: HospixMessage[];
  isOpen: boolean;
  isMinimized: boolean;
  isTyping: boolean;
  error: string | null;
  badgeCount: number;
  messengerOpen: boolean;
  authLoading: boolean;
  open: () => void;
  openFromBubble: () => void;
  close: () => void;
  minimize: () => void;
  maximize: () => void;
  sendMessage: (text: string) => Promise<void>;
  handleAction: (action: HospixAction) => Promise<void>;
  retry: () => void;
};

const HospixChatContext = createContext<HospixChatContextValue | null>(null);

export function HospixChatProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { windows: messengerWindows } = useChatDock();
  const { summary } = useInboxSummary(45000);
  const useBackend = hospixUseBackend();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<HospixMessage[]>([]);
  const [flowState, setFlowState] = useState<HospixFlowState>({
    flowId: null,
    step: 0,
    data: {},
  });
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const welcomedRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const context: HospixContext = useMemo(
    () => ({
      audience: resolveAudience(pathname, user?.role, Boolean(user)),
      pathname,
      isAuthenticated: Boolean(user),
      userName: user ? `${user.first_name} ${user.last_name}`.trim() : undefined,
      formalTone:
        user?.role === "propietario" || user?.role === "administrador",
      inboxUnread: summary.mensajes + summary.notificaciones,
    }),
    [pathname, user, summary.mensajes, summary.notificaciones],
  );

  const badgeCount = context.inboxUnread;
  const messengerOpen = messengerWindows.length > 0;

  const appendHospix = useCallback((partials: Omit<HospixMessage, "id" | "at">[]) => {
    setMessages((prev) => [...prev, ...withIds(partials)]);
  }, []);

  const appendUser = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text, at: Date.now() },
    ]);
  }, []);

  const applyApiResult = useCallback(
    (res: {
      session_id: string;
      replies: Omit<HospixMessage, "id" | "at">[];
      flow_state?: Parameters<typeof mapFlowState>[0];
    }) => {
      setHospixSessionId(res.session_id);
      if (res.replies.length) appendHospix(res.replies);
      if (res.flow_state) setFlowState(mapFlowState(res.flow_state));
    },
    [appendHospix],
  );

  const runWithTyping = useCallback(
    async (work: () => Promise<Omit<HospixMessage, "id" | "at">[]>) => {
      setIsTyping(true);
      setError(null);
      const delay = simulateReplyDelay(40);
      await new Promise((r) => {
        typingTimerRef.current = window.setTimeout(r, delay);
      });
      try {
        const partials = await work();
        if (partials.length) appendHospix(partials);
      } catch {
        setError(
          "Ups, Hospix está teniendo problemas técnicos. Intenta de nuevo en unos segundos. 🛠️",
        );
      } finally {
        setIsTyping(false);
      }
    },
    [appendHospix],
  );

  const callBackend = useCallback(
    async (payload: Parameters<typeof postHospixChat>[0]) => {
      const res = await postHospixChat({
        pathname,
        session_id: getHospixSessionId() ?? undefined,
        history: buildHistoryForApi(messagesRef.current),
        ...payload,
      });
      applyApiResult(res);
      return res.replies;
    },
    [applyApiResult, pathname],
  );

  const showWelcome = useCallback(async () => {
    if (useBackend) {
      try {
        await runWithTyping(async () => {
          await callBackend({ welcome: true });
          return [];
        });
      } catch {
        await runWithTyping(async () => getWelcomeReplies(context).replies);
      }
    } else {
      await runWithTyping(async () => getWelcomeReplies(context).replies);
    }
    const hint = proactiveHint(context);
    if (hint) {
      await runWithTyping(async () => [
        {
          role: "hospix",
          markdown: hint,
          actions: [{ id: "inbox", label: "Abrir bandeja", type: "navigate", target: "/bandeja" }],
        },
      ]);
    }
  }, [callBackend, context, runWithTyping, useBackend]);

  const open = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    if (!welcomedRef.current && messages.length === 0) {
      welcomedRef.current = true;
      void showWelcome();
    }
  }, [messages.length, showWelcome]);

  const openFromBubble = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    if (!welcomedRef.current && messages.length === 0) {
      welcomedRef.current = true;
      void showWelcome();
    }
  }, [messages.length, showWelcome]);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const minimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const maximize = useCallback(() => {
    setIsMinimized(false);
    setIsOpen(true);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;
      appendUser(trimmed);
      await runWithTyping(async () => {
        if (useBackend) {
          try {
            await callBackend({ message: trimmed });
            return [];
          } catch {
            /* fallback local */
          }
        }
        const result = processUserInput(trimmed, flowState, context);
        setFlowState(result.nextState);
        return result.replies;
      });
    },
    [appendUser, callBackend, context, flowState, isTyping, runWithTyping, useBackend],
  );

  const handleAction = useCallback(
    async (action: HospixAction) => {
      if (action.type === "navigate" && action.target) {
        setIsMinimized(true);
        navigate(action.target);
        return;
      }
      if (action.type === "send" && action.message) {
        await sendMessage(action.message);
        return;
      }
      if (action.type === "retry") {
        setError(null);
        await showWelcome();
        return;
      }
      if (action.type === "flow") {
        if (useBackend) {
          try {
            if (action.message) appendUser(action.message);
            await runWithTyping(async () => {
              await callBackend({
                message: action.message ?? "",
                action_id: action.id,
                action_target: action.target,
              });
              return [];
            });
            return;
          } catch {
            /* fallback */
          }
        }
        const result = processAction(action.id, action.target, flowState, context);
        if (result === "navigate") return;
        if (result) {
          if (action.message) appendUser(action.message);
          await runWithTyping(async () => {
            setFlowState(result.nextState);
            return result.replies;
          });
        }
      }
    },
    [
      appendUser,
      callBackend,
      context,
      flowState,
      navigate,
      runWithTyping,
      sendMessage,
      showWelcome,
      useBackend,
    ],
  );

  const retry = useCallback(() => {
    setError(null);
    void showWelcome();
  }, [showWelcome]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isMinimized) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, isOpen, isMinimized]);

  const value = useMemo(
    () => ({
      context,
      messages,
      isOpen,
      isMinimized,
      isTyping,
      error,
      badgeCount,
      messengerOpen,
      authLoading,
      open,
      openFromBubble,
      close,
      minimize,
      maximize,
      sendMessage,
      handleAction,
      retry,
    }),
    [
      context,
      messages,
      isOpen,
      isMinimized,
      isTyping,
      error,
      badgeCount,
      messengerOpen,
      authLoading,
      open,
      openFromBubble,
      close,
      minimize,
      maximize,
      sendMessage,
      handleAction,
      retry,
    ],
  );

  return (
    <HospixChatContext.Provider value={value}>{children}</HospixChatContext.Provider>
  );
}

export function useChatbot() {
  const ctx = useContext(HospixChatContext);
  if (!ctx) {
    throw new Error("useChatbot debe usarse dentro de HospixChatProvider");
  }
  return ctx;
}

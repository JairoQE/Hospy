export type InboxCanal = "notificacion" | "mensaje";

export interface InboxItem {
  id: number;
  channel: InboxCanal;
  title: string;
  body: string;
  link: string;
  kind: string;
  is_read: boolean;
  sender_name: string | null;
  sender_photo_url?: string | null;
  conversation_id?: number | null;
  accommodation_id?: number | null;
  accommodation_name?: string | null;
  /** Fecha del último mensaje (no de la última sincronización). */
  thread_at?: string;
  created_at: string;
  updated_at?: string;
}

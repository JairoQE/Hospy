export type UserRole = "huesped" | "propietario" | "patrocinador" | "administrador";

export type OwnerStatus = "pendiente" | "aprobado" | "rechazado" | "";
export type SponsorStatus = "pendiente" | "aprobado" | "rechazado" | "";

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  owner_status?: OwnerStatus;
  owner_rejection_reason?: string;
  sponsor_status?: SponsorStatus;
  sponsor_rejection_reason?: string;
  sponsor_warning_message?: string;
  sponsor_warning_at?: string | null;
  phone: string;
  photo: string | null;
  photo_url?: string | null;
  cover_photo?: string | null;
  cover_photo_url?: string | null;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  owner_average_rating?: number;
  owner_reviews_count?: number;
  accommodations_count?: number;
  accommodations?: AccommodationListItem[];
  date_joined: string;
  last_login: string | null;
}

export interface PublicUserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  bio: string;
  photo_url: string | null;
  cover_photo_url: string | null;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_self: boolean;
  role_category: string;
  date_joined: string;
  owner_average_rating?: number;
  owner_reviews_count?: number;
  accommodations_count?: number;
  accommodations?: AccommodationListItem[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AccommodationListItem {
  id: number;
  name: string;
  type: string;
  city: string;
  average_rating: string | number;
  precio_desde: string | number | null;
  precio_desde_original?: string | number | null;
  oferta_activa?: boolean;
  descuento_porcentaje?: string | number | null;
  foto_principal: string | null;
  distance_km?: number | null;
  created_at?: string;
  status?: string;
  is_active?: boolean;
}

export interface OwnerReviewPreview {
  id: number;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  comment: string;
  created_at: string;
  accommodation_name: string;
}

export interface OwnerStoreListingItem extends AccommodationListItem {
  region?: string;
  services_preview?: { slug: string; name: string }[];
  max_capacity?: number | null;
}

/** Perfil público del propietario (vista detallada). */
export type OwnerStoreProfile = PublicUserProfile & {
  recent_reviews?: OwnerReviewPreview[];
  identity_verified?: boolean;
  is_superhost?: boolean;
  responds_fast?: boolean;
  response_time_label?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  languages?: string[];
  accommodations?: OwnerStoreListingItem[];
};

export interface OfferRoomSummary {
  id: number;
  number: string;
  type: string;
  base_price: string | number;
}

export interface AccommodationOffer {
  id: number;
  title: string;
  discount_percent: string | number;
  start_date: string;
  duration_days: number;
  end_date: string;
  is_active: boolean;
  rooms: OfferRoomSummary[];
  vigente: boolean;
  dias_restantes: number;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  icon: string;
  is_active: boolean;
}

export interface AccommodationPhoto {
  id: number;
  image: string;
  image_url: string | null;
  is_primary: boolean;
  order: number;
}

export interface AccommodationFaq {
  id: number;
  question: string;
  answer: string;
  order: number;
}

export interface AccommodationFaqInput {
  question: string;
  answer: string;
}

export interface AccommodationDetail {
  id: number;
  name: string;
  type: string;
  description: string;
  status: string;
  is_active: boolean;
  rejection_reason: string;
  address: string;
  city: string;
  region: string;
  country: string;
  latitude: string | number;
  longitude: string | number;
  average_rating: string | number;
  services: Service[];
  fotos: AccommodationPhoto[];
  faqs?: AccommodationFaq[];
  owner_email: string;
  propietario_id: number;
  /** Nombre público para titulares (ej. otros alojamientos del mismo propietario). */
  propietario_nombre: string;
  propietario_bio?: string;
  propietario_telefono: string;
  propietario_foto_url: string | null;
  propietario_seguidores?: number;
  propietario_calificacion?: number;
  propietario_resenas_total?: number;
  otros_mismo_propietario: AccommodationListItem[];
  created_at: string;
  updated_at: string;
}

export interface BrowseTile {
  id: number;
  group: "tipo" | "region" | "departamento";
  title: string;
  subtitle?: string;
  slug: string;
  filter_value: string;
  image_url: string | null;
  gradient_css: string;
  order: number;
  is_active?: boolean;
}

export interface RoomPhoto {
  id: number;
  image: string;
  image_url: string | null;
  order: number;
}

export interface RoomPublic {
  id: number;
  number: string;
  type: string;
  capacity: number;
  floor: number | null;
  description: string;
  base_price: string | number;
  fotos?: RoomPhoto[];
}

/** Habitación en panel del propietario (CRUD). */
export interface Room {
  id: number;
  accommodation: number;
  accommodation_name?: string;
  number: string;
  type: string;
  capacity: number;
  floor: number | null;
  description: string;
  base_price: string | number;
  precio_base?: string | number;
  is_active: boolean;
  created_at: string;
}

export interface PriceBreakdown {
  noches: number;
  total: string | number;
  desglose?: {
    fecha: string;
    precio: string | number;
    price_before_discount?: string | number;
    offer_applied?: boolean;
  }[];
  offer_applied?: boolean;
  offer_nights_count?: number;
}

export interface Booking {
  id: number;
  hospedaje: string;
  habitacion: string;
  ciudad: string;
  huesped: { id: number; email: string; nombre: string };
  check_in: string;
  check_out: string;
  total_amount: string | number;
  status: string;
  created_at: string;
  room_id?: number;
  desglose_precio?: PriceBreakdown | null;
  updated_at?: string;
}

export interface Review {
  id: number;
  accommodation: number;
  autor_nombre: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  // JWT login no devuelve user; se carga con /perfil/
}

export interface RegisterResponse extends AuthTokens {
  user: User;
}

export interface ChatMessage {
  id: number;
  sender: number;
  sender_name: string;
  sender_photo_url: string | null;
  body: string;
  is_mine: boolean;
  /** Cuándo el otro participante leyó este mensaje (solo en mensajes propios). */
  seen_at?: string | null;
  created_at: string;
}

export interface Conversation {
  id: number;
  accommodation: number;
  accommodation_name: string;
  guest: number;
  guest_name: string;
  guest_photo_url: string | null;
  owner: number;
  owner_name: string;
  owner_photo_url: string | null;
  last_message_at: string | null;
  last_message_preview: string;
  created_at: string;
}

export interface ChatInquiryResponse {
  conversation: Conversation | null;
  messages: ChatMessage[];
  propietario_nombre?: string;
  propietario_foto_url?: string | null;
}

export interface MessageReport {
  id: number;
  message_id: number;
  message_body: string;
  message_created_at: string;
  sender_id: number;
  sender_name: string;
  sender_email: string;
  reporter_name: string;
  reporter_email: string;
  accommodation_id: number;
  accommodation_name: string;
  reason: string;
  reason_label: string;
  detail: string;
  status: string;
  status_label: string;
  admin_notes: string;
  reviewed_by_name: string;
  created_at: string;
  reviewed_at: string | null;
}

export type SponsorAdMediaType = "image" | "gif" | "video";

export interface SponsorAd {
  id: number;
  title: string;
  link_url: string;
  media?: string;
  media_url: string | null;
  media_type: SponsorAdMediaType;
  duration_seconds: number;
  status: "pendiente" | "aprobado" | "rechazado" | "baja";
  takedown_reason?: string;
  rejection_reason?: string;
  is_active: boolean;
  display_order: number;
  sponsor?: number;
  sponsor_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SponsorAdReport {
  id: number;
  ad: number;
  ad_title: string;
  ad_media_url: string | null;
  sponsor_email: string;
  sponsor_name: string;
  reporter_name: string;
  reason: string;
  reason_label: string;
  detail: string;
  status: string;
  admin_notes?: string;
  warning_sent?: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface SponsorContactConfig {
  admin_email: string;
  admin_phone: string;
  admin_whatsapp: string;
  admin_whatsapp_url: string;
  max_duration_seconds: number;
}

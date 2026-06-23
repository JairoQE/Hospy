import { api } from "./client";
import type { User } from "./types";

export type RequestOwnerResponse = {
  detail: string;
  user: User;
};

export function requestOwnerRole() {
  return api.post<RequestOwnerResponse>("/auth/solicitar-propietario/", {});
}

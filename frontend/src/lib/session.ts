import { apiGet, apiPost } from "./api";
import { toUser } from "./normalize";

export const fetchMe = () => apiGet<Record<string, unknown>>("/auth/me").then(toUser);

export const signOut = () => apiPost<void>("/auth/logout");

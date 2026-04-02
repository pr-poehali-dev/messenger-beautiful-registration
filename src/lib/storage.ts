import { User, Chat, Message } from "./types";

// API base URLs for backend functions
const AUTH_URL = "https://functions.poehali.dev/p87867187/auth";
const CHATS_URL = "https://functions.poehali.dev/p87867187/chats";

const TOKEN_KEY = "msng_token";
const USER_KEY = "msng_current_user";

// ---- Token ----
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getCachedUser(): User | null {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setCachedUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ---- Helpers ----
async function apiFetch(
  baseUrl: string,
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    token?: string;
  } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error("Ошибка сервера");
  }
  return { ok: res.ok, status: res.status, data };
}

// ---- Auth API ----
export async function register(
  username: string,
  display_name: string,
  email: string,
  password: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    const { ok, data } = await apiFetch(AUTH_URL, "/auth/register", {
      method: "POST",
      body: { username, display_name, email, password },
    });
    if (!ok) return { error: data.error || "Ошибка регистрации" };
    setStoredToken(data.token);
    setCachedUser(data.user);
    return { user: data.user, token: data.token };
  } catch (e) {
    return { error: "Не удалось подключиться к серверу" };
  }
}

export async function login(
  loginStr: string,
  password: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    const { ok, data } = await apiFetch(AUTH_URL, "/auth/login", {
      method: "POST",
      body: { login: loginStr, password },
    });
    if (!ok) return { error: data.error || "Ошибка входа" };
    setStoredToken(data.token);
    setCachedUser(data.user);
    return { user: data.user, token: data.token };
  } catch (e) {
    return { error: "Не удалось подключиться к серверу" };
  }
}

export async function logout(token: string) {
  try {
    await apiFetch(AUTH_URL, "/auth/logout", {
      method: "POST",
      token,
    });
  } catch {
    // ignore
  }
  clearStoredToken();
}

export async function getCurrentUser(token: string): Promise<User | null> {
  try {
    const { ok, data } = await apiFetch(AUTH_URL, "/auth/me", { token });
    if (!ok) return null;
    setCachedUser(data.user);
    return data.user;
  } catch {
    // Fallback to cached
    return getCachedUser();
  }
}

// ---- Chats API ----
export async function getUserChats(token: string): Promise<Chat[]> {
  try {
    const { ok, data } = await apiFetch(CHATS_URL, "/chats", { token });
    if (!ok) return [];
    return data.chats || [];
  } catch {
    return [];
  }
}

export async function createChat(
  token: string,
  userId: string
): Promise<{ chat_id: string } | { error: string }> {
  try {
    const { ok, data } = await apiFetch(CHATS_URL, "/chats", {
      method: "POST",
      token,
      body: { user_id: userId },
    });
    if (!ok) return { error: data.error || "Ошибка создания чата" };
    return { chat_id: data.chat_id };
  } catch {
    return { error: "Не удалось создать чат" };
  }
}

export async function getChatMessages(
  token: string,
  chatId: string,
  limit = 50,
  offset = 0
): Promise<Message[]> {
  try {
    const { ok, data } = await apiFetch(
      CHATS_URL,
      `/chats/${chatId}/messages?limit=${limit}&offset=${offset}`,
      { token }
    );
    if (!ok) return [];
    return data.messages || [];
  } catch {
    return [];
  }
}

export async function sendMessage(
  token: string,
  chatId: string,
  content: string
): Promise<Message | null> {
  try {
    const { ok, data } = await apiFetch(CHATS_URL, `/chats/${chatId}/messages`, {
      method: "POST",
      token,
      body: { content },
    });
    if (!ok) return null;
    return data.message;
  } catch {
    return null;
  }
}

// ---- Users API ----
export async function searchUsers(
  token: string,
  query: string
): Promise<User[]> {
  try {
    const { ok, data } = await apiFetch(
      CHATS_URL,
      `/chats/users/search?q=${encodeURIComponent(query)}`,
      { token }
    );
    if (!ok) return [];
    return data.users || [];
  } catch {
    return [];
  }
}

export async function getOnlineUsers(token: string): Promise<User[]> {
  try {
    const { ok, data } = await apiFetch(
      CHATS_URL,
      "/chats/users/online",
      { token }
    );
    if (!ok) return [];
    return data.users || [];
  } catch {
    return [];
  }
}

export async function updateUser(
  token: string,
  updates: {
    display_name?: string;
    bio?: string;
    avatar_color?: string;
    email?: string;
  }
): Promise<{ user: User } | { error: string }> {
  try {
    const { ok, data } = await apiFetch(CHATS_URL, "/chats/users/profile", {
      method: "PUT",
      token,
      body: updates as Record<string, unknown>,
    });
    if (!ok) return { error: data.error || "Ошибка обновления" };
    setCachedUser(data.user);
    return { user: data.user };
  } catch {
    return { error: "Не удалось обновить профиль" };
  }
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: true } | { error: string }> {
  try {
    const { ok, data } = await apiFetch(CHATS_URL, "/chats/users/password", {
      method: "PUT",
      token,
      body: { current_password: currentPassword, new_password: newPassword },
    });
    if (!ok) return { error: data.error || "Ошибка смены пароля" };
    return { success: true };
  } catch {
    return { error: "Не удалось сменить пароль" };
  }
}

// These are no longer needed but kept for backwards compat during transition
export function initDemoData() {
  // No-op - data is in the database now
}

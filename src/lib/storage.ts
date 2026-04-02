import { User, Chat, Message } from "./types";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const KEYS = {
  users: "msng_users",
  chats: "msng_chats",
  messages: "msng_messages",
  sessions: "msng_sessions",
  currentToken: "msng_token",
};

function generateId(): string {
  return uuid();
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#22c55e","#14b8a6","#3b82f6","#06b6d4","#a855f7"];
function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function hashPassword(password: string): string {
  let hash = 0;
  const salt = Math.random().toString(36).substring(2, 10);
  const salted = salt + password;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${salt}:${Math.abs(hash).toString(36)}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const salted = salt + password;
  let h = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    h = (h << 5) - h + char;
    h = h & h;
  }
  return Math.abs(h).toString(36) === hash;
}

// ---- Users ----
function getUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.users) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: User[]) {
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}

// ---- Chats ----
function getChats(): Chat[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.chats) || "[]");
  } catch {
    return [];
  }
}

function saveChats(chats: Chat[]) {
  localStorage.setItem(KEYS.chats, JSON.stringify(chats));
}

// ---- Messages ----
function getMessages(): Message[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.messages) || "[]");
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  localStorage.setItem(KEYS.messages, JSON.stringify(messages));
}

// ---- Sessions ----
interface Session {
  token: string;
  user_id: string;
  expires_at: string;
}

function getSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.sessions) || "[]");
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
}

// ---- Public API ----

export function register(
  username: string,
  display_name: string,
  email: string,
  password: string
): { user: User; token: string } | { error: string } {
  // Validation
  if (!username || !display_name || !email || !password)
    return { error: "Все поля обязательны" };
  if (username.length < 3)
    return { error: "Имя пользователя минимум 3 символа" };
  if (username.length > 50)
    return { error: "Имя пользователя максимум 50 символов" };
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return { error: "Только латиница, цифры и _ в имени пользователя" };
  if (password.length < 6)
    return { error: "Пароль минимум 6 символов" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Некорректный email адрес" };
  if (display_name.trim().length < 2)
    return { error: "Имя должно быть минимум 2 символа" };

  const users = getUsers();
  if (users.find(u => u.username === username.toLowerCase()))
    return { error: "Это имя пользователя уже занято" };
  if (users.find(u => u.email === email.toLowerCase()))
    return { error: "Этот email уже зарегистрирован" };

  const user: User = {
    id: generateId(),
    username: username.toLowerCase(),
    display_name: display_name.trim(),
    email: email.toLowerCase(),
    password_hash: hashPassword(password),
    avatar_color: randomColor(),
    avatar_initials: getInitials(display_name),
    bio: "",
    is_online: true,
    last_seen: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);

  const token = generateToken(user.id);
  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser as User, token };
}

export function login(
  loginStr: string,
  password: string
): { user: User; token: string } | { error: string } {
  if (!loginStr || !password)
    return { error: "Введите логин и пароль" };

  const users = getUsers();
  const user = users.find(u => u.username === loginStr.toLowerCase() || u.email === loginStr.toLowerCase());

  if (!user) return { error: "Неверный логин или пароль" };
  if (!user.password_hash || !verifyPassword(password, user.password_hash))
    return { error: "Неверный логин или пароль" };

  // Update online
  const idx = users.findIndex(u => u.id === user.id);
  users[idx].is_online = true;
  users[idx].last_seen = new Date().toISOString();
  saveUsers(users);

  const token = generateToken(user.id);
  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser as User, token };
}

export function logout(token: string) {
  const sessions = getSessions().filter(s => s.token !== token);
  saveSessions(sessions);
  const userId = getUserIdByToken(token);
  if (userId) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].is_online = false;
      users[idx].last_seen = new Date().toISOString();
      saveUsers(users);
    }
  }
  localStorage.removeItem(KEYS.currentToken);
}

function generateToken(userId: string): string {
  const token = generateId() + generateId();
  const sessions = getSessions();
  sessions.push({
    token,
    user_id: userId,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  saveSessions(sessions);
  localStorage.setItem(KEYS.currentToken, token);
  return token;
}

function getUserIdByToken(token: string): string | null {
  const sessions = getSessions();
  const session = sessions.find(s => s.token === token && new Date(s.expires_at) > new Date());
  return session ? session.user_id : null;
}

export function getCurrentUser(token: string): User | null {
  const userId = getUserIdByToken(token);
  if (!userId) return null;
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  const { password_hash: _, ...safeUser } = user;
  return safeUser as User;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(KEYS.currentToken);
}

export function getUserChats(userId: string, currentUserId: string): Chat[] {
  const chats = getChats();
  const messages = getMessages();
  const users = getUsers();

  return chats
    .filter(c => c.members.includes(userId))
    .map(c => {
      const chatMessages = messages.filter(m => m.chat_id === c.id);
      const lastMsg = chatMessages[chatMessages.length - 1];
      const unread = chatMessages.filter(m => !m.is_read && m.sender_id !== currentUserId).length;

      let displayName = c.name;
      let displayAvatarColor = c.avatar_color;
      let displayAvatarInitials: string | undefined;
      let isOnline = false;
      let otherUserId: string | undefined;

      if (!c.is_group) {
        const otherId = c.members.find(id => id !== userId);
        if (otherId) {
          const other = users.find(u => u.id === otherId);
          if (other) {
            displayName = other.display_name;
            displayAvatarColor = other.avatar_color;
            displayAvatarInitials = other.avatar_initials;
            isOnline = other.is_online;
            otherUserId = other.id;
          }
        }
      }

      return {
        ...c,
        display_name: displayName || undefined,
        display_avatar_color: displayAvatarColor,
        display_avatar_initials: displayAvatarInitials,
        is_online: isOnline,
        other_user_id: otherUserId,
        last_message: lastMsg?.content,
        last_message_time: lastMsg?.created_at,
        unread_count: unread,
      };
    })
    .sort((a, b) => {
      const ta = a.last_message_time || a.created_at;
      const tb = b.last_message_time || b.created_at;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });
}

export function createChat(currentUserId: string, otherUserId: string): string {
  const chats = getChats();
  const existing = chats.find(c =>
    !c.is_group &&
    c.members.includes(currentUserId) &&
    c.members.includes(otherUserId)
  );
  if (existing) return existing.id;

  const chat: Chat = {
    id: generateId(),
    name: null,
    is_group: false,
    avatar_color: randomColor(),
    created_by: currentUserId,
    created_at: new Date().toISOString(),
    members: [currentUserId, otherUserId],
  };

  chats.push(chat);
  saveChats(chats);
  return chat.id;
}

export function getChatMessages(chatId: string, currentUserId: string): Message[] {
  const messages = getMessages();
  const users = getUsers();
  const chatMessages = messages.filter(m => m.chat_id === chatId);

  // Mark as read
  const updatedMessages = messages.map(m => {
    if (m.chat_id === chatId && !m.is_read && m.sender_id !== currentUserId) {
      return { ...m, is_read: true };
    }
    return m;
  });
  saveMessages(updatedMessages);

  return chatMessages.map(m => {
    const sender = users.find(u => u.id === m.sender_id);
    return {
      ...m,
      sender_name: sender?.display_name || "Unknown",
      sender_avatar_color: sender?.avatar_color || "#6366f1",
      sender_avatar_initials: sender?.avatar_initials || "?",
      is_own: m.sender_id === currentUserId,
      is_read: m.sender_id !== currentUserId ? true : m.is_read,
    };
  });
}

export function sendMessage(chatId: string, senderId: string, content: string): Message {
  const messages = getMessages();
  const users = getUsers();
  const sender = users.find(u => u.id === senderId);

  const message: Message = {
    id: generateId(),
    chat_id: chatId,
    sender_id: senderId,
    content: content.trim(),
    is_read: false,
    created_at: new Date().toISOString(),
    sender_name: sender?.display_name,
    sender_avatar_color: sender?.avatar_color,
    sender_avatar_initials: sender?.avatar_initials,
    is_own: true,
  };

  messages.push(message);
  saveMessages(messages);

  // Update chat
  const chats = getChats();
  const chatIdx = chats.findIndex(c => c.id === chatId);
  if (chatIdx !== -1) {
    chats[chatIdx] = { ...chats[chatIdx] };
    saveChats(chats);
  }

  return message;
}

export function searchUsers(query: string, currentUserId: string): User[] {
  if (query.length < 2) return [];
  const users = getUsers();
  const q = query.toLowerCase();
  return users
    .filter(u =>
      u.id !== currentUserId &&
      (u.username.toLowerCase().includes(q) || u.display_name.toLowerCase().includes(q))
    )
    .map(u => {
      const { password_hash: _, ...safe } = u;
      return safe as User;
    })
    .slice(0, 20);
}

export function getChatById(chatId: string): Chat | null {
  return getChats().find(c => c.id === chatId) || null;
}

export function getUserById(userId: string): User | null {
  const user = getUsers().find(u => u.id === userId);
  if (!user) return null;
  const { password_hash: _, ...safe } = user;
  return safe as User;
}

export function updateUser(
  userId: string,
  updates: Partial<Pick<User, "display_name" | "bio" | "avatar_color" | "avatar_initials" | "email">>
): { user: User } | { error: string } {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { error: "Пользователь не найден" };

  if (updates.display_name !== undefined) {
    if (updates.display_name.trim().length < 2)
      return { error: "Имя должно быть минимум 2 символа" };
    updates.display_name = updates.display_name.trim();
    updates.avatar_initials = getInitials(updates.display_name);
  }

  if (updates.email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email))
      return { error: "Некорректный email адрес" };
    const emailTaken = users.find(u => u.id !== userId && u.email === updates.email!.toLowerCase());
    if (emailTaken) return { error: "Этот email уже занят" };
    updates.email = updates.email.toLowerCase();
  }

  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);

  const { password_hash: _, ...safe } = users[idx];
  return { user: safe as User };
}

export function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): { success: true } | { error: string } {
  if (newPassword.length < 6)
    return { error: "Новый пароль минимум 6 символов" };

  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { error: "Пользователь не найден" };

  const user = users[idx];
  if (!user.password_hash || !verifyPassword(currentPassword, user.password_hash))
    return { error: "Неверный текущий пароль" };

  users[idx].password_hash = hashPassword(newPassword);
  saveUsers(users);
  return { success: true };
}

// Add demo users for testing
export function initDemoData() {
  const users = getUsers();
  if (users.length > 0) return;

  const demoUsers: User[] = [
    {
      id: generateId(),
      username: "alice",
      display_name: "Алиса Петрова",
      email: "alice@demo.com",
      password_hash: hashPassword("demo123"),
      avatar_color: "#6366f1",
      avatar_initials: "АП",
      bio: "Привет! Я использую Nexus",
      is_online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      username: "bob",
      display_name: "Боб Иванов",
      email: "bob@demo.com",
      password_hash: hashPassword("demo123"),
      avatar_color: "#ec4899",
      avatar_initials: "БИ",
      bio: "Разработчик",
      is_online: false,
      last_seen: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      username: "carol",
      display_name: "Карол Смит",
      email: "carol@demo.com",
      password_hash: hashPassword("demo123"),
      avatar_color: "#22c55e",
      avatar_initials: "КС",
      bio: "Дизайнер",
      is_online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  saveUsers(demoUsers);

  // Create demo chats
  const chat1: Chat = {
    id: generateId(),
    name: null,
    is_group: false,
    avatar_color: "#ec4899",
    created_by: demoUsers[0].id,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    members: [demoUsers[0].id, demoUsers[1].id],
  };

  const chat2: Chat = {
    id: generateId(),
    name: null,
    is_group: false,
    avatar_color: "#22c55e",
    created_by: demoUsers[0].id,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    members: [demoUsers[0].id, demoUsers[2].id],
  };

  saveChats([chat1, chat2]);

  const msgs: Message[] = [
    {
      id: generateId(), chat_id: chat1.id, sender_id: demoUsers[1].id,
      content: "Привет! Как дела?",
      is_read: true, created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: generateId(), chat_id: chat1.id, sender_id: demoUsers[0].id,
      content: "Отлично, спасибо! А у тебя?",
      is_read: true, created_at: new Date(Date.now() - 3500000).toISOString(),
    },
    {
      id: generateId(), chat_id: chat1.id, sender_id: demoUsers[1].id,
      content: "Тоже хорошо. Работаем над новым проектом 🚀",
      is_read: false, created_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: generateId(), chat_id: chat2.id, sender_id: demoUsers[2].id,
      content: "Посмотри новые макеты когда будет время",
      is_read: false, created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  saveMessages(msgs);
}
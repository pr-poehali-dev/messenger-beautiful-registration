import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getStoredToken, getCurrentUser, getUserChats, getChatMessages,
  sendMessage, searchUsers, createChat, logout, getOnlineUsers
} from "@/lib/storage";
import { User, Chat, Message } from "@/lib/types";
import { toast } from "sonner";
import SettingsSidebar from "@/components/SettingsSidebar";

function Avatar({ color, initials, size = "md", online, imageUrl }: {
  color: string; initials?: string; size?: "sm" | "md" | "lg"; online?: boolean; imageUrl?: string;
}) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-11 h-11 text-sm", lg: "w-14 h-14 text-base" };
  return (
    <div className="relative inline-block flex-shrink-0">
      {imageUrl ? (
        <img src={imageUrl} alt="" className={`${sizes[size]} rounded-full object-cover shadow-md`} />
      ) : (
        <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white shadow-md`} style={{ backgroundColor: color }}>
          {initials || "?"}
        </div>
      )}
      {online !== undefined && (
        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1a2e] ${online ? "bg-emerald-400" : "bg-gray-500"}`} />
      )}
    </div>
  );
}

function formatTime(isoStr?: string) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString("ru", { weekday: "short" });
  return d.toLocaleDateString("ru", { day: "2-digit", month: "2-digit" });
}

function formatMessageDate(isoStr: string) {
  const d = new Date(isoStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return "Сегодня";
  if (diff < 172800000) return "Вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

function formatLastSeen(isoStr?: string) {
  if (!isoStr) return "давно";
  const d = new Date(isoStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "только что";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

type SidebarTab = "chats" | "people";

function MessengerPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chats");
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setShowSidebar(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auth check & initial load
  useEffect(() => {
    const init = async () => {
      const token = getStoredToken();
      if (!token) { navigate("/auth"); return; }
      const user = await getCurrentUser(token);
      if (!user) { navigate("/auth"); return; }
      setCurrentUser(user);
      setLoading(false);
      await loadChats(token);
      await loadOnlineUsers(token);
    };
    init();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (messagePollRef.current) clearInterval(messagePollRef.current);
    };
  }, [navigate]);

  // Polling for chats & online users
  useEffect(() => {
    const token = getStoredToken();
    if (!token || !currentUser) return;

    pollRef.current = setInterval(async () => {
      await loadChats(token);
      if (sidebarTab === "people") {
        await loadOnlineUsers(token);
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentUser, sidebarTab]);

  // Polling for messages in selected chat
  useEffect(() => {
    if (!selectedChatId) return;
    const token = getStoredToken();
    if (!token) return;

    messagePollRef.current = setInterval(async () => {
      const msgs = await getChatMessages(token, selectedChatId);
      setMessages(msgs);
    }, 2000);

    return () => {
      if (messagePollRef.current) clearInterval(messagePollRef.current);
    };
  }, [selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChats = useCallback(async (token: string) => {
    const userChats = await getUserChats(token);
    setChats(userChats);
  }, []);

  const loadOnlineUsers = useCallback(async (token: string) => {
    const users = await getOnlineUsers(token);
    setOnlineUsers(users);
  }, []);

  const handleSelectChat = useCallback(async (chatId: string) => {
    setSelectedChatId(chatId);
    const token = getStoredToken();
    if (!token) return;
    const msgs = await getChatMessages(token, chatId);
    setMessages(msgs);
    setShowSearch(false);
    if (isMobile) setShowSidebar(false);
    await loadChats(token);
  }, [isMobile, loadChats]);

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedChatId || sendingMessage) return;
    const token = getStoredToken();
    if (!token) return;

    setSendingMessage(true);
    const msg = await sendMessage(token, selectedChatId, messageInput);
    if (msg) {
      setMessages(prev => [...prev, msg]);
      setMessageInput("");
      await loadChats(token);
    } else {
      toast.error("Не удалось отправить сообщение");
    }
    setSendingMessage(false);
    inputRef.current?.focus();
  }, [messageInput, selectedChatId, sendingMessage, loadChats]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    const token = getStoredToken();
    if (!token || q.length < 1) { setSearchResults([]); return; }
    const results = await searchUsers(token, q);
    setSearchResults(results);
  };

  const handleStartChat = async (user: User) => {
    const token = getStoredToken();
    if (!token) return;
    const result = await createChat(token, user.id);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    await loadChats(token);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setSidebarTab("chats");
    handleSelectChat(result.chat_id);
  };

  const handleLogout = async () => {
    const token = getStoredToken();
    if (token) await logout(token);
    navigate("/auth");
    toast.success("Вы вышли из аккаунта");
  };

  const selectedChat = chats.find(c => c.id === selectedChatId);

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const date = formatMessageDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (!last || last.date !== date) {
      groupedMessages.push({ date, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  });

  if (loading) return (
    <div className="min-h-screen bg-[#0f0c29] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Загрузка...</p>
      </div>
    </div>
  );

  if (!currentUser) return null;

  const onlineCount = onlineUsers.filter(u => u.is_online).length;

  return (
    <div className="h-screen bg-[#0f0c29] flex overflow-hidden">
      {/* SIDEBAR */}
      <div className={`
        ${isMobile ? "absolute inset-y-0 left-0 z-30 w-full max-w-sm shadow-2xl" : "relative w-80 flex-shrink-0"}
        ${(!showSidebar && isMobile) ? "-translate-x-full" : "translate-x-0"}
        transition-transform duration-300 flex flex-col bg-[#16132a] border-r border-white/5
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-3 min-w-0 flex-1 rounded-xl hover:bg-white/5 transition-colors p-1 -m-1 text-left"
              title="Открыть настройки"
            >
              <Avatar color={currentUser.avatar_color} initials={currentUser.avatar_initials} size="md" online={true} />
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{currentUser.display_name}</p>
                <p className="text-indigo-400 text-xs">@{currentUser.username}</p>
              </div>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors flex-shrink-0"
              title="Настройки"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Tabs: Чаты / Люди */}
          <div className="flex bg-white/5 rounded-xl p-0.5 mb-3">
            <button
              onClick={() => setSidebarTab("chats")}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                sidebarTab === "chats"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Чаты
            </button>
            <button
              onClick={() => { setSidebarTab("people"); const t = getStoredToken(); if (t) loadOnlineUsers(t); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                sidebarTab === "people"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Люди
              {onlineCount > 0 && (
                <span className="ml-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 inline-flex items-center justify-center px-1">
                  {onlineCount}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setShowSearch(true)}
              placeholder={sidebarTab === "chats" ? "Поиск чатов и пользователей..." : "Поиск людей..."}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-all"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Search Results */}
        {showSearch && searchResults.length > 0 && (
          <div className="border-b border-white/5">
            <p className="px-4 py-2 text-xs text-white/40 uppercase tracking-wider font-medium">Пользователи</p>
            {searchResults.map(user => (
              <button
                key={user.id}
                onClick={() => handleStartChat(user)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <Avatar color={user.avatar_color} initials={user.avatar_initials} size="sm" online={user.is_online} />
                <div className="min-w-0 text-left flex-1">
                  <p className="text-white text-sm font-medium truncate">{user.display_name}</p>
                  <p className="text-white/40 text-xs">@{user.username}</p>
                </div>
                {user.is_online && (
                  <span className="text-emerald-400 text-[10px] font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full">онлайн</span>
                )}
              </button>
            ))}
          </div>
        )}

        {showSearch && searchQuery.length >= 1 && searchResults.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-white/30 text-sm">Пользователи не найдены</p>
          </div>
        )}

        {/* Content based on tab */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {sidebarTab === "chats" ? (
            /* CHATS TAB */
            !showSearch || searchQuery.length < 1 ? (
              chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-white/30 text-sm">Нет чатов</p>
                  <p className="text-white/20 text-xs mt-1">Перейдите во вкладку «Люди» чтобы найти собеседников</p>
                </div>
              ) : (
                chats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors border-b border-white/3 ${
                      selectedChatId === chat.id ? "bg-indigo-600/20 border-l-2 border-l-indigo-500" : ""
                    }`}
                  >
                    <Avatar
                      color={chat.display_avatar_color || chat.avatar_color}
                      initials={chat.display_avatar_initials || undefined}
                      size="md"
                      online={chat.is_online}
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium truncate">{chat.display_name || chat.name || "Чат"}</p>
                        <span className="text-white/30 text-xs flex-shrink-0 ml-2">{formatTime(chat.last_message_time)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-white/40 text-xs truncate">{chat.last_message || "Нет сообщений"}</p>
                        {(chat.unread_count ?? 0) > 0 && (
                          <span className="flex-shrink-0 ml-2 bg-indigo-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )
            ) : null
          ) : (
            /* PEOPLE TAB */
            <>
              {/* Online users section */}
              {onlineUsers.filter(u => u.is_online).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-xs text-emerald-400 uppercase tracking-wider font-medium">
                      Сейчас в сети — {onlineUsers.filter(u => u.is_online).length}
                    </p>
                  </div>
                  {onlineUsers.filter(u => u.is_online).map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleStartChat(user)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      <Avatar color={user.avatar_color} initials={user.avatar_initials} size="md" online={true} />
                      <div className="min-w-0 text-left flex-1">
                        <p className="text-white text-sm font-medium truncate">{user.display_name}</p>
                        <p className="text-white/40 text-xs">@{user.username}</p>
                      </div>
                      <span className="text-emerald-400 text-[10px] font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full">онлайн</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Offline users section */}
              {onlineUsers.filter(u => !u.is_online).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 border-t border-white/5">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                      Не в сети — {onlineUsers.filter(u => !u.is_online).length}
                    </p>
                  </div>
                  {onlineUsers.filter(u => !u.is_online).map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleStartChat(user)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      <Avatar color={user.avatar_color} initials={user.avatar_initials} size="md" online={false} />
                      <div className="min-w-0 text-left flex-1">
                        <p className="text-white/70 text-sm font-medium truncate">{user.display_name}</p>
                        <p className="text-white/30 text-xs">@{user.username}</p>
                      </div>
                      <span className="text-white/30 text-[10px]">{formatLastSeen(user.last_seen)}</span>
                    </button>
                  ))}
                </div>
              )}

              {onlineUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-white/30 text-sm">Пока нет других пользователей</p>
                  <p className="text-white/20 text-xs mt-1">Пригласите друзей!</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Nexus branding */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-white/30 text-xs font-medium">Nexus Messenger</span>
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#16132a] border-b border-white/5 shadow-sm">
              {isMobile && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <Avatar
                color={selectedChat.display_avatar_color || selectedChat.avatar_color}
                initials={selectedChat.display_avatar_initials || undefined}
                size="md"
                online={selectedChat.is_online}
              />
              <div className="min-w-0">
                <p className="text-white font-semibold truncate">{selectedChat.display_name || selectedChat.name || "Чат"}</p>
                <p className="text-xs">
                  {selectedChat.is_online
                    ? <span className="text-emerald-400">В сети</span>
                    : <span className="text-white/40">был(а) {formatLastSeen(selectedChat.other_last_seen)}</span>
                  }
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#0f0c29] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-transparent to-transparent">
              {groupedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-white/30 text-sm">Нет сообщений</p>
                  <p className="text-white/20 text-xs mt-1">Начните общение!</p>
                </div>
              ) : (
                groupedMessages.map(group => (
                  <div key={group.date}>
                    {/* Date divider */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-white/30 text-xs px-2">{group.date}</span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>

                    {/* Messages in group */}
                    {group.msgs.map((msg, idx) => {
                      const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                      const isSameAuthor = prevMsg?.sender_id === msg.sender_id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${msg.is_own ? "flex-row-reverse" : ""} ${isSameAuthor ? "mt-0.5" : "mt-3"}`}
                        >
                          {!msg.is_own && !isSameAuthor ? (
                            <Avatar
                              color={msg.sender_avatar_color || "#6366f1"}
                              initials={msg.sender_avatar_initials}
                              size="sm"
                            />
                          ) : !msg.is_own ? (
                            <div className="w-8" />
                          ) : null}
                          <div className={`max-w-[70%] ${msg.is_own ? "items-end" : "items-start"}`}>
                            {!isSameAuthor && !msg.is_own && (
                              <p className="text-xs font-medium mb-1 ml-1" style={{ color: msg.sender_avatar_color || "#6366f1" }}>
                                {msg.sender_name}
                              </p>
                            )}
                            <div
                              className={`px-3.5 py-2 rounded-2xl break-words text-sm leading-relaxed ${
                                msg.is_own
                                  ? "bg-indigo-600 text-white rounded-br-md"
                                  : "bg-white/10 text-white/90 rounded-bl-md"
                              }`}
                            >
                              {msg.content}
                              <span className={`text-[10px] ml-2 inline-block float-right mt-1 ${
                                msg.is_own ? "text-indigo-200/60" : "text-white/30"
                              }`}>
                                {new Date(msg.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 bg-[#16132a] border-t border-white/5">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите сообщение..."
                  rows={1}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40 resize-none max-h-32 transition-all"
                  style={{ minHeight: "44px" }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {sendingMessage ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No chat selected */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0f0c29] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-transparent to-transparent">
            {isMobile && (
              <button
                onClick={() => setShowSidebar(true)}
                className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center mb-6 border border-white/5">
              <svg className="w-10 h-10 text-indigo-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-white/30 text-lg font-medium">Nexus Messenger</p>
            <p className="text-white/15 text-sm mt-2 text-center max-w-xs">
              Выберите чат или найдите собеседника во вкладке «Люди»
            </p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-2xl h-full bg-[#16132a] shadow-2xl overflow-hidden ml-0 md:ml-auto md:mr-auto md:my-4 md:rounded-2xl md:h-[calc(100%-2rem)]">
            <SettingsSidebar
              currentUser={currentUser}
              onClose={() => setShowSettings(false)}
              onUserUpdated={(user) => {
                setCurrentUser(user);
              }}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default MessengerPage;
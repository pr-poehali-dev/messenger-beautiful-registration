import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getStoredToken, getCurrentUser, getUserChats, getChatMessages,
  sendMessage, searchUsers, createChat, logout, initDemoData
} from "@/lib/storage";
import { User, Chat, Message } from "@/lib/types";
import { toast } from "sonner";

function Avatar({ color, initials, size = "md", online }: { color: string; initials?: string; size?: "sm" | "md" | "lg"; online?: boolean }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-11 h-11 text-sm", lg: "w-14 h-14 text-base" };
  return (
    <div className="relative inline-block flex-shrink-0">
      <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white shadow-md`} style={{ backgroundColor: color }}>
        {initials || "?"}
      </div>
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

export default function MessengerPage() {
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
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setShowSidebar(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    initDemoData();
    const token = getStoredToken();
    if (!token) { navigate("/auth"); return; }
    const user = getCurrentUser(token);
    if (!user) { navigate("/auth"); return; }
    setCurrentUser(user);
    loadChats(user.id);
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChats = useCallback((userId: string) => {
    const userChats = getUserChats(userId, userId);
    setChats(userChats);
  }, []);

  const handleSelectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    if (!currentUser) return;
    const msgs = getChatMessages(chatId, currentUser.id);
    setMessages(msgs);
    setShowSearch(false);
    if (isMobile) setShowSidebar(false);
    // Reload chats to update unread counts
    loadChats(currentUser.id);
  }, [currentUser, isMobile, loadChats]);

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedChatId || !currentUser) return;
    const msg = sendMessage(selectedChatId, currentUser.id, messageInput);
    setMessages(prev => [...prev, msg]);
    setMessageInput("");
    loadChats(currentUser.id);
    inputRef.current?.focus();
  }, [messageInput, selectedChatId, currentUser, loadChats]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!currentUser || q.length < 2) { setSearchResults([]); return; }
    setSearchResults(searchUsers(q, currentUser.id));
  };

  const handleStartChat = (user: User) => {
    if (!currentUser) return;
    const chatId = createChat(currentUser.id, user.id);
    loadChats(currentUser.id);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    handleSelectChat(chatId);
  };

  const handleLogout = () => {
    const token = getStoredToken();
    if (token) logout(token);
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

  if (!currentUser) return (
    <div className="min-h-screen bg-[#0f0c29] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
            <div className="flex items-center gap-3">
              <Avatar color={currentUser.avatar_color} initials={currentUser.avatar_initials} size="md" online={true} />
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{currentUser.display_name}</p>
                <p className="text-indigo-400 text-xs">@{currentUser.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              title="Выйти"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* Search / New Chat */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setShowSearch(true)}
              placeholder="Поиск или новый чат..."
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
                <div className="min-w-0 text-left">
                  <p className="text-white text-sm font-medium truncate">{user.display_name}</p>
                  <p className="text-white/40 text-xs">@{user.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {showSearch && searchQuery.length >= 2 && searchResults.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-white/30 text-sm">Пользователи не найдены</p>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {!showSearch || searchQuery.length < 2 ? (
            chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-white/30 text-sm">Нет чатов</p>
                <p className="text-white/20 text-xs mt-1">Найдите пользователя через поиск</p>
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
          ) : null}
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
                    : <span className="text-white/40">Не в сети</span>
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
                          className={`flex items-end gap-2 ${msg.is_own ? "flex-row-reverse" : "flex-row"} ${isSameAuthor ? "mt-0.5" : "mt-3"}`}
                        >
                          {/* Avatar - show only for last message in sequence */}
                          {!msg.is_own && (
                            <div className="w-8 flex-shrink-0">
                              {!isSameAuthor ? (
                                <Avatar
                                  color={msg.sender_avatar_color || "#6366f1"}
                                  initials={msg.sender_avatar_initials}
                                  size="sm"
                                />
                              ) : null}
                            </div>
                          )}

                          <div className={`max-w-[70%] ${msg.is_own ? "items-end" : "items-start"} flex flex-col`}>
                            {!isSameAuthor && !msg.is_own && (
                              <p className="text-xs text-indigo-400 font-medium mb-1 ml-3">{msg.sender_name}</p>
                            )}
                            <div
                              className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
                                msg.is_own
                                  ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-br-sm"
                                  : "bg-white/10 backdrop-blur-sm text-white border border-white/10 rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                              <div className={`flex items-center gap-1 mt-1 ${msg.is_own ? "justify-end" : "justify-start"}`}>
                                <span className={`text-xs ${msg.is_own ? "text-white/50" : "text-white/30"}`}>
                                  {new Date(msg.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {msg.is_own && (
                                  <svg className={`w-3.5 h-3.5 ${msg.is_read ? "text-indigo-300" : "text-white/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {msg.is_read ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    )}
                                  </svg>
                                )}
                              </div>
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
            <div className="p-4 bg-[#16132a] border-t border-white/5">
              <div className="flex items-end gap-3">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex items-end overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500/40 focus-within:border-indigo-500/30 transition-all">
                  <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Написать сообщение..."
                    rows={1}
                    className="flex-1 bg-transparent px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none resize-none max-h-32 overflow-y-auto"
                    style={{ lineHeight: "1.5" }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white flex items-center justify-center transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-white/20 text-xs mt-2 text-center">Enter — отправить, Shift+Enter — новая строка</p>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0f0c29] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/30 via-transparent to-transparent">
            {isMobile && (
              <button
                onClick={() => setShowSidebar(true)}
                className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 text-white/60 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-white/10 flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-indigo-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Nexus</h2>
            <p className="text-white/40 text-sm max-w-xs">Выберите чат слева или найдите пользователя через поиск, чтобы начать общение</p>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {isMobile && showSidebar && selectedChatId && (
        <div className="absolute inset-0 bg-black/50 z-20" onClick={() => setShowSidebar(false)} />
      )}
    </div>
  );
}

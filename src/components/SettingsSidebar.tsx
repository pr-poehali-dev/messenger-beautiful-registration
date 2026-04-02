import { useState } from "react";
import { User } from "@/lib/types";
import { updateUser, changePassword, getStoredToken } from "@/lib/storage";
import { toast } from "sonner";

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#22c55e", "#14b8a6", "#3b82f6",
  "#06b6d4", "#a855f7", "#eab308", "#ef4444",
  "#84cc16", "#0ea5e9", "#d946ef", "#f472b6",
];

type SettingsSection = "profile" | "account" | "appearance" | "notifications" | "privacy" | "about";

interface Props {
  currentUser: User;
  onClose: () => void;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
}

function Avatar({ color, initials, size = "md" }: { color: string; initials?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-2xl",
  };
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white shadow-md flex-shrink-0`} style={{ backgroundColor: color }}>
      {initials || "?"}
    </div>
  );
}

export default function SettingsSidebar({ currentUser, onClose, onUserUpdated, onLogout }: Props) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  // Profile form state
  const [displayName, setDisplayName] = useState(currentUser.display_name);
  const [bio, setBio] = useState(currentUser.bio || "");
  const [email, setEmail] = useState(currentUser.email);
  const [avatarColor, setAvatarColor] = useState(currentUser.avatar_color);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notifications settings
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifSounds, setNotifSounds] = useState(true);
  const [notifPreview, setNotifPreview] = useState(true);

  // Privacy settings
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  const handleSaveProfile = async () => {
    const token = getStoredToken();
    if (!token) return;

    setSavingProfile(true);
    const result = await updateUser(token, {
      display_name: displayName,
      bio,
      email,
      avatar_color: avatarColor,
    });
    setSavingProfile(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      onUserUpdated(result.user);
      toast.success("Профиль успешно обновлён");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Заполните все поля");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    const token = getStoredToken();
    if (!token) return;

    setSavingPassword(true);
    const result = await changePassword(token, currentPassword, newPassword);
    setSavingPassword(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Пароль успешно изменён");
    }
  };

  const menuItems: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    {
      id: "profile",
      label: "Редактировать профиль",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: "account",
      label: "Аккаунт и безопасность",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: "notifications",
      label: "Уведомления",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: "privacy",
      label: "Конфиденциальность",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: "appearance",
      label: "Оформление",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
    {
      id: "about",
      label: "О приложении",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left nav */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-[#13102a] border-r border-white/5 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-white font-semibold text-base">Настройки</h2>
        </div>

        {/* User preview */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Avatar color={avatarColor} initials={currentUser.avatar_initials} size="md" />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{currentUser.display_name}</p>
              <p className="text-indigo-400 text-xs">@{currentUser.username}</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 text-left ${
                activeSection === item.id
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={activeSection === item.id ? "text-indigo-400" : "text-white/40"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Выйти
          </button>
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* PROFILE SECTION */}
        {activeSection === "profile" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Редактировать профиль</h3>
              <p className="text-white/40 text-sm">Измените свои данные и аватар</p>
            </div>

            {/* Avatar preview & color picker */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <p className="text-white/60 text-sm font-medium mb-4">Аватар</p>
              <div className="flex items-center gap-6 mb-4">
                <Avatar color={avatarColor} initials={currentUser.avatar_initials} size="xl" />
                <div>
                  <p className="text-white text-sm font-medium">{displayName || currentUser.display_name}</p>
                  <p className="text-white/40 text-xs mt-0.5">@{currentUser.username}</p>
                  <p className="text-white/30 text-xs mt-2">Выберите цвет аватара ниже</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className={`w-9 h-9 rounded-full transition-all hover:scale-110 ${
                      avatarColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#16132a] scale-110" : "opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Display name */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Имя</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all"
                placeholder="Ваше имя"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">О себе</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                maxLength={200}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all resize-none"
                placeholder="Расскажите о себе..."
              />
              <p className="text-white/30 text-xs mt-1">{bio.length}/200</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all"
                placeholder="email@example.com"
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingProfile ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить изменения"
              )}
            </button>
          </div>
        )}

        {/* ACCOUNT SECTION */}
        {activeSection === "account" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Аккаунт и безопасность</h3>
              <p className="text-white/40 text-sm">Управление паролем и безопасностью</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <p className="text-white/60 text-sm font-medium mb-4">Информация об аккаунте</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-white/40 text-sm">Имя пользователя</span>
                  <span className="text-white text-sm font-medium">@{currentUser.username}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <span className="text-white/40 text-sm">Email</span>
                  <span className="text-white text-sm">{currentUser.email}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <span className="text-white/40 text-sm">Дата регистрации</span>
                  <span className="text-white text-sm">{new Date(currentUser.created_at).toLocaleDateString("ru")}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <p className="text-white/60 text-sm font-medium mb-4">Изменить пароль</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">Текущий пароль</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all pr-10"
                      placeholder="Введите текущий пароль"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showCurrentPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">Новый пароль</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all pr-10"
                      placeholder="Минимум 6 символов"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showNewPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">Подтвердите пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all"
                    placeholder="Повторите новый пароль"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    "Изменить пароль"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS SECTION */}
        {activeSection === "notifications" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Уведомления</h3>
              <p className="text-white/40 text-sm">Настройка уведомлений</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5 space-y-4">
              {[
                { label: "Уведомления о сообщениях", desc: "Получать уведомления о новых сообщениях", value: notifMessages, set: setNotifMessages },
                { label: "Звуки", desc: "Воспроизводить звук при получении сообщений", value: notifSounds, set: setNotifSounds },
                { label: "Предпросмотр", desc: "Показывать текст сообщения в уведомлении", value: notifPreview, set: setNotifPreview },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between py-2 ${i > 0 ? "border-t border-white/5" : ""}`}>
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-white/30 text-xs mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => item.set(!item.value)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${item.value ? "bg-indigo-600" : "bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.value ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRIVACY SECTION */}
        {activeSection === "privacy" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Конфиденциальность</h3>
              <p className="text-white/40 text-sm">Управление видимостью</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5 space-y-4">
              {[
                { label: "Статус онлайн", desc: "Показывать другим, когда вы в сети", value: showOnlineStatus, set: setShowOnlineStatus },
                { label: "Время последнего входа", desc: "Показывать время последней активности", value: showLastSeen, set: setShowLastSeen },
                { label: "Отчёты о прочтении", desc: "Показывать, что вы прочитали сообщение", value: readReceipts, set: setReadReceipts },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between py-2 ${i > 0 ? "border-t border-white/5" : ""}`}>
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-white/30 text-xs mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => item.set(!item.value)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${item.value ? "bg-indigo-600" : "bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.value ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* APPEARANCE SECTION */}
        {activeSection === "appearance" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Оформление</h3>
              <p className="text-white/40 text-sm">Настройка внешнего вида</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <p className="text-white/60 text-sm font-medium mb-4">Тема</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-indigo-600/20 border-2 border-indigo-500 cursor-pointer text-center">
                  <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 mb-2" />
                  <p className="text-white text-xs font-medium">Тёмная</p>
                  <p className="text-indigo-300 text-[10px]">Активна</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer text-center opacity-50">
                  <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-gray-200 to-gray-400 mb-2" />
                  <p className="text-white/60 text-xs font-medium">Светлая</p>
                  <p className="text-white/30 text-[10px]">Скоро</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABOUT SECTION */}
        {activeSection === "about" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">О приложении</h3>
              <p className="text-white/40 text-sm">Информация о Nexus Messenger</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-2xl shadow-indigo-500/40">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-white font-bold text-lg">Nexus Messenger</h4>
              <p className="text-white/40 text-sm mt-1">Версия 2.0.0</p>
              <p className="text-white/30 text-xs mt-4 max-w-xs mx-auto">
                Мессенджер нового поколения с красивым интерфейсом, поиском пользователей и настоящей базой данных.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

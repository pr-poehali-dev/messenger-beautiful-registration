import { useState } from "react";
import { User } from "@/lib/types";
import { updateUser, changePassword } from "@/lib/storage";
import { toast } from "sonner";

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#22c55e", "#14b8a6", "#3b82f6",
  "#06b6d4", "#a855f7", "#eab308", "#ef4444",
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

  const handleSaveProfile = () => {
    setSavingProfile(true);
    const result = updateUser(currentUser.id, {
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

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Заполните все поля");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    setSavingPassword(true);
    const result = changePassword(currentUser.id, currentPassword, newPassword);
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
            Выйти из аккаунта
          </button>
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0c29]">
        <div className="flex-1 overflow-y-auto p-6">

          {/* ===== PROFILE SECTION ===== */}
          {activeSection === "profile" && (
            <div className="max-w-lg">
              <h3 className="text-white text-xl font-bold mb-1">Редактировать профиль</h3>
              <p className="text-white/40 text-sm mb-6">Обновите своё имя, аватар и описание</p>

              {/* Avatar section */}
              <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/5">
                <p className="text-white/60 text-xs uppercase tracking-wider font-medium mb-4">Аватар</p>
                <div className="flex items-center gap-5 mb-4">
                  <Avatar color={avatarColor} initials={currentUser.avatar_initials} size="xl" />
                  <div>
                    <p className="text-white font-semibold">{displayName || currentUser.display_name}</p>
                    <p className="text-white/40 text-sm">@{currentUser.username}</p>
                    <p className="text-white/30 text-xs mt-1">Выберите цвет аватара ниже</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setAvatarColor(color)}
                      className={`w-8 h-8 rounded-full transition-all duration-150 ${
                        avatarColor === color
                          ? "ring-2 ring-white ring-offset-2 ring-offset-[#16132a] scale-110"
                          : "hover:scale-110 opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Display name */}
              <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/5">
                <p className="text-white/60 text-xs uppercase tracking-wider font-medium mb-4">Основная информация</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-white/60 text-sm block mb-1.5">Отображаемое имя</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Ваше имя"
                      maxLength={60}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-all"
                    />
                    <p className="text-white/25 text-xs mt-1 text-right">{displayName.length}/60</p>
                  </div>

                  <div>
                    <label className="text-white/60 text-sm block mb-1.5">Имя пользователя</label>
                    <input
                      type="text"
                      value={`@${currentUser.username}`}
                      disabled
                      className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-white/30 text-sm cursor-not-allowed"
                    />
                    <p className="text-white/25 text-xs mt-1">Имя пользователя нельзя изменить</p>
                  </div>

                  <div>
                    <label className="text-white/60 text-sm block mb-1.5">О себе</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Расскажите о себе..."
                      maxLength={200}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-all resize-none"
                    />
                    <p className="text-white/25 text-xs mt-1 text-right">{bio.length}/200</p>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="bg-white/5 rounded-2xl p-5 mb-6 border border-white/5">
                <p className="text-white/60 text-xs uppercase tracking-wider font-medium mb-4">Контактная информация</p>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Email адрес</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingProfile ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Сохранить изменения
              </button>
            </div>
          )}

          {/* ===== ACCOUNT SECTION ===== */}
          {activeSection === "account" && (
            <div className="max-w-lg">
              <h3 className="text-white text-xl font-bold mb-1">Аккаунт и безопасность</h3>
              <p className="text-white/40 text-sm mb-6">Управление паролем и безопасностью аккаунта</p>

              {/* Account info */}
              <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/5">
                <p className="text-white/60 text-xs uppercase tracking-wider font-medium mb-4">Информация об аккаунте</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-white/50 text-sm">Имя пользователя</span>
                    <span className="text-white text-sm font-medium">@{currentUser.username}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-white/50 text-sm">Email</span>
                    <span className="text-white text-sm font-medium">{currentUser.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-white/50 text-sm">Дата регистрации</span>
                    <span className="text-white text-sm font-medium">
                      {new Date(currentUser.created_at).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Change password */}
              <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/5">
                <p className="text-white/60 text-xs uppercase tracking-wider font-medium mb-4">Изменить пароль</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-white/60 text-sm block mb-1.5">Текущий пароль</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Введите текущий пароль"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showCurrentPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-white/60 text-sm block mb-1.5">Новый пароль</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Минимум 6 символов"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showNewPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-white/60 text-sm block mb-1.5">Подтвердить пароль</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Повторите новый пароль"
                      className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 transition-all ${
                        confirmPassword && newPassword !== confirmPassword
                          ? "border-red-500/50 focus:ring-red-500/30"
                          : "border-white/10 focus:ring-indigo-500/60 focus:border-indigo-500/40"
                      }`}
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-red-400 text-xs mt-1">Пароли не совпадают</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingPassword ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  Изменить пароль
                </button>
              </div>

              {/* Danger zone */}
              <div className="bg-red-500/5 rounded-2xl p-5 border border-red-500/10">
                <p className="text-red-400/80 text-xs uppercase tracking-wider font-medium mb-3">Опасная зона</p>
                <p className="text-white/40 text-sm mb-4">
                  После выхода из аккаунта вам потребуется войти снова. Все данные останутся сохранены.
                </p>
                <button
                  onClick={onLogout}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          )}

          {/* ===== NOTIFICATIONS SECTION ===== */}
          {activeSection === "notifications" && (
            <div className="max-w-lg">
              <h3 className="text-white text-xl font-bold mb-1">Уведомления</h3>
              <p className="text-white/40 text-sm mb-6">Управляйте тем, как вы получаете уведомления</p>

              <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/5">
                <p className="text-white/60 text-xs uppercase tracking-wider font-medium mb-4">Сообщения</p>
                <div className="space-y-1">
                  <ToggleRow
                    label="Уведомления о сообщениях"
                    description="Получать уведомления при новых сообщениях"
                    checked={notifMessages}
                    onChange={setNotifMessages}
                  />
                  <ToggleRow
                    label="Звуковые уведомления"
                    description="Воспроизводить звук при получении сообщения"
                    checked={notifSounds}
                    onChange={setNotifSounds}
                  />
                  <ToggleRow
                    label="Предпросмотр сообщений"
                    description="Показывать содержимое сообщения в уведомлении"
                    checked={notifPreview}
                    onChange={setNotifPreview}
                  />
                </div>
              </div>

              <div className="bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-white/50 text-sm">
                    Настройки уведомлений сохраняются локально и применяются только в текущем браузере.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===== PRIVACY SECTION ===== */}
          {activeSection === "privacy" && (
            <div className="max-w-lg">
              <h3 className="text-white text-xl font-bold mb-1">Конфиденциальность</h3>
              <p className="text-white/40 text-sm mb-6">Управление видимостью вашего профиля</p>

              <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/5">
                <p className="text-white/60 text-xs uppercase tracking-wider font-medium mb-4">Видимость профиля</p>
                <div className="space-y-1">
                  <ToggleRow
                    label="Статус онлайн"
                    description="Показывать когда вы онлайн другим пользователям"
                    checked={showOnlineStatus}
                    onChange={setShowOnlineStatus}
                  />
                  <ToggleRow
                    label="Время последнего визита"
                    description="Показывать когда вы последний раз были в сети"
                    checked={showLastSeen}
                    onChange={setShowLastSeen}
                  />
                  <ToggleRow
                    label="Уведомления о прочтении"
                    description="Показывать отправителю, что вы прочитали сообщение"
                    checked={readReceipts}
                    onChange={setReadReceipts}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== APPEARANCE SECTION ===== */}
          {activeSection === "appearance" && (
            <div className="max-w-lg">
              <h3 className="text-white text-xl font-bold mb-1">Оформление</h3>
              <p className="text-white/40 text-sm mb-6">Персонализируйте внешний вид приложения</p>

              <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/5">
                <p className="text-white/60 text-xs uppercase tracking-wider font-medium mb-4">Тема приложения</p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="relative p-4 rounded-xl border-2 border-indigo-500 bg-indigo-500/10 transition-all">
                    <div className="w-full h-16 rounded-lg bg-[#0f0c29] mb-2 flex items-end p-2 gap-1">
                      <div className="w-1/3 h-8 rounded bg-[#16132a]" />
                      <div className="flex-1 h-10 rounded bg-[#16132a]" />
                    </div>
                    <p className="text-white text-sm font-medium">Тёмная</p>
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </button>
                  <button className="relative p-4 rounded-xl border-2 border-white/10 hover:border-white/20 bg-white/3 transition-all opacity-60 cursor-not-allowed" disabled>
                    <div className="w-full h-16 rounded-lg bg-gray-100 mb-2 flex items-end p-2 gap-1">
                      <div className="w-1/3 h-8 rounded bg-gray-200" />
                      <div className="flex-1 h-10 rounded bg-gray-200" />
                    </div>
                    <p className="text-white/50 text-sm font-medium">Светлая</p>
                    <span className="absolute top-2 right-2 text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">Скоро</span>
                  </button>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <p className="text-white/60 text-xs uppercase tracking-wider font-medium mb-4">Акцентный цвет</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { name: "Индиго", color: "bg-indigo-500", active: true },
                    { name: "Фиолетовый", color: "bg-violet-500", active: false },
                    { name: "Розовый", color: "bg-pink-500", active: false },
                    { name: "Голубой", color: "bg-blue-500", active: false },
                    { name: "Бирюзовый", color: "bg-teal-500", active: false },
                    { name: "Зелёный", color: "bg-emerald-500", active: false },
                  ].map(theme => (
                    <button
                      key={theme.name}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                        theme.active
                          ? "border-indigo-500/50 bg-indigo-500/10 text-white"
                          : "border-white/10 text-white/40 cursor-not-allowed opacity-50"
                      }`}
                      disabled={!theme.active}
                    >
                      <div className={`w-3 h-3 rounded-full ${theme.color}`} />
                      {theme.name}
                      {theme.active && (
                        <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== ABOUT SECTION ===== */}
          {activeSection === "about" && (
            <div className="max-w-lg">
              <h3 className="text-white text-xl font-bold mb-1">О приложении</h3>
              <p className="text-white/40 text-sm mb-6">Информация о Nexus Messenger</p>

              <div className="bg-white/5 rounded-2xl p-6 mb-5 border border-white/5 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h4 className="text-white text-lg font-bold mb-1">Nexus Messenger</h4>
                <p className="text-indigo-400 text-sm mb-3">Версия 1.0.0</p>
                <p className="text-white/40 text-sm leading-relaxed">
                  Современный мессенджер для удобного общения. Быстро, безопасно и красиво.
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <p className="text-white/60 text-xs uppercase tracking-wider font-medium mb-4">Технические детали</p>
                <div className="space-y-3">
                  {[
                    { label: "Фреймворк", value: "React 18 + TypeScript" },
                    { label: "UI библиотека", value: "shadcn/ui + Tailwind CSS" },
                    { label: "Хранилище данных", value: "LocalStorage" },
                    { label: "Иконки", value: "Lucide Icons" },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                      <span className="text-white/50 text-sm">{item.label}</span>
                      <span className="text-white text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-white/5 last:border-0 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-white/40 text-xs mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200 ${
          checked ? "bg-indigo-600" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

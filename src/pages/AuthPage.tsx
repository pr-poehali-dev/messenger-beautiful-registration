import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register, login } from "@/lib/storage";
import { toast } from "sonner";

type Tab = "login" | "register";

export default function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginData, setLoginData] = useState({ login: "", password: "" });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Register form
  const [regData, setRegData] = useState({
    username: "",
    display_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const validateLogin = () => {
    const errors: Record<string, string> = {};
    if (!loginData.login.trim()) errors.login = "Введите логин или email";
    if (!loginData.password) errors.password = "Введите пароль";
    return errors;
  };

  const validateRegister = () => {
    const errors: Record<string, string> = {};
    if (!regData.display_name.trim()) errors.display_name = "Введите своё имя";
    else if (regData.display_name.trim().length < 2) errors.display_name = "Минимум 2 символа";

    if (!regData.username.trim()) errors.username = "Введите имя пользователя";
    else if (regData.username.length < 3) errors.username = "Минимум 3 символа";
    else if (!/^[a-zA-Z0-9_]+$/.test(regData.username)) errors.username = "Только латиница, цифры и _";

    if (!regData.email.trim()) errors.email = "Введите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regData.email)) errors.email = "Некорректный email";

    if (!regData.password) errors.password = "Введите пароль";
    else if (regData.password.length < 6) errors.password = "Минимум 6 символов";

    if (!regData.confirm_password) errors.confirm_password = "Подтвердите пароль";
    else if (regData.password !== regData.confirm_password) errors.confirm_password = "Пароли не совпадают";

    return errors;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateLogin();
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const result = await login(loginData.login.trim(), loginData.password);
      if ("error" in result) {
        setLoginErrors({ general: result.error });
        toast.error(result.error);
      } else {
        toast.success("Добро пожаловать, " + result.user.display_name + "!");
        navigate("/");
      }
    } catch {
      toast.error("Произошла ошибка. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateRegister();
    setRegErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const result = await register(
        regData.username.trim(),
        regData.display_name.trim(),
        regData.email.trim(),
        regData.password
      );
      if ("error" in result) {
        const fieldErrors: Record<string, string> = {};
        const err = result.error;
        if (err.includes("имя пользователя") || err.includes("занято") || err.includes("Имя пользователя")) fieldErrors.username = err;
        else if (err.includes("email") || err.includes("Email")) fieldErrors.email = err;
        else if (err.includes("пароль") || err.includes("Пароль")) fieldErrors.password = err;
        else if (err.includes("имя") || err.includes("Имя")) fieldErrors.display_name = err;
        else fieldErrors.general = err;
        setRegErrors(fieldErrors);
        toast.error(err);
      } else {
        toast.success("Аккаунт создан! Добро пожаловать, " + result.user.display_name + "!");
        navigate("/");
      }
    } catch {
      toast.error("Произошла ошибка. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-2xl shadow-indigo-500/40">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Nexus</h1>
          <p className="text-indigo-300 text-sm mt-1">Мессенджер нового поколения</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-black/20">
            <button
              onClick={() => { setTab("login"); setLoginErrors({}); }}
              className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${
                tab === "login"
                  ? "bg-white/15 text-white border-b-2 border-indigo-400"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Войти
            </button>
            <button
              onClick={() => { setTab("register"); setRegErrors({}); }}
              className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${
                tab === "register"
                  ? "bg-white/15 text-white border-b-2 border-indigo-400"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Регистрация
            </button>
          </div>

          <div className="p-8">
            {/* LOGIN FORM */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-5" noValidate>
                {loginErrors.general && (
                  <div className="bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl p-3 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {loginErrors.general}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-indigo-300 mb-1.5 uppercase tracking-wider">
                    Логин или Email
                  </label>
                  <input
                    type="text"
                    value={loginData.login}
                    onChange={e => {
                      setLoginData(d => ({ ...d, login: e.target.value }));
                      if (loginErrors.login) setLoginErrors(err => ({ ...err, login: "" }));
                    }}
                    placeholder="username или email@mail.ru"
                    className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      loginErrors.login ? "border-red-500/60 focus:ring-red-500/40" : "border-white/20 focus:ring-indigo-500/60"
                    }`}
                    autoComplete="username"
                  />
                  {loginErrors.login && <p className="text-red-400 text-xs mt-1">{loginErrors.login}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-indigo-300 mb-1.5 uppercase tracking-wider">
                    Пароль
                  </label>
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={e => {
                      setLoginData(d => ({ ...d, password: e.target.value }));
                      if (loginErrors.password) setLoginErrors(err => ({ ...err, password: "" }));
                    }}
                    placeholder="Введите пароль"
                    className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      loginErrors.password ? "border-red-500/60 focus:ring-red-500/40" : "border-white/20 focus:ring-indigo-500/60"
                    }`}
                    autoComplete="current-password"
                  />
                  {loginErrors.password && <p className="text-red-400 text-xs mt-1">{loginErrors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Вход...
                    </>
                  ) : (
                    "Войти"
                  )}
                </button>
              </form>
            )}

            {/* REGISTER FORM */}
            {tab === "register" && (
              <form onSubmit={handleRegister} className="space-y-4" noValidate>
                {regErrors.general && (
                  <div className="bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl p-3 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {regErrors.general}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-indigo-300 mb-1.5 uppercase tracking-wider">
                    Ваше имя
                  </label>
                  <input
                    type="text"
                    value={regData.display_name}
                    onChange={e => {
                      setRegData(d => ({ ...d, display_name: e.target.value }));
                      if (regErrors.display_name) setRegErrors(err => ({ ...err, display_name: "" }));
                    }}
                    placeholder="Иван Петров"
                    className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      regErrors.display_name ? "border-red-500/60 focus:ring-red-500/40" : "border-white/20 focus:ring-indigo-500/60"
                    }`}
                  />
                  {regErrors.display_name && <p className="text-red-400 text-xs mt-1">{regErrors.display_name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-indigo-300 mb-1.5 uppercase tracking-wider">
                    Имя пользователя
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">@</span>
                    <input
                      type="text"
                      value={regData.username}
                      onChange={e => {
                        setRegData(d => ({ ...d, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") }));
                        if (regErrors.username) setRegErrors(err => ({ ...err, username: "" }));
                      }}
                      placeholder="ivan_petrov"
                      className={`w-full bg-white/10 border rounded-xl pl-8 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        regErrors.username ? "border-red-500/60 focus:ring-red-500/40" : "border-white/20 focus:ring-indigo-500/60"
                      }`}
                    />
                  </div>
                  {regErrors.username && <p className="text-red-400 text-xs mt-1">{regErrors.username}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-indigo-300 mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={regData.email}
                    onChange={e => {
                      setRegData(d => ({ ...d, email: e.target.value }));
                      if (regErrors.email) setRegErrors(err => ({ ...err, email: "" }));
                    }}
                    placeholder="ivan@mail.ru"
                    className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      regErrors.email ? "border-red-500/60 focus:ring-red-500/40" : "border-white/20 focus:ring-indigo-500/60"
                    }`}
                    autoComplete="email"
                  />
                  {regErrors.email && <p className="text-red-400 text-xs mt-1">{regErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-indigo-300 mb-1.5 uppercase tracking-wider">
                    Пароль
                  </label>
                  <input
                    type="password"
                    value={regData.password}
                    onChange={e => {
                      setRegData(d => ({ ...d, password: e.target.value }));
                      if (regErrors.password) setRegErrors(err => ({ ...err, password: "" }));
                    }}
                    placeholder="Минимум 6 символов"
                    className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      regErrors.password ? "border-red-500/60 focus:ring-red-500/40" : "border-white/20 focus:ring-indigo-500/60"
                    }`}
                    autoComplete="new-password"
                  />
                  {regErrors.password && <p className="text-red-400 text-xs mt-1">{regErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-indigo-300 mb-1.5 uppercase tracking-wider">
                    Подтверждение пароля
                  </label>
                  <input
                    type="password"
                    value={regData.confirm_password}
                    onChange={e => {
                      setRegData(d => ({ ...d, confirm_password: e.target.value }));
                      if (regErrors.confirm_password) setRegErrors(err => ({ ...err, confirm_password: "" }));
                    }}
                    placeholder="Повторите пароль"
                    className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      regErrors.confirm_password ? "border-red-500/60 focus:ring-red-500/40" : "border-white/20 focus:ring-indigo-500/60"
                    }`}
                    autoComplete="new-password"
                  />
                  {regErrors.confirm_password && <p className="text-red-400 text-xs mt-1">{regErrors.confirm_password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Создание...
                    </>
                  ) : (
                    "Создать аккаунт"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          Nexus Messenger &copy; 2024
        </p>
      </div>
    </div>
  );
}

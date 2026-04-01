import { createServer } from "http";
import { Client } from "pg";
import { createHmac, randomBytes } from "crypto";

const S = "t_p87867187_messenger_beautiful_";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

function json(res: any, code: number, data: any) {
  res.writeHead(code, cors);
  res.end(JSON.stringify(data));
}

function body(req: any): Promise<any> {
  return new Promise(r => {
    let d = "";
    req.on("data", (c: any) => d += c);
    req.on("end", () => { try { r(JSON.parse(d || "{}")); } catch { r({}); } });
  });
}

function hashPw(pw: string) {
  const salt = randomBytes(16).toString("hex");
  const h = createHmac("sha256", salt).update(pw).digest("hex");
  return salt + ":" + h;
}

function verifyPw(pw: string, stored: string) {
  const [salt, h] = stored.split(":");
  return createHmac("sha256", salt).update(pw).digest("hex") === h;
}

function mkToken() { return randomBytes(32).toString("hex"); }

function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#22c55e","#14b8a6","#3b82f6"];
function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

createServer(async (req: any, res: any) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }
  const path = new URL(req.url, "http://x").pathname;
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await db.connect();

    if (req.method === "POST" && path === "/auth/register") {
      const b = await body(req);
      const { username, display_name, email, password } = b;
      if (!username || !display_name || !email || !password)
        return json(res, 400, { error: "Все поля обязательны" });
      if (username.length < 3)
        return json(res, 400, { error: "Имя пользователя минимум 3 символа" });
      if (!/^[a-zA-Z0-9_]+$/.test(username))
        return json(res, 400, { error: "Только латиница, цифры и _ в имени" });
      if (password.length < 6)
        return json(res, 400, { error: "Пароль минимум 6 символов" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return json(res, 400, { error: "Некорректный email" });

      const uCheck = await db.query(`SELECT id FROM ${S}.users WHERE username=$1`, [username.toLowerCase()]);
      if (uCheck.rows.length) return json(res, 409, { error: "Имя пользователя занято" });
      const eCheck = await db.query(`SELECT id FROM ${S}.users WHERE email=$1`, [email.toLowerCase()]);
      if (eCheck.rows.length) return json(res, 409, { error: "Email уже зарегистрирован" });

      const r = await db.query(
        `INSERT INTO ${S}.users(username,display_name,email,password_hash,avatar_initials,avatar_color) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,username,display_name,email,avatar_color,avatar_initials,bio,is_online,created_at`,
        [username.toLowerCase(), display_name, email.toLowerCase(), hashPw(password), getInitials(display_name), randColor()]
      );
      const user = r.rows[0];
      const tok = mkToken();
      await db.query(`INSERT INTO ${S}.sessions(user_id,token,expires_at) VALUES($1,$2,$3)`, [user.id, tok, new Date(Date.now() + 30 * 864e5)]);
      return json(res, 201, { user, token: tok });
    }

    if (req.method === "POST" && path === "/auth/login") {
      const b = await body(req);
      const { login, password } = b;
      if (!login || !password) return json(res, 400, { error: "Введите логин и пароль" });
      const r = await db.query(`SELECT * FROM ${S}.users WHERE username=$1 OR email=$1`, [login.toLowerCase()]);
      if (!r.rows.length) return json(res, 401, { error: "Неверный логин или пароль" });
      const user = r.rows[0];
      if (!verifyPw(password, user.password_hash)) return json(res, 401, { error: "Неверный логин или пароль" });
      await db.query(`UPDATE ${S}.users SET is_online=true,last_seen=NOW() WHERE id=$1`, [user.id]);
      const tok = mkToken();
      await db.query(`INSERT INTO ${S}.sessions(user_id,token,expires_at) VALUES($1,$2,$3)`, [user.id, tok, new Date(Date.now() + 30 * 864e5)]);
      const { password_hash: _p, ...safe } = user;
      return json(res, 200, { user: safe, token: tok });
    }

    if (req.method === "GET" && path === "/auth/me") {
      const ah = req.headers["authorization"] || "";
      if (!ah.startsWith("Bearer ")) return json(res, 401, { error: "Не авторизован" });
      const tok = ah.slice(7);
      const r = await db.query(
        `SELECT u.id,u.username,u.display_name,u.email,u.avatar_color,u.avatar_initials,u.bio,u.is_online,u.last_seen,u.created_at FROM ${S}.sessions s JOIN ${S}.users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>NOW()`,
        [tok]
      );
      if (!r.rows.length) return json(res, 401, { error: "Сессия истекла" });
      return json(res, 200, { user: r.rows[0] });
    }

    if (req.method === "POST" && path === "/auth/logout") {
      const ah = req.headers["authorization"] || "";
      if (ah.startsWith("Bearer ")) {
        const tok = ah.slice(7);
        const sr = await db.query(`SELECT user_id FROM ${S}.sessions WHERE token=$1`, [tok]);
        await db.query(`UPDATE ${S}.sessions SET expires_at=NOW() WHERE token=$1`, [tok]);
        if (sr.rows.length) await db.query(`UPDATE ${S}.users SET is_online=false,last_seen=NOW() WHERE id=$1`, [sr.rows[0].user_id]);
      }
      return json(res, 200, { success: true });
    }

    json(res, 404, { error: "Not found" });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "Ошибка сервера" });
  } finally {
    await db.end();
  }
}).listen(3000);

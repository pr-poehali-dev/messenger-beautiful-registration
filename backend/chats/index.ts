import { createServer, IncomingMessage, ServerResponse } from "http";
import { Client } from "pg";

const S = "t_p87867187_messenger_beautiful_";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

function json(res: ServerResponse, code: number, data: unknown) {
  res.writeHead(code, cors);
  res.end(JSON.stringify(data));
}

function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise(r => {
    let d = "";
    req.on("data", (c: Buffer) => d += c.toString());
    req.on("end", () => { try { r(JSON.parse(d || "{}")); } catch { r({}); } });
  });
}

async function getUser(db: Client, token: string) {
  const r = await db.query(
    `SELECT u.id,u.username,u.display_name,u.avatar_color,u.avatar_initials,u.is_online FROM ${S}.sessions s JOIN ${S}.users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>NOW()`,
    [token]
  );
  return r.rows[0] || null;
}

createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }

  const url = new URL(req.url || "/", "http://x");
  const parts = url.pathname.split("/").filter(Boolean);
  const ah = (req.headers["authorization"] || "") as string;

  if (!ah.startsWith("Bearer ")) return json(res, 401, { error: "Не авторизован" });
  const token = ah.slice(7);

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await db.connect();
    const me = await getUser(db, token);
    if (!me) return json(res, 401, { error: "Сессия истекла" });

    // GET /chats
    if (req.method === "GET" && parts.length === 1 && parts[0] === "chats") {
      const r = await db.query(
        `SELECT c.id,c.name,c.is_group,c.avatar_color,c.created_at,
          CASE WHEN c.is_group=false THEN (SELECT u.display_name FROM ${S}.chat_members cm2 JOIN ${S}.users u ON u.id=cm2.user_id WHERE cm2.chat_id=c.id AND cm2.user_id!=$1 LIMIT 1) ELSE c.name END as display_name,
          CASE WHEN c.is_group=false THEN (SELECT u.avatar_color FROM ${S}.chat_members cm2 JOIN ${S}.users u ON u.id=cm2.user_id WHERE cm2.chat_id=c.id AND cm2.user_id!=$1 LIMIT 1) ELSE c.avatar_color END as display_avatar_color,
          CASE WHEN c.is_group=false THEN (SELECT u.avatar_initials FROM ${S}.chat_members cm2 JOIN ${S}.users u ON u.id=cm2.user_id WHERE cm2.chat_id=c.id AND cm2.user_id!=$1 LIMIT 1) ELSE NULL END as display_avatar_initials,
          CASE WHEN c.is_group=false THEN (SELECT u.is_online FROM ${S}.chat_members cm2 JOIN ${S}.users u ON u.id=cm2.user_id WHERE cm2.chat_id=c.id AND cm2.user_id!=$1 LIMIT 1) ELSE false END as is_online,
          CASE WHEN c.is_group=false THEN (SELECT u.id FROM ${S}.chat_members cm2 JOIN ${S}.users u ON u.id=cm2.user_id WHERE cm2.chat_id=c.id AND cm2.user_id!=$1 LIMIT 1) ELSE NULL END as other_user_id,
          (SELECT content FROM ${S}.messages m WHERE m.chat_id=c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM ${S}.messages m WHERE m.chat_id=c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time,
          (SELECT COUNT(*) FROM ${S}.messages m WHERE m.chat_id=c.id AND m.is_read=false AND m.sender_id!=$1) as unread_count
        FROM ${S}.chats c JOIN ${S}.chat_members cm ON cm.chat_id=c.id WHERE cm.user_id=$1
        ORDER BY last_message_time DESC NULLS LAST,c.created_at DESC`,
        [me.id]
      );
      return json(res, 200, { chats: r.rows });
    }

    // POST /chats
    if (req.method === "POST" && parts.length === 1 && parts[0] === "chats") {
      const b = await body(req);
      const { user_id, name, is_group } = b as { user_id?: string; name?: string; is_group?: boolean };
      if (!is_group && !user_id) return json(res, 400, { error: "Укажите пользователя" });
      if (is_group && !name) return json(res, 400, { error: "Укажите название группы" });

      if (!is_group) {
        const ex = await db.query(
          `SELECT c.id FROM ${S}.chats c JOIN ${S}.chat_members cm1 ON cm1.chat_id=c.id AND cm1.user_id=$1 JOIN ${S}.chat_members cm2 ON cm2.chat_id=c.id AND cm2.user_id=$2 WHERE c.is_group=false`,
          [me.id, user_id]
        );
        if (ex.rows.length) return json(res, 200, { chat_id: ex.rows[0].id, already_exists: true });
      }

      const cr = await db.query(`INSERT INTO ${S}.chats(name,is_group,created_by) VALUES($1,$2,$3) RETURNING id`, [name || null, is_group || false, me.id]);
      const cid = cr.rows[0].id;
      await db.query(`INSERT INTO ${S}.chat_members(chat_id,user_id) VALUES($1,$2)`, [cid, me.id]);
      if (!is_group && user_id) await db.query(`INSERT INTO ${S}.chat_members(chat_id,user_id) VALUES($1,$2)`, [cid, user_id]);
      return json(res, 201, { chat_id: cid });
    }

    // GET /chats/:id/messages
    if (req.method === "GET" && parts.length === 3 && parts[0] === "chats" && parts[2] === "messages") {
      const cid = parts[1];
      const mc = await db.query(`SELECT id FROM ${S}.chat_members WHERE chat_id=$1 AND user_id=$2`, [cid, me.id]);
      if (!mc.rows.length) return json(res, 403, { error: "Нет доступа" });

      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      const r = await db.query(
        `SELECT m.id,m.content,m.is_read,m.created_at,m.sender_id,u.display_name as sender_name,u.avatar_color as sender_avatar_color,u.avatar_initials as sender_avatar_initials,(m.sender_id=$2) as is_own FROM ${S}.messages m JOIN ${S}.users u ON u.id=m.sender_id WHERE m.chat_id=$1 ORDER BY m.created_at ASC LIMIT $3 OFFSET $4`,
        [cid, me.id, limit, offset]
      );
      await db.query(`UPDATE ${S}.messages SET is_read=true WHERE chat_id=$1 AND sender_id!=$2 AND is_read=false`, [cid, me.id]);
      return json(res, 200, { messages: r.rows });
    }

    // POST /chats/:id/messages
    if (req.method === "POST" && parts.length === 3 && parts[0] === "chats" && parts[2] === "messages") {
      const cid = parts[1];
      const b = await body(req);
      const { content } = b as { content?: string };
      if (!content || !content.trim()) return json(res, 400, { error: "Сообщение пустое" });

      const mc = await db.query(`SELECT id FROM ${S}.chat_members WHERE chat_id=$1 AND user_id=$2`, [cid, me.id]);
      if (!mc.rows.length) return json(res, 403, { error: "Нет доступа" });

      const r = await db.query(
        `INSERT INTO ${S}.messages(chat_id,sender_id,content) VALUES($1,$2,$3) RETURNING id,content,is_read,created_at,sender_id`,
        [cid, me.id, content.trim()]
      );
      await db.query(`UPDATE ${S}.chats SET updated_at=NOW() WHERE id=$1`, [cid]);
      return json(res, 201, { message: { ...r.rows[0], sender_name: me.display_name, sender_avatar_color: me.avatar_color, sender_avatar_initials: me.avatar_initials, is_own: true } });
    }

    // GET /chats/users/search
    if (req.method === "GET" && parts[0] === "chats" && parts[1] === "users" && parts[2] === "search") {
      const q = url.searchParams.get("q") || "";
      if (q.length < 2) return json(res, 200, { users: [] });
      const r = await db.query(
        `SELECT id,username,display_name,avatar_color,avatar_initials,is_online FROM ${S}.users WHERE (username ILIKE $1 OR display_name ILIKE $1) AND id!=$2 LIMIT 20`,
        [`%${q}%`, me.id]
      );
      return json(res, 200, { users: r.rows });
    }

    json(res, 404, { error: "Not found" });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "Ошибка сервера" });
  } finally {
    await db.end();
  }
}).listen(3000);

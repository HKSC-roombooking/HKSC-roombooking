// 通用 CORS 與 禁用快取 標頭設定
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json;charset=UTF-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache"
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// Cloudflare Pages Function - 讀取 Cloudflare D1 SQL 資料庫
export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Cloudflare D1 綁定變數名稱不符合 (未設定 'DB')" }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const { results } = await env.DB.prepare(
      "SELECT id, room, category, detail, date, startTime, endTime, sessionIndex, totalSessions, status, createdAt FROM bookings ORDER BY date ASC, startTime ASC"
    ).all();

    return new Response(JSON.stringify(results || []), {
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 新增預約記錄
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Cloudflare D1 綁定變數名稱不符合 (未設定 'DB')" }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const items = await request.json();
    const records = Array.isArray(items) ? items : [items];

    const stmt = env.DB.prepare(`
      INSERT OR REPLACE INTO bookings (id, room, category, detail, date, startTime, endTime, sessionIndex, totalSessions, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batch = records.map(b => stmt.bind(
      b.id,
      b.room,
      b.category,
      b.detail || '',
      b.date,
      b.startTime,
      b.endTime,
      b.sessionIndex || 1,
      b.totalSessions || 1,
      b.status || 'active',
      b.createdAt || new Date().toISOString()
    ));

    await env.DB.batch(batch);
    return new Response(JSON.stringify({ success: true, count: records.length }), {
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 修改 / 取消預約記錄
export async function onRequestPut(context) {
  const { request, env } = context;
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Cloudflare D1 綁定變數名稱不符合 (未設定 'DB')" }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const b = await request.json();
    await env.DB.prepare(`
      UPDATE bookings 
      SET room = ?, category = ?, detail = ?, date = ?, startTime = ?, endTime = ?, sessionIndex = ?, totalSessions = ?, status = ?
      WHERE id = ?
    `).bind(b.room, b.category, b.detail || '', b.date, b.startTime, b.endTime, b.sessionIndex || 1, b.totalSessions || 1, b.status, b.id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Admin 專用：徹底刪除預約記錄 (DELETE)
export async function onRequestDelete(context) {
  const { request, env } = context;
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Cloudflare D1 綁定變數名稱不符合 (未設定 'DB')" }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: "缺少預約識別碼 (id)" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const result = await env.DB.prepare("DELETE FROM bookings WHERE id = ?").bind(id).run();

    return new Response(JSON.stringify({ success: true, changes: result.meta ? result.meta.changes : 1 }), {
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

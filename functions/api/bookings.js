// 通用 CORS 標頭設定，允許跨域請求與 OPTIONS 預檢
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json;charset=UTF-8"
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// Cloudflare Pages Function - 讀取、新增、修改 Cloudflare D1 SQL 資料庫
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
      SET room = ?, category = ?, detail = ?, date = ?, startTime = ?, endTime = ?, status = ?
      WHERE id = ?
    `).bind(b.room, b.category, b.detail || '', b.date, b.startTime, b.endTime, b.status, b.id).run();

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

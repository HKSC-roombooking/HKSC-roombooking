// 1. GET 請求：讀取所有預約清單
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM bookings ORDER BY booking_date ASC, start_time ASC"
    ).all();

    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

// 2. POST 請求：新增一筆預約
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { booking_date, room_number, category, sessions, start_time, end_time, status, notes } = body;

    // 基本欄位驗證
    if (!booking_date || !room_number || !start_time || !end_time) {
      return new Response(JSON.stringify({ success: false, error: "請填寫所有必填欄位" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // 寫入 D1 資料庫
    await context.env.DB.prepare(
      `INSERT INTO bookings (booking_date, room_number, category, sessions, start_time, end_time, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      booking_date,
      room_number,
      category || '',
      sessions || 1,
      start_time,
      end_time,
      status || '待確認',
      notes || ''
    ).run();

    return new Response(JSON.stringify({ success: true, message: "預約成功新增！" }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

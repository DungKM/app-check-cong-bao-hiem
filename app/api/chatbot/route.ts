import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { messages } = await req.json() as { messages: { role: string; content: string }[] };

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY chưa cấu hình trong .env' }, { status: 500 });

  const systemText =
    'Bạn là trợ lý AI chuyên về BHYT (Bảo hiểm Y tế) Việt Nam và giám định hồ sơ thanh toán y tế.\n' +
    'Chuyên môn: quy định thanh toán BHYT, các Thông tư 05/36/37/50/68, danh mục thuốc & DVKT được chi trả, ' +
    'các trường hợp bị xuất toán, chỉ định hợp lý theo ICD-10, mức hưởng BHYT ngoại/nội trú.\n' +
    'Trả lời ngắn gọn, rõ ràng, bằng tiếng Việt. Nếu không chắc, hãy nói rõ.';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemText }] },
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    return NextResponse.json({ error: (e as any)?.error?.message || 'Lỗi Gemini' }, { status: 502 });
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
  return NextResponse.json({ text });
}

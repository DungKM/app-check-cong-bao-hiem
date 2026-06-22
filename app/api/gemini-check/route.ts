import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// ── Types ──────────────────────────────────────────────────
type Rule = {
  Nhom: string;
  Ma: string;
  Ten_chi_phi: string;
  Can_cu: string;
  Co_so_thanh_toan: string;
  Quy_tac_giam_tru: string;
};

type HoSoData = {
  info: Record<string, string>;
  thuoc: { ten: string; ma: string; sl: string; ngay_yl: string }[];
  dvkt:  { ten: string; ma: string; nhom: string; sl: string; ngay_yl: string; ngay_kq: string }[];
  cls:   { ten: string; ma_dv: string; ngay_kq: string }[];
};

// ── Cache với TTL 5 phút ───────────────────────────────────
let rulesCache: Rule[] | null = null;
let rulesCacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadRules(): Promise<Rule[]> {
  if (rulesCache && Date.now() - rulesCacheAt < CACHE_TTL) return rulesCache;

  const client = await clientPromise;
  const docs = await client.db()
    .collection('quy_tac')
    .find({ active: true })
    .project({ nhom: 1, ma: 1, ten_chi_phi: 1, can_cu: 1, co_so_thanh_toan: 1, quy_tac_giam_tru: 1 })
    .sort({ stt: 1 })
    .toArray();

  rulesCache = docs.map(d => ({
    Nhom:             String(d.nhom             || ''),
    Ma:               String(d.ma               || ''),
    Ten_chi_phi:      String(d.ten_chi_phi      || ''),
    Can_cu:           String(d.can_cu           || ''),
    Co_so_thanh_toan: String(d.co_so_thanh_toan || ''),
    Quy_tac_giam_tru: String(d.quy_tac_giam_tru || ''),
  }));
  rulesCacheAt = Date.now();
  return rulesCache;
}

// ── Chọn quy tắc liên quan ─────────────────────────────────
const STOP = new Set([
  'dinh','luong','mau','xet','nghiem','dich','trong','cac','truong',
  'hop','thanh','toan','giam','tru','benh','nhan','thuc','hien',
  'cung','ngay','dong','thoi','cua','khi','lam','voi','theo',
  'dvkt','chi','phi','khong','duoc','phau','thuat','thu',
]);

function toks(s: string): Set<string> {
  const res = new Set<string>();
  for (const m of s.toLowerCase().matchAll(/\w+/g)) {
    const w = m[0]; if (w.length >= 4 && !STOP.has(w)) res.add(w);
  }
  return res;
}

function chonLienQuan(rules: Rule[], info: Record<string, string>, dvkt: HoSoData['dvkt'], thuoc: HoSoData['thuoc'], limit = 80): Rule[] {
  const maSet = new Set(dvkt.map(d => d.ma.trim()).filter(Boolean));
  const tenToks = new Set<string>();
  for (const d of dvkt)  for (const t of toks(d.ten))  tenToks.add(t);
  for (const t of thuoc) for (const tok of toks(t.ten)) tenToks.add(tok);
  for (const tok of toks(info.chan_doan || '')) tenToks.add(tok);

  const out: Rule[] = [];
  for (const r of rules) {
    const rma     = r.Ma.trim();
    const rten    = r.Ten_chi_phi;
    const codeHit = (rma && maSet.has(rma)) || [...maSet].some(m => m && rten.includes(m));
    let overlap   = 0;
    for (const t of toks(rten)) if (tenToks.has(t)) overlap++;
    if (codeHit || overlap >= 2) { out.push(r); if (out.length >= limit) break; }
  }
  return out;
}

// ── Tạo text hồ sơ ────────────────────────────────────────
function hosoText({ info, thuoc, dvkt }: HoSoData): string {
  const lines = [
    `Loại KCB: ${info.ma_loai_kcb} | Chẩn đoán: ${info.chan_doan} (mã ${info.ma_benh}) | Số ngày ĐT: ${info.so_ngay} | Vào ${info.ngay_vao} Ra ${info.ngay_ra}`,
  ];
  if (thuoc.length) {
    lines.push('THUỐC:');
    for (const t of thuoc) lines.push(`- ${t.ten} (mã ${t.ma}) SL ${t.sl} YL ${t.ngay_yl}`);
  }
  if (dvkt.length) {
    lines.push('DỊCH VỤ KỸ THUẬT / XÉT NGHIỆM:');
    for (const d of dvkt) lines.push(`- ${d.ten} (mã ${d.ma}) SL ${d.sl} YL ${d.ngay_yl} KQ ${d.ngay_kq}`);
  }
  return lines.join('\n');
}

function rulesText(rules: Rule[]): string {
  return rules.map(r =>
    `- [${r.Nhom}] ${r.Ten_chi_phi} | Cơ sở TT: ${r.Co_so_thanh_toan} | Giảm trừ: ${r.Quy_tac_giam_tru}`
  ).join('\n');
}

// ── Gọi Gemini REST ────────────────────────────────────────
async function callGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Gemini trả về lỗi HTTP ${res.status}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
}

// ── Parse JSON từ response ─────────────────────────────────
function parseJson(raw: string): object[] | null {
  let text = raw.trim().replace(/^﻿/, '');
  if (text.startsWith('```')) {
    text = text.replace(/^```[\w]*\n?/, '').replace(/```$/, '').trim();
  }
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch { /* try extracting objects */ }

  const objs: object[] = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}' && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        try { objs.push(JSON.parse(text.slice(start, i + 1))); } catch { }
        start = -1;
      }
    }
  }
  return objs.length ? objs : (/\[\s*\]/.test(text) ? [] : null);
}

// ── Route handler ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      model?: string;
      info: Record<string, string>;
      thuoc: HoSoData['thuoc'];
      dvkt:  HoSoData['dvkt'];
      cls:   HoSoData['cls'];
    };

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY chưa được cấu hình trong .env' }, { status: 500 });

    const { model = 'gemini-2.5-flash', info, thuoc, dvkt, cls } = body;

    const rules = await loadRules();

    if (rules.length === 0) {
      return NextResponse.json(
        { error: 'Chưa có quy tắc nào trong hệ thống. Vui lòng import quy tắc vào trang Quản lý Quy tắc BH.' },
        { status: 422 },
      );
    }

    const relevant = chonLienQuan(rules, info, dvkt, thuoc);

    const systemPrompt =
      'Bạn là chuyên gia giám định BHYT. Dưới đây là CÁC QUY TẮC GIẢM TRỪ liên quan:\n\n' +
      rulesText(relevant) +
      '\n\nNhiệm vụ: đối chiếu hồ sơ với các quy tắc trên, tìm các mục có NGUY CƠ bị xuất toán.' +
      ' QUY TẮC BẮT BUỘC:\n' +
      '- Mỗi cảnh báo PHẢI dẫn đúng quy tắc gốc ở trên (trường can_cu).\n' +
      '- KHÔNG bịa quy tắc ngoài danh sách. Không chắc thì bỏ qua.\n' +
      '- Chú ý chẩn đoán: nếu chẩn đoán đã phù hợp chỉ định thì KHÔNG cảnh báo.';

    const userPrompt =
      'HỒ SƠ:\n' + hosoText({ info, thuoc, dvkt, cls }) +
      '\n\nCHỈ trả về JSON, không thêm chữ nào khác. Mảng các object: ' +
      '{"muc":"tên ngắn","loai_loi":"ngắn","ly_do":"tối đa 15 từ",' +
      '"can_cu":"chỉ [Nhóm] + tên quy tắc, KHÔNG chép nội dung",' +
      '"nguy_co":"cao|trung binh|thap"}. ' +
      'Viết CỰC NGẮN GỌN. Tối đa 15 mục. Nếu không có nguy cơ, trả về [].';

    const raw  = await callGemini(apiKey, model, systemPrompt, userPrompt);
    const data = parseJson(raw);

    if (data === null) {
      return NextResponse.json(
        { error: 'Không đọc được JSON từ Gemini. Phản hồi:\n\n' + raw.slice(0, 600) },
        { status: 502 },
      );
    }

    return NextResponse.json({
      results:       data,
      rulesTotal:    rules.length,
      rulesRelevant: relevant.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi không xác định' }, { status: 500 });
  }
}

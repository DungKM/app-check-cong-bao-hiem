import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import clientPromise from '@/lib/mongodb';
import * as XLSX from 'xlsx';

function isAdmin(session: any) {
  return session?.user?.role === 'admin';
}

function strv(v: unknown): string {
  const s = String(v ?? '').trim();
  return s === 'nan' || s === 'undefined' ? '' : s;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ message: 'Vui lòng chọn file Excel' }, { status: 400 });

  const buf   = Buffer.from(await file.arrayBuffer());
  const wb    = XLSX.read(buf, { cellText: true, cellDates: false });
  const rules: Record<string, unknown>[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    if (raw.length === 0) continue;

    const firstKeys = Object.keys(raw[0]).map(k => k.toLowerCase().trim());

    if (firstKeys.includes('ten_chi_phi') || firstKeys.includes('tên chi phí')) {
      for (const r of raw) {
        const ten = strv(r['ten_chi_phi'] ?? r['Ten_chi_phi'] ?? r['tên chi phí'] ?? r['Tên chi phí']);
        if (!ten) continue;
        const sttRaw = r['stt'] ?? r['STT'] ?? r['st'] ?? '';
        rules.push({
          stt:              isNaN(Number(sttRaw)) ? 0 : Number(sttRaw),
          nhom:             strv(r['nhom'] ?? r['Nhom'] ?? r['NHÓM'] ?? sheetName),
          ma:               strv(r['ma']   ?? r['Ma']   ?? r['Mã']   ?? r['MA']),
          ten_chi_phi:      ten,
          can_cu:           strv(r['can_cu'] ?? r['Can_cu'] ?? r['Căn cứ'] ?? r['CĂN CỨ']),
          co_so_thanh_toan: strv(r['co_so_thanh_toan'] ?? r['Co_so_thanh_toan'] ?? r['Cơ sở thanh toán']),
          quy_tac_giam_tru: strv(r['quy_tac_giam_tru'] ?? r['Quy_tac_giam_tru'] ?? r['Quy tắc giảm trừ']),
        });
      }
    } else {
      // Tìm header row trong 8 dòng đầu
      const rawArr = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][];
      let hRow = -1;
      for (let i = 0; i < Math.min(8, rawArr.length); i++) {
        const joined = rawArr[i].map(c => String(c).toLowerCase()).join(' ');
        if (joined.includes('tên chi phí') || joined.includes('ten chi phi') || joined.includes('ten_chi_phi')) {
          hRow = i; break;
        }
      }
      if (hRow === -1) continue;

      const headers = rawArr[hRow].map(c => String(c).toLowerCase().trim());
      const col = (...kws: string[]) => headers.findIndex(h => kws.some(k => h.includes(k)));

      const iStt = col('stt', 'st');
      const iNhom = col('nhóm', 'nhom', 'group');
      const iMa  = col('mã ', 'ma ', 'code');
      const iT   = col('tên chi phí', 'ten chi phi', 'tên dịch vụ');
      const iCan = col('căn cứ', 'can cu');
      const iCo  = col('cơ sở', 'co so', 'nội dung');
      const iQ   = col('giảm trừ', 'giam tru', 'quy tắc');

      if (iT === -1) continue;

      for (let i = hRow + 1; i < rawArr.length; i++) {
        const r   = rawArr[i] as unknown[];
        const get = (idx: number) => idx >= 0 ? strv(String(r[idx] ?? '').replace(/\n/g, ' ')) : '';
        const ten = get(iT);
        if (!ten) continue;
        const sttRaw = get(iStt);
        rules.push({
          stt:              isNaN(Number(sttRaw)) ? 0 : Number(sttRaw),
          nhom:             iNhom >= 0 ? get(iNhom) : sheetName,
          ma:               get(iMa),
          ten_chi_phi:      ten,
          can_cu:           get(iCan),
          co_so_thanh_toan: get(iCo),
          quy_tac_giam_tru: get(iQ),
        });
      }
    }
  }

  if (rules.length === 0)
    return NextResponse.json({ message: 'Không tìm thấy dữ liệu quy tắc trong file' }, { status: 400 });

  const col = (await clientPromise).db().collection('quy_tac');
  const now = new Date();
  let inserted = 0, updated = 0;

  for (const r of rules) {
    const filter = r.stt ? { stt: r.stt } : { ten_chi_phi: r.ten_chi_phi };
    const existing = await col.findOne(filter);
    if (existing) {
      await col.updateOne({ _id: existing._id }, {
        $set: { ...r, updatedAt: now },
      });
      updated++;
    } else {
      await col.insertOne({ ...r, loai_xu_ly: 'ai', active: true, createdAt: now, updatedAt: now });
      inserted++;
    }
  }

  return NextResponse.json({
    message: `Import thành công: ${inserted} quy tắc mới, ${updated} quy tắc cập nhật`,
    inserted, updated, total: rules.length,
  });
}

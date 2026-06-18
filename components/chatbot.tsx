'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Bot } from 'lucide-react';

type Msg = { role: 'user' | 'model'; content: string };

const SUGGESTIONS = [
  'Thuốc nào được BHYT chi trả?',
  'Khi nào bị xuất toán hồ sơ?',
  'Tỷ lệ hưởng BHYT ngoại trú?',
  'Mã ICD-10 thường gặp là gì?',
];

export default function Chatbot() {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState<Msg[]>([]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 120); }, [open]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    const updated: Msg[] = [...msgs, { role: 'user', content: msg }];
    setMsgs(updated); setInput(''); setErr(''); setLoading(true);

    try {
      const res  = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      if (data.error) { setErr(data.error); }
      else setMsgs(prev => [...prev, { role: 'model', content: data.text }]);
    } catch { setErr('Lỗi kết nối server.'); }
    finally  { setLoading(false); }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          style={{ height: 520 }}>
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-700 to-indigo-600 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Trợ lý BHYT AI</p>
                <p className="text-[10px] text-purple-200">Powered by Gemini</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              className="rounded-full p-1 text-purple-200 hover:bg-white/20 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.length === 0 && (
              <div className="mt-3 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-purple-50">
                  <Bot className="h-7 w-7 text-purple-500" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Xin chào!</p>
                <p className="mt-0.5 text-xs text-gray-400">Hỏi tôi về quy định BHYT, thuốc, dịch vụ...</p>
                <div className="mt-4 flex flex-col gap-2">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-left text-xs text-purple-700 transition hover:bg-purple-100">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${
                  m.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  {m.role === 'user' ? 'U' : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'rounded-tr-sm bg-blue-600 text-white'
                    : 'rounded-tl-sm bg-gray-100 text-gray-800'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3.5">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{err}</p>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2
              focus-within:border-purple-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-400/20">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Hỏi về BHYT..."
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="rounded-lg bg-purple-600 p-1.5 text-white transition hover:bg-purple-700 disabled:opacity-40">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${
          open ? 'bg-slate-800 hover:bg-slate-900' : 'bg-gradient-to-br from-purple-600 to-indigo-600 hover:shadow-purple-500/40 hover:shadow-xl'
        }`}>
        {open ? <X className="h-5 w-5 text-white" /> : (
          <div className="relative">
            <Sparkles className="h-6 w-6 text-white" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-300 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-200" />
            </span>
          </div>
        )}
      </button>
    </>
  );
}

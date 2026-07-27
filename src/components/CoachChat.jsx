import { useState } from 'react';
import { getCoachChatReply } from '../lib/coachApi';

const MAX_HISTORY_SENT = 6;

export function CoachChat({ fen, moveHistorySan, studentColor, playerElo, persona }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendQuestion = async () => {
    const question = input.trim();
    if (!question || loading) return;
    setInput('');
    const nextMessages = [...messages, { role: 'user', text: question }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const result = await getCoachChatReply({
        fen,
        moveHistorySan,
        studentColor,
        playerElo,
        question,
        conversationHistory: nextMessages.slice(-MAX_HISTORY_SENT),
      });
      setMessages((prev) => [...prev, { role: 'coach', text: result.reply }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-3 text-sm font-bold text-slate-200"
      >
        <span>💬 שאלו את {persona.name} כל שאלה</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-700 p-3">
          {messages.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-2 text-sm ${
                    m.role === 'user' ? 'bg-sky-950/50 text-sky-100' : 'bg-slate-900 text-slate-200'
                  }`}
                >
                  <span className="font-bold">{m.role === 'user' ? 'אתם: ' : `${persona.name}: `}</span>
                  {m.text}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-900 p-2 text-sm text-slate-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                  {persona.name} חושב/ת...
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="למשל: למה המהלך הזה טוב? מה כדאי לי לתכנן עכשיו?"
              className="flex-1 resize-none rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
            <button
              onClick={sendQuestion}
              disabled={loading || !input.trim()}
              className="rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-2 text-sm font-bold text-white transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              שלח
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

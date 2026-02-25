import type { ChatMessage } from '../types';

type Props = {
  messages: ChatMessage[];
  onSend: (content: string) => void;
};

export function ChatPanel({ messages, onSend }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const value = (formData.get('message') as string) ?? '';
    if (!value.trim()) return;
    onSend(value.trim());
    e.currentTarget.reset();
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/80">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        <span>Chat</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-xs">
        {messages.length === 0 && (
          <p className="text-center text-slate-500">No messages yet. Say hello 👋</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">{m.senderName}</span>
              <span className="text-[10px] text-slate-500">
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="rounded-lg bg-slate-800/80 px-2 py-1 text-slate-100">{m.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-slate-800 p-2">
        <input
          name="message"
          autoComplete="off"
          placeholder="Type a message..."
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </form>
    </div>
  );
}


import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import { ChatMessage } from '@meetdraw/shared';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
  selfPeerId: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onClose,
  selfPeerId,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="bg-white border-l border-slate-200 flex flex-col w-72 sm:w-80 h-full z-20 select-none shadow-sm font-sans">
      {/* Header */}
      <div className="h-12 border-b border-slate-200 px-3.5 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <MessageSquare size={16} className="text-indigo-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Trò chuyện ({messages.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400">
            <MessageSquare size={24} className="mb-2 opacity-30 text-indigo-600" />
            <p className="font-medium text-slate-500">Chưa có tin nhắn nào trong phòng.</p>
            <p className="mt-1 text-slate-400">Hãy gửi tin nhắn để trò chuyện với mọi người!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === selfPeerId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-slate-400">
                  <span className="font-bold text-slate-600">
                    {isMe ? 'Bạn' : msg.senderName}
                  </span>
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words leading-relaxed ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/80'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 bg-slate-50 text-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 border border-slate-200 placeholder-slate-400 focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition shadow-sm"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

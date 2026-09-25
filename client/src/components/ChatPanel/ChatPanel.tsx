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
    <div className="bg-gray-900 border-l border-gray-800 flex flex-col w-72 sm:w-80 h-full z-20 select-none">
      {/* Header */}
      <div className="h-12 border-b border-gray-800 px-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare size={16} className="text-sky-400" />
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Trò chuyện ({messages.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-gray-500">
            <MessageSquare size={24} className="mb-2 opacity-40 text-sky-400" />
            <p>Chưa có tin nhắn nào trong phòng.</p>
            <p className="mt-1 text-gray-500">Hãy gửi tin nhắn để trò chuyện với mọi người!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === selfPeerId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1.5 mb-0.5 text-[10px] text-gray-400">
                  <span className="font-semibold text-gray-300">
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
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700/60'
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
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 bg-gray-800 text-gray-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 border border-gray-700 placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white rounded-xl transition"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

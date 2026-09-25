import React, { useState } from 'react';
import { BarChart3, Plus, CheckCircle2, Vote, X } from 'lucide-react';
import { PollData } from '@meetdraw/shared';

interface LivePollsPanelProps {
  polls: PollData[];
  onCreatePoll: (question: string, options: string[]) => void;
  onVote: (pollId: string, optionId: string) => void;
  onClose: () => void;
  currentUserId: string;
}

export const LivePollsPanel: React.FC<LivePollsPanelProps> = ({
  polls,
  onCreatePoll,
  onVote,
  onClose,
  currentUserId,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !option1.trim() || !option2.trim()) return;

    const opts = [option1.trim(), option2.trim()];
    if (option3.trim()) opts.push(option3.trim());

    onCreatePoll(question.trim(), opts);
    setIsCreating(false);
    setQuestion('');
    setOption1('');
    setOption2('');
    setOption3('');
  };

  return (
    <div className="bg-white border-l border-slate-200 flex flex-col w-72 sm:w-80 h-full z-20 select-none shadow-sm font-sans">
      {/* Header */}
      <div className="h-12 border-b border-slate-200 px-3.5 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <BarChart3 size={16} className="text-indigo-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Khảo sát ({polls.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 bg-white">
        {/* Create Poll Button */}
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-indigo-700 text-xs font-bold py-2 rounded-xl flex items-center justify-center space-x-1.5 transition shadow-sm"
          >
            <Plus size={14} />
            <span>Tạo cuộc bình chọn</span>
          </button>
        )}

        {/* Create Poll Form */}
        {isCreating && (
          <form onSubmit={handleCreate} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-sm">
            <div className="text-xs font-bold text-slate-900">Tạo bình chọn mới</div>
            <div>
              <input
                type="text"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Câu hỏi bình chọn..."
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
            <div className="space-y-1.5">
              <input
                type="text"
                required
                value={option1}
                onChange={(e) => setOption1(e.target.value)}
                placeholder="Lựa chọn 1"
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-600 transition"
              />
              <input
                type="text"
                required
                value={option2}
                onChange={(e) => setOption2(e.target.value)}
                placeholder="Lựa chọn 2"
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-600 transition"
              />
              <input
                type="text"
                value={option3}
                onChange={(e) => setOption3(e.target.value)}
                placeholder="Lựa chọn 3 (không bắt buộc)"
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition shadow-sm"
              >
                Bắt đầu bình chọn
              </button>
            </div>
          </form>
        )}

        {/* Poll List */}
        {polls.length === 0 && !isCreating ? (
          <div className="text-center py-10 px-2 text-xs text-slate-400">
            <Vote size={28} className="mx-auto mb-2 opacity-30 text-indigo-600" />
            <p className="font-semibold text-slate-600">Chưa có cuộc bình chọn nào.</p>
            <p className="mt-1 text-[11px]">Tạo bình chọn để lấy ý kiến tức thì trong phòng họp.</p>
          </div>
        ) : (
          polls.map((poll) => {
            const hasVoted = poll.votedUserIds?.includes(currentUserId);
            return (
              <div
                key={poll.id}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{poll.question}</h4>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                    {poll.totalVotes} lượt
                  </span>
                </div>

                {/* Options with live bar */}
                <div className="space-y-1.5">
                  {poll.options.map((opt) => {
                    const percentage = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                    return (
                      <button
                        key={opt.id}
                        disabled={hasVoted}
                        onClick={() => onVote(poll.id, opt.id)}
                        className={`w-full text-left p-2 rounded-lg border transition relative overflow-hidden group ${
                          hasVoted
                            ? 'bg-slate-50 border-slate-200 cursor-default'
                            : 'bg-white border-slate-200 hover:border-indigo-400 cursor-pointer'
                        }`}
                      >
                        {/* Background Percentage Bar */}
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-indigo-100/60 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />

                        <div className="relative z-10 flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-800">{opt.text}</span>
                          <span className="text-[11px] font-bold text-indigo-700">{percentage}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Tạo bởi {poll.creatorName}</span>
                  {hasVoted && (
                    <span className="text-emerald-700 font-bold flex items-center space-x-0.5">
                      <CheckCircle2 size={11} />
                      <span>Đã bình chọn</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

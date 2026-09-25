import React, { useState } from 'react';
import { BarChart3, Plus, CheckCircle2, Vote, X } from 'lucide-react';
import { PollData, PollOption } from '@meetdraw/shared';

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
    <div className="bg-navy-900 border-l border-navy-800 flex flex-col w-72 sm:w-80 h-full z-20 select-none">
      {/* Header */}
      <div className="h-12 border-b border-navy-800 px-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 size={16} className="text-indigo-glow" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Khảo sát ({polls.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-navy-800 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Create Poll Button */}
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full bg-navy-850 hover:bg-navy-800 border border-navy-700 text-indigo-light text-xs font-semibold py-2 rounded-xl flex items-center justify-center space-x-1.5 transition"
          >
            <Plus size={14} />
            <span>Tạo cuộc bình chọn</span>
          </button>
        )}

        {/* Create Poll Form */}
        {isCreating && (
          <form onSubmit={handleCreate} className="bg-navy-950 p-3.5 rounded-xl border border-navy-700 space-y-2.5">
            <div className="text-xs font-bold text-white">Tạo bình chọn mới</div>
            <div>
              <input
                type="text"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Câu hỏi bình chọn..."
                className="w-full bg-navy-900 border border-navy-700 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-light"
              />
            </div>
            <div className="space-y-1.5">
              <input
                type="text"
                required
                value={option1}
                onChange={(e) => setOption1(e.target.value)}
                placeholder="Lựa chọn 1"
                className="w-full bg-navy-900 border border-navy-700 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-light"
              />
              <input
                type="text"
                required
                value={option2}
                onChange={(e) => setOption2(e.target.value)}
                placeholder="Lựa chọn 2"
                className="w-full bg-navy-900 border border-navy-700 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-light"
              />
              <input
                type="text"
                value={option3}
                onChange={(e) => setOption3(e.target.value)}
                placeholder="Lựa chọn 3 (không bắt buộc)"
                className="w-full bg-navy-900 border border-navy-700 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-light"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="bg-indigo-accent hover:bg-indigo-light text-white text-[11px] font-semibold px-3 py-1 rounded-lg transition"
              >
                Bắt đầu bình chọn
              </button>
            </div>
          </form>
        )}

        {/* Poll List */}
        {polls.length === 0 && !isCreating ? (
          <div className="text-center py-10 px-2 text-xs text-slate-500">
            <Vote size={28} className="mx-auto mb-2 opacity-40 text-indigo-glow" />
            <p>Chưa có cuộc bình chọn nào.</p>
            <p className="mt-1 text-[11px]">Tạo bình chọn để lấy ý kiến tức thì trong phòng họp.</p>
          </div>
        ) : (
          polls.map((poll) => {
            const hasVoted = poll.votedUserIds?.includes(currentUserId);
            return (
              <div
                key={poll.id}
                className="glass-card p-3.5 rounded-xl border border-navy-800 space-y-2.5"
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-white leading-snug">{poll.question}</h4>
                  <span className="text-[10px] bg-indigo-accent/20 text-indigo-glow px-1.5 py-0.5 rounded font-mono">
                    {poll.totalVotes} lượt bình chọn
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
                            ? 'bg-navy-950/80 border-navy-800 cursor-default'
                            : 'bg-navy-950 border-navy-800 hover:border-indigo-light cursor-pointer'
                        }`}
                      >
                        {/* Background Percentage Bar */}
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-indigo-accent/25 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />

                        <div className="relative z-10 flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-200">{opt.text}</span>
                          <span className="text-[11px] font-bold text-indigo-glow">{percentage}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Tạo bởi {poll.creatorName}</span>
                  {hasVoted && (
                    <span className="text-emerald-active font-semibold flex items-center space-x-0.5">
                      <CheckCircle2 size={10} />
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

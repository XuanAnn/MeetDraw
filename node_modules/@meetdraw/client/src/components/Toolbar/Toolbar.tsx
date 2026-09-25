import React, { useState } from 'react';
import {
  MousePointer,
  Hand,
  Pen,
  Highlighter,
  Minus,
  Square,
  Circle as CircleIcon,
  Type,
  StickyNote,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ToolType } from '@meetdraw/shared';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearCanvas: () => void;
  deleteSelected: () => void;
  zoomLevel?: number;
  zoomIn?: () => void;
  zoomOut?: () => void;
  resetZoom?: () => void;
}

const PRESET_COLORS = [
  '#0f172a', // dark ink / slate-900
  '#dc2626', // red
  '#ea580c', // orange
  '#16a34a', // green
  '#0284c7', // sky
  '#4f46e5', // indigo
  '#9333ea', // purple
  '#64748b', // slate
];

const STROKE_WIDTHS = [2, 4, 8, 14];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  fillColor,
  setFillColor,
  undo,
  redo,
  canUndo,
  canRedo,
  clearCanvas,
  deleteSelected,
  zoomLevel = 100,
  zoomIn,
  zoomOut,
  resetZoom,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const tools: { id: ToolType; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Chọn & Di chuyển (V)', icon: <MousePointer size={17} /> },
    { id: 'pan', label: 'Di chuyển bảng (H)', icon: <Hand size={17} /> },
    { id: 'pen', label: 'Bút vẽ (P)', icon: <Pen size={17} /> },
    { id: 'highlighter', label: 'Bút dạ quang', icon: <Highlighter size={17} /> },
    { id: 'sticky', label: 'Ghi chú dán', icon: <StickyNote size={17} /> },
    { id: 'rect', label: 'Hình chữ nhật (R)', icon: <Square size={17} /> },
    { id: 'circle', label: 'Hình tròn (O)', icon: <CircleIcon size={17} /> },
    { id: 'line', label: 'Đường thẳng (L)', icon: <Minus size={17} /> },
    { id: 'text', label: 'Văn bản (T)', icon: <Type size={17} /> },
    { id: 'eraser', label: 'Tẩy xóa', icon: <Eraser size={17} /> },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center bg-white/95 backdrop-blur-xl border border-slate-200/90 p-1.5 rounded-2xl shadow-xl shadow-slate-200/50 space-x-1.5 max-w-[95vw] overflow-x-auto select-none">
      {/* Drawing Tools */}
      <div className="flex items-center space-x-1 pr-2 border-r border-slate-200">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`p-2 rounded-xl transition flex items-center justify-center relative group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
              }`}
              title={tool.label}
            >
              {tool.icon}
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-[11px] text-white font-medium px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow-md z-30">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Color & Stroke Options */}
      <div className="flex items-center space-x-1.5 px-2 border-r border-slate-200 relative">
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-7 h-7 rounded-xl border-2 border-slate-300 flex items-center justify-center transition hover:scale-105 shadow-sm"
            style={{ backgroundColor: strokeColor }}
            title="Chọn màu sắc"
          />

          {showColorPicker && (
            <div className="absolute top-10 left-0 bg-white border border-slate-200 p-3 rounded-2xl shadow-2xl flex flex-col space-y-2.5 z-30 w-44">
              <div className="text-[11px] font-bold text-slate-700">Màu nét vẽ</div>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setStrokeColor(c);
                      setShowColorPicker(false);
                    }}
                    className={`w-7 h-7 rounded-lg transition hover:scale-110 border border-slate-200 ${
                      strokeColor === c ? 'ring-2 ring-indigo-600 ring-offset-1' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="text-[11px] font-bold text-slate-700 pt-1 border-t border-slate-100">Đổ màu</div>
              <div className="flex space-x-1.5">
                <button
                  onClick={() => setFillColor('transparent')}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg flex-1 transition border ${
                    fillColor === 'transparent' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  Không
                </button>
                <button
                  onClick={() => setFillColor(strokeColor + '25')}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg flex-1 transition border ${
                    fillColor !== 'transparent' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  Mờ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stroke Width Selector */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width}
              onClick={() => setStrokeWidth(width)}
              className={`w-5 h-5 flex items-center justify-center rounded-lg transition ${
                strokeWidth === width ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: `${Math.min(width * 1.3, 10)}px`, height: `${Math.min(width * 1.3, 10)}px` }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* History (Undo / Redo / Delete / Clear) */}
      <div className="flex items-center space-x-1 pr-2 border-r border-slate-200">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition"
          title="Hoàn tác (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition"
          title="Làm lại (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>
        <button
          onClick={deleteSelected}
          className="p-1.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition"
          title="Xóa đối tượng đã chọn"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={clearCanvas}
          className="text-[11px] px-2 py-1 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition font-medium"
          title="Xóa toàn bộ bản vẽ"
        >
          Xóa hết
        </button>
      </div>

      {/* Zoom Controls */}
      {zoomIn && zoomOut && (
        <div className="flex items-center space-x-1 pl-1">
          <button
            onClick={zoomOut}
            className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Thu nhỏ"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={resetZoom}
            className="text-[11px] font-mono font-bold text-slate-700 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
            title="Đặt lại mức thu phóng (100%)"
          >
            {zoomLevel}%
          </button>
          <button
            onClick={zoomIn}
            className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Phóng to"
          >
            <ZoomIn size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

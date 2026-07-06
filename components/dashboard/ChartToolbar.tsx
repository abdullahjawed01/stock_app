'use client';

import React from 'react';
import {
  MousePointer, LineChart, Type, Ruler, Lock, Eye, EyeOff,
  Trash2, Magnet, Square, Circle, Pencil, ArrowRight, Layers, Award,
  ChevronRight, Unlock
} from 'lucide-react';

interface ChartToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  isHidden: boolean;
  setIsHidden: (hidden: boolean) => void;
  isMagnet: boolean;
  setIsMagnet: (magnet: boolean) => void;
  onClearDrawings: () => void;
}

export default function ChartToolbar({
  activeTool,
  setActiveTool,
  isLocked,
  setIsLocked,
  isHidden,
  setIsHidden,
  isMagnet,
  setIsMagnet,
  onClearDrawings,
}: ChartToolbarProps) {
  const tools = [
    { id: 'cursor', icon: MousePointer, label: 'Crosshair' },
    { id: 'trendline', icon: LineChart, label: 'Trend Line' },
    { id: 'ray', icon: ChevronRight, label: 'Ray Line' },
    { id: 'horizontal', icon: ChevronRight, label: 'Horizontal Line', rotate: 90 },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'brush', icon: Pencil, label: 'Brush' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow Note' },
    { id: 'fib', icon: Layers, label: 'Fib Retracement' },
    { id: 'ruler', icon: Ruler, label: 'Measure Tool' },
    { id: 'riskreward', icon: Award, label: 'Risk/Reward Tool' },
  ];

  return (
    <div className="absolute left-3 top-20 pointer-events-auto flex flex-col gap-1.5 p-1.5 bg-[#161B22]/90 border border-[#21262d] rounded-xl shadow-2xl backdrop-blur-xl z-20 transition-all select-none animate-in fade-in duration-200">
      {/* Drawing tools list */}
      <div className="flex flex-col gap-1">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer transition-all relative group ${
                isActive
                  ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                  : 'text-gray-500 hover:text-white hover:bg-[#1c2128]'
              }`}
              title={t.label}
            >
              <Icon
                className="h-4 w-4"
                style={t.rotate ? { transform: `rotate(${t.rotate}deg)` } : undefined}
              />
              {/* Tooltip */}
              <div className="absolute left-[38px] top-0.5 hidden group-hover:block bg-[#0d0f14] text-gray-300 text-[9px] font-bold px-2 py-1 rounded border border-[#2a2e39] z-50 whitespace-nowrap shadow-xl">
                {t.label}
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-[1px] bg-[#21262d] mx-1" />

      {/* States: Magnet, Lock, Hide, Trash */}
      <div className="flex flex-col gap-1">
        {/* Magnet toggle */}
        <button
          onClick={() => setIsMagnet(!isMagnet)}
          className={`h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer transition-all relative group ${
            isMagnet
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
              : 'text-gray-500 hover:text-white hover:bg-[#1c2128]'
          }`}
          title="Magnet Mode"
        >
          <Magnet className="h-4 w-4" />
          <div className="absolute left-[38px] top-0.5 hidden group-hover:block bg-[#0d0f14] text-gray-300 text-[9px] font-bold px-2 py-1 rounded border border-[#2a2e39] z-50 whitespace-nowrap shadow-xl">
            Magnet Mode
          </div>
        </button>

        {/* Lock/Unlock Toggle */}
        <button
          onClick={() => setIsLocked(!isLocked)}
          className={`h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer transition-all relative group ${
            isLocked
              ? 'bg-red-500/15 text-red-400 border border-red-500/25'
              : 'text-gray-500 hover:text-white hover:bg-[#1c2128]'
          }`}
          title={isLocked ? 'Unlock Drawings' : 'Lock Drawings'}
        >
          {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          <div className="absolute left-[38px] top-0.5 hidden group-hover:block bg-[#0d0f14] text-gray-300 text-[9px] font-bold px-2 py-1 rounded border border-[#2a2e39] z-50 whitespace-nowrap shadow-xl">
            {isLocked ? 'Unlock Drawings' : 'Lock Drawings'}
          </div>
        </button>

        {/* Visibility Toggle */}
        <button
          onClick={() => setIsHidden(!isHidden)}
          className={`h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer transition-all relative group ${
            isHidden
              ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25'
              : 'text-gray-500 hover:text-white hover:bg-[#1c2128]'
          }`}
          title={isHidden ? 'Show Drawings' : 'Hide Drawings'}
        >
          {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <div className="absolute left-[38px] top-0.5 hidden group-hover:block bg-[#0d0f14] text-gray-300 text-[9px] font-bold px-2 py-1 rounded border border-[#2a2e39] z-50 whitespace-nowrap shadow-xl">
            {isHidden ? 'Show Drawings' : 'Hide Drawings'}
          </div>
        </button>

        {/* Trash/Clear Drawings */}
        <button
          onClick={onClearDrawings}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-[#1c2128] cursor-pointer transition-all relative group"
          title="Delete All Drawings"
        >
          <Trash2 className="h-4 w-4" />
          <div className="absolute left-[38px] top-0.5 hidden group-hover:block bg-[#0d0f14] text-gray-300 text-[9px] font-bold px-2 py-1 rounded border border-[#2a2e39] z-50 whitespace-nowrap shadow-xl">
            Delete All Drawings
          </div>
        </button>
      </div>
    </div>
  );
}

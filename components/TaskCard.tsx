
import React, { useState, useEffect, useRef } from 'react';
import { TaskItem } from '../types';
import { DurationSlider } from './DurationSlider';

interface TaskCardProps {
  task: TaskItem;
  onUpdate: (updates: Partial<TaskItem>) => void;
  onDelete: () => void;
  onBreakdown?: () => void;
  autoFocus?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onDelete, onBreakdown, autoFocus }) => {
  const [isExpanded, setIsExpanded] = useState(autoFocus || false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && autoFocus && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isExpanded, autoFocus]);

  return (
    <div 
      className={`group bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${
        isExpanded ? 'ring-2 ring-orange-500 border-transparent shadow-xl mb-4 mt-2' : 'border-slate-100 hover:border-slate-200'
      }`}
    >
      <div 
        className="p-4 flex items-center gap-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Circle/Checkbox container - Stop expansion on click */}
        <div 
          className="relative flex items-center justify-center shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <input 
            type="checkbox" 
            checked={task.completed}
            onChange={(e) => {
              onUpdate({ completed: e.target.checked });
            }}
            className="peer w-6 h-6 appearance-none rounded-xl border-2 border-slate-100 checked:bg-orange-500 checked:border-orange-500 cursor-pointer transition-all"
          />
          <svg className="absolute w-3 h-3 text-white hidden peer-checked:block pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        
        <div className="flex-1 min-w-0">
          {!isExpanded ? (
            <div className="flex items-center gap-2">
              {task.startTime && (
                <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded shrink-0">{task.startTime}</span>
              )}
              <p className={`text-sm font-bold truncate transition-all ${task.completed ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                {task.title}
              </p>
            </div>
          ) : (
            <div className="h-5" /> 
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
              {Math.floor(task.durationMinutes / 60)}h {task.durationMinutes % 60}m
            </span>
            {task.isAIGenerated && (
              <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">AI Scheduled</span>
            )}
          </div>
        </div>

        <button className="p-2 text-slate-200 group-hover:text-slate-400 transition-colors shrink-0">
          <svg 
            className={`h-4 w-4 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-orange-500' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="px-5 pb-6 pt-0 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Task Title</label>
            <input 
              ref={titleInputRef}
              type="text"
              value={task.title}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</label>
              <input 
                type="date"
                value={task.date}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdate({ date: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start Time</label>
              <input 
                type="time"
                value={task.startTime || ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdate({ startTime: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
          </div>

          <DurationSlider 
            value={task.durationMinutes} 
            onChange={(val) => onUpdate({ durationMinutes: val })} 
          />
          
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex-1 bg-red-50 text-red-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

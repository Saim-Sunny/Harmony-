
import React from 'react';

interface DurationSliderProps {
  value: number; // minutes
  onChange: (value: number) => void;
}

export const DurationSlider: React.FC<DurationSliderProps> = ({ value, onChange }) => {
  const hours = Math.floor(value / 60);
  const mins = value % 60;

  return (
    <div className="space-y-4 px-1">
      <div className="flex justify-between items-end">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Time Budget</label>
          <div className="text-3xl font-black text-slate-900 tracking-tighter">
            {hours}<span className="text-sm text-slate-400 font-bold ml-1">h</span> {mins}<span className="text-sm text-slate-400 font-bold ml-1">m</span>
          </div>
        </div>
      </div>
      <div className="relative group">
        <input 
          type="range" 
          min="15" 
          max="480" 
          step="15" 
          value={value} 
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-orange-500 transition-all"
        />
        <div className="flex justify-between mt-2">
           <span className="text-[8px] font-black text-slate-200">15M</span>
           <span className="text-[8px] font-black text-slate-200">4H</span>
           <span className="text-[8px] font-black text-slate-200">8H</span>
        </div>
      </div>
    </div>
  );
};

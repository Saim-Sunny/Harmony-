
import React from 'react';
import { DayPlan } from '../types';

interface CalendarViewProps {
  schedule: DayPlan[];
  onSelectDay: (index: number) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ schedule, onSelectDay }) => {
  const today = new Date();
  const month = today.toLocaleString('default', { month: 'long' });
  const year = today.getFullYear();

  // Create simple grid for the month
  const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, today.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getDayPlan = (dayNum: number) => {
    return schedule.find(s => {
      const d = new Date(s.date);
      return d.getDate() === dayNum && d.getMonth() === today.getMonth();
    });
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-slate-800">{month} {year}</h3>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            Tasks Scheduled
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="bg-slate-50 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {d}
          </div>
        ))}
        
        {blanks.map(i => <div key={`b-${i}`} className="bg-white h-24 sm:h-32"></div>)}
        
        {days.map(d => {
          const plan = getDayPlan(d);
          const isToday = d === today.getDate();
          
          return (
            <div 
              key={d} 
              onClick={() => plan && onSelectDay(schedule.indexOf(plan))}
              className={`bg-white h-24 sm:h-32 p-2 transition-all group ${plan ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'
                }`}>
                  {d}
                </span>
                {plan && (
                  <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded">
                    {plan.workloads.reduce((acc, curr) => acc + curr.tasks.length, 0)}
                  </span>
                )}
              </div>
              
              <div className="mt-2 space-y-1">
                {plan?.workloads.map((w, i) => (
                  <div key={i} className="text-[9px] font-bold text-slate-500 truncate bg-slate-50 px-1 rounded">
                    {w.projectTitle}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

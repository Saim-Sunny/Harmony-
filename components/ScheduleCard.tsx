
import React, { useState } from 'react';
// Added Workload to imports
import { DayPlan, TaskItem, TaskCategory, Workload } from '../types';

interface ScheduleCardProps {
  day: DayPlan;
  isFocused: boolean;
  onUpdateTasks: (dayId: string, projectTitle: string, tasks: TaskItem[]) => void;
  onDragStart: (taskId: string, sourceDayId: string, sourceProject: string) => void;
  onDropTask: (targetDayId: string) => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({ day, isFocused, onUpdateTasks, onDragStart, onDropTask }) => {
  const formattedDate = new Date(day.date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  const [isOver, setIsOver] = useState(false);

  return (
    <div 
      className={`w-full transition-all duration-300 ${isFocused ? 'opacity-100' : 'opacity-0 scale-95 pointer-events-none absolute'}`}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDropTask(day.id); }}
    >
      <div className={`bg-white rounded-xl border transition-all ${isOver ? 'border-orange-500 ring-4 ring-orange-50' : 'border-slate-100'}`}>
        <div className="border-b border-slate-50 px-6 py-4 flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest">{day.label}</h4>
          <p className="text-[10px] font-bold text-slate-400">{formattedDate}</p>
        </div>
        
        <div className="p-4 space-y-8">
          {day.workloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2 opacity-30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[10px] font-black uppercase tracking-widest">No Tasks Planned</p>
            </div>
          ) : (
            day.workloads.map((workload, idx) => (
              <ProjectSection 
                key={idx} 
                workload={workload} 
                date={day.date} // Passed date to ensure newly created tasks have the correct date property
                onUpdate={(newTasks) => onUpdateTasks(day.id, workload.projectTitle, newTasks)}
                onDragStart={(taskId) => onDragStart(taskId, day.id, workload.projectTitle)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const CATEGORY_STYLES: Record<TaskCategory, string> = {
  Work: 'text-orange-500',
  School: 'text-blue-500',
  Personal: 'text-emerald-500',
  Other: 'text-slate-400'
};

// Updated ProjectSection props to include date and correct workload type
const ProjectSection: React.FC<{ 
  workload: Workload, 
  date: string,
  onUpdate: (tasks: TaskItem[]) => void,
  onDragStart: (taskId: string) => void
}> = ({ workload, date, onUpdate, onDragStart }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const toggleTask = (taskId: string) => {
    onUpdate(workload.tasks.map((t: TaskItem) => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const updateTaskField = (taskId: string, field: keyof TaskItem, value: any) => {
    onUpdate(workload.tasks.map((t: TaskItem) => t.id === taskId ? { ...t, [field]: value } : t));
  };

  const deleteTask = (taskId: string) => {
    onUpdate(workload.tasks.filter((t: TaskItem) => t.id !== taskId));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    // Fixed TaskItem property name from duration to durationMinutes and added missing date property
    const newTask: TaskItem = { 
      id: crypto.randomUUID(), 
      title: newTaskTitle, 
      completed: false, 
      durationMinutes: 60, 
      category: 'Work',
      date
    };
    onUpdate([...workload.tasks, newTask]);
    setNewTaskTitle('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-3 bg-orange-500 rounded-full"></div>
        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{workload.projectTitle}</h5>
      </div>

      <div className="space-y-1">
        {workload.tasks.map((task: TaskItem) => (
          <div 
            key={task.id} 
            draggable 
            onDragStart={() => onDragStart(task.id)}
            className="flex items-center gap-3 group p-2 rounded-lg hover:bg-slate-50 transition-all cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-100"
          >
            <div className="relative flex items-center justify-center shrink-0">
              <input 
                type="checkbox" 
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
                className="peer appearance-none w-4 h-4 rounded border border-slate-300 checked:bg-orange-500 checked:border-orange-500 cursor-pointer transition-all"
              />
              <svg className="absolute w-2.5 h-2.5 text-white hidden peer-checked:block pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-4">
              <input 
                className={`flex-1 text-xs font-medium bg-transparent outline-none truncate ${task.completed ? 'text-slate-300 line-through' : 'text-slate-700'}`}
                value={task.title}
                onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
              />
              
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 group/dur">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-300 group-hover/dur:text-orange-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {/* Fixed property name from duration to durationMinutes and implemented number parsing for the input value */}
                  <input 
                    className="w-10 text-[10px] font-bold text-slate-400 bg-transparent outline-none hover:text-orange-600 transition-colors"
                    value={task.durationMinutes}
                    onChange={(e) => updateTaskField(task.id, 'durationMinutes', parseInt(e.target.value) || 0)}
                  />
                </div>

                <select 
                  className={`text-[9px] font-black uppercase tracking-widest bg-transparent outline-none cursor-pointer border-none appearance-none hover:scale-110 transition-transform ${CATEGORY_STYLES[task.category]}`}
                  value={task.category}
                  onChange={(e) => updateTaskField(task.id, 'category', e.target.value as TaskCategory)}
                >
                  <option value="Work">W</option>
                  <option value="School">S</option>
                  <option value="Personal">P</option>
                  <option value="Other">O</option>
                </select>

                <button 
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addTask} className="ml-7 pt-1">
        <input 
          type="text"
          placeholder="Quick add..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="w-full bg-transparent border-none py-1 text-[11px] font-medium text-slate-400 focus:text-orange-500 outline-none placeholder:text-slate-200"
        />
      </form>
    </div>
  );
};

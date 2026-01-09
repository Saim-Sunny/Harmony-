
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TaskItem, RoutineItem, ChatMessage, AppView, OffTime, OffTimeType } from './types';
import { ProjectInput } from './components/ProjectInput';
import { TaskCard } from './components/TaskCard';
import { DurationSlider } from './components/DurationSlider';
import { breakdownProject, chatWithAssistant, generateRoutine } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [routine, setRoutine] = useState<RoutineItem[]>([]);
  const [offTimes, setOffTimes] = useState<OffTime[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [projectLoadingIds, setProjectLoadingIds] = useState<Set<string>>(new Set());
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const [focusedDate, setFocusedDate] = useState(todayStr);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [routinePrompt, setRoutinePrompt] = useState('');

  const [newTaskDraft, setNewTaskDraft] = useState<Partial<TaskItem>>({
    title: '',
    date: todayStr,
    durationMinutes: 30,
    category: 'Personal'
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleTaskUpdate = (id: string, updates: Partial<TaskItem>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleTaskDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleProjectDelete = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    // CASCADING DELETE: Automatically removes all related tasks
    setTasks(prev => prev.filter(t => t.projectRef !== projectId));
  };

  const saveNewTask = (taskData: Partial<TaskItem>) => {
    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      title: taskData.title || 'New Activity',
      completed: false,
      durationMinutes: taskData.durationMinutes || 30,
      category: (taskData.category as any) || 'Personal',
      date: taskData.date || todayStr,
      startTime: taskData.startTime
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await chatWithAssistant(currentInput, chatHistory, { tasks, routine, projects });
      
      if (response.functionCalls) {
        for (const fc of response.functionCalls) {
          if (fc.name === 'addTask') {
            const args = fc.args as any;
            saveNewTask({
              title: args.title,
              date: args.date,
              durationMinutes: args.durationMinutes,
              startTime: args.startTime,
              category: args.category
            });
            setChatHistory(prev => [...prev, { 
              role: 'model', 
              text: `- Added task: ${args.title}`, 
              timestamp: Date.now() 
            }]);
          }
        }
      } else if (response.text) {
        setChatHistory(prev => [...prev, { role: 'model', text: response.text, timestamp: Date.now() }]);
      }
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'model', text: "Error in chat logic.", timestamp: Date.now() }]);
    }
    setIsTyping(false);
  };

  const runProjectBreakdown = async (p: Project) => {
    setProjectLoadingIds(prev => new Set(prev).add(p.id));
    try {
      const subTasks = await breakdownProject(p, p.startDate, p.deadline, routine, offTimes);
      setTasks(prev => [...prev, ...subTasks.map(st => ({ 
        ...st, 
        id: crypto.randomUUID(), 
        completed: false, 
        projectRef: p.id, 
        isAIGenerated: true 
      } as TaskItem))]);
      setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, isBrokenDown: true } : proj));
    } catch (e) {
      console.error(e);
    }
    setProjectLoadingIds(prev => {
      const next = new Set(prev);
      next.delete(p.id);
      return next;
    });
  };

  const handleBreakdownAll = async () => {
    const unassigned = projects.filter(p => !p.isBrokenDown);
    if (unassigned.length === 0) return;
    for (const p of unassigned) {
      await runProjectBreakdown(p);
    }
    setView('focus');
  };

  const handleAIRoutine = async () => {
    if (!routinePrompt.trim()) return;
    setLoading(true);
    try {
      const aiRoutine = await generateRoutine(routinePrompt);
      setRoutine(aiRoutine.map(r => ({ ...r, id: crypto.randomUUID() } as RoutineItem)));
      setRoutinePrompt('');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const dashboardTasks = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return tasks.filter(t => t.date === todayStr || t.date === tomorrowStr)
               .sort((a,b) => {
                 if (a.date !== b.date) return a.date.localeCompare(b.date);
                 return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
               });
  }, [tasks, todayStr]);

  const nextTask = useMemo(() => {
    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 5);
    return tasks
      .filter(t => t.date === todayStr && !t.completed && t.startTime && t.startTime > currentTimeStr)
      .sort((a,b) => (a.startTime!).localeCompare(b.startTime!))[0];
  }, [tasks, todayStr]);

  const focusedDayTasks = useMemo(() => {
    return tasks.filter(t => t.date === focusedDate)
               .sort((a,b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
  }, [tasks, focusedDate]);

  const toggleRoutineDay = (routineId: string, day: number) => {
    setRoutine(prev => prev.map(r => {
      if (r.id !== routineId) return r;
      const newDays = r.days.includes(day) 
        ? r.days.filter(d => d !== day)
        : [...r.days, day].sort();
      return { ...r, days: newDays };
    }));
  };

  const addOffTime = (type: OffTimeType) => {
    const label = type === 'weekend' ? 'Weekend Off' : type === 'single' ? 'Day Off' : 'Vacation';
    setOffTimes([...offTimes, { id: crypto.randomUUID(), label, type, startDate: todayStr, endDate: todayStr }]);
  };

  const updateOffTime = (id: string, updates: Partial<OffTime>) => {
    setOffTimes(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="min-h-screen bg-slate-50 font-inter selection:bg-orange-500 selection:text-white">
      <header className="fixed top-0 w-full bg-slate-950 text-white z-50 h-16 px-6 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
            <div className="w-3 h-0.5 bg-white rounded-full"></div>
          </div>
          <span className="text-sm font-black uppercase tracking-tighter">Harmony</span>
        </div>
        
        <nav className="flex items-center bg-slate-900 rounded-full p-1 border border-slate-800">
          {(['dashboard', 'focus', 'projects', 'routine'] as AppView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                view === v ? 'text-white bg-orange-500 shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {v}
            </button>
          ))}
        </nav>

        <button onClick={() => setIsChatOpen(!isChatOpen)} className="p-2 text-slate-400 hover:text-orange-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        </button>
      </header>

      <main className="max-w-4xl mx-auto pt-24 pb-32 px-6">
        {view === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Home</h2>
                <p className="text-slate-400 font-medium">Focusing on what's next.</p>
              </div>
              <button 
                onClick={() => setIsTaskModalOpen(true)}
                className="w-14 h-14 bg-orange-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-orange-100 hover:scale-110 transition-transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950 p-6 rounded-[2.5rem] text-white shadow-2xl flex flex-col justify-center gap-2">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Immediate Priority</h3>
                {nextTask ? (
                  <div className="space-y-1">
                    <div className="text-3xl font-black truncate">{nextTask.title}</div>
                    <div className="flex items-center gap-2">
                       <span className="text-orange-500 text-xl font-bold uppercase tracking-widest">{nextTask.startTime}</span>
                       <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black">TODAY</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-3xl font-black text-slate-700 italic">No Priority Items</div>
                )}
              </div>
              
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                <h3 className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-2">Today's Volume</h3>
                <div className="text-4xl font-black text-slate-900">{tasks.filter(t => t.date === todayStr).length} <span className="text-sm text-slate-400 font-bold uppercase ml-1">Items</span></div>
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <h3 className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Upcoming Activities</h3>
                 <button onClick={() => setView('focus')} className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Full View</button>
               </div>
               <div className="space-y-2">
                 {dashboardTasks.map(t => (
                   <TaskCard key={t.id} task={t} onUpdate={(upd) => handleTaskUpdate(t.id, upd)} onDelete={() => handleTaskDelete(t.id)} />
                 ))}
                 {dashboardTasks.length === 0 && (
                   <div className="text-center py-10 text-slate-300 font-bold uppercase tracking-widest text-[10px] bg-white rounded-3xl border border-dashed border-slate-200">All caught up</div>
                 )}
               </div>
            </div>
          </div>
        )}

        {view === 'focus' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="sticky top-16 bg-slate-50/90 backdrop-blur-xl z-40 py-4 -mx-6 px-6 border-b border-slate-100 flex items-center gap-3 overflow-x-auto no-scrollbar">
              {[...Array(15)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + (i - 1));
                const dateStr = d.toISOString().split('T')[0];
                const isActive = dateStr === focusedDate;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setFocusedDate(dateStr)}
                    className={`flex flex-col items-center min-w-[54px] py-4 rounded-2xl transition-all duration-300 ${
                      isActive ? 'bg-orange-500 text-white shadow-xl scale-110' : 'bg-white text-slate-400 hover:border-orange-200 border border-transparent'
                    }`}
                  >
                    <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                    <span className="text-lg font-black">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 pb-20">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-orange-500 pl-3">
                {new Date(focusedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div className="space-y-2">
                {focusedDayTasks.map(t => (
                  <TaskCard key={t.id} task={t} onUpdate={(upd) => handleTaskUpdate(t.id, upd)} onDelete={() => handleTaskDelete(t.id)} />
                ))}
                {focusedDayTasks.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                    <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest">Nothing for this day</p>
                    <button onClick={() => { setNewTaskDraft({...newTaskDraft, date: focusedDate}); setIsTaskModalOpen(true); }} className="mt-4 text-orange-500 font-black uppercase text-[10px] hover:underline">+ Add Task</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'projects' && (
          <div className="max-w-md mx-auto space-y-12 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Projects</h2>
              <button 
                onClick={handleBreakdownAll}
                className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline"
              >
                Breakdown All
              </button>
            </div>
            
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <ProjectInput onAdd={(p) => setProjects([...projects, p])} />
            </div>
            
            <div className="space-y-4">
               {projects.map(p => {
                 const isLocallyLoading = projectLoadingIds.has(p.id);
                 return (
                   <div key={p.id} className="relative bg-white p-6 rounded-[2rem] border border-slate-100 space-y-4 hover:shadow-lg transition-all group">
                      {isLocallyLoading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
                           <div className="flex gap-1.5 items-center">
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                           </div>
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 text-lg">{p.title}</h4>
                          <p className="text-[9px] font-black text-slate-300 uppercase mt-1 tracking-tight">{p.startDate} — {p.deadline}</p>
                        </div>
                        <button 
                          onClick={() => handleProjectDelete(p.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-200 hover:text-red-500 transition-all"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>
                        </button>
                      </div>
                      {!p.isBrokenDown && (
                        <button 
                          onClick={() => runProjectBreakdown(p)}
                          className="w-full bg-slate-950 text-white text-[10px] font-black py-4 rounded-xl uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-slate-100"
                        >
                          AI Project Breakdown
                        </button>
                      )}
                      {p.isBrokenDown && (
                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 bg-emerald-50 py-2 px-3 rounded-xl">
                          Scheduled
                        </div>
                      )}
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {view === 'routine' && (
          <div className="max-w-md mx-auto space-y-10 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Plan Settings</h2>

            <div className="bg-orange-50 p-8 rounded-[3rem] space-y-4 border border-orange-100 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Routine Wizard</h3>
              <textarea 
                value={routinePrompt}
                onChange={(e) => setRoutinePrompt(e.target.value)}
                placeholder="Ex: I wake up at 7am every day. I have class Mon/Wed/Fri from 9am to 1pm. Gym Tue/Thu at 5pm."
                className="w-full bg-white rounded-2xl p-4 text-sm font-medium border-none focus:ring-2 focus:ring-orange-500 h-28 resize-none shadow-inner"
              />
              <button 
                onClick={handleAIRoutine}
                className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest"
              >
                Generate Structure
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Active Routine Blocks</h3>
              {routine.map(r => (
                <div key={r.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
                  <div className="flex justify-between items-center">
                    <input 
                      value={r.label}
                      onChange={(e) => setRoutine(routine.map(x => x.id === r.id ? {...x, label: e.target.value} : x))}
                      className="font-bold text-slate-900 text-lg bg-transparent border-none outline-none focus:text-orange-500 w-2/3"
                    />
                    <button onClick={() => setRoutine(routine.filter(x => x.id !== r.id))} className="text-slate-200 hover:text-red-500 p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" /></svg>
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <input type="time" value={r.startTime} onChange={(e) => setRoutine(routine.map(x => x.id === r.id ? {...x, startTime: e.target.value} : x))} className="flex-1 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none" />
                    <input type="time" value={r.endTime} onChange={(e) => setRoutine(routine.map(x => x.id === r.id ? {...x, endTime: e.target.value} : x))} className="flex-1 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none" />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    {DAYS.map((dayLabel, i) => {
                      const isActive = r.days.includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleRoutineDay(r.id, i)}
                          className={`w-8 h-8 rounded-full text-[10px] font-black transition-all ${isActive ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                        >
                          {dayLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-6 pt-10 border-t border-slate-100">
               <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Time Off & Breaks</h3>
               </div>
               
               <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => addOffTime('weekend')} className="py-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center gap-1 shadow-sm hover:border-orange-200 transition-all">
                    <span className="text-[8px] font-black uppercase text-slate-400">Weekend</span>
                    <span className="text-xs font-black text-slate-900">+ Add</span>
                  </button>
                  <button onClick={() => addOffTime('single')} className="py-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center gap-1 shadow-sm hover:border-orange-200 transition-all">
                    <span className="text-[8px] font-black uppercase text-slate-400">One Day</span>
                    <span className="text-xs font-black text-slate-900">+ Add</span>
                  </button>
                  <button onClick={() => addOffTime('range')} className="py-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center gap-1 shadow-sm hover:border-orange-200 transition-all">
                    <span className="text-[8px] font-black uppercase text-slate-400">Vacation</span>
                    <span className="text-xs font-black text-slate-900">+ Add</span>
                  </button>
               </div>

               <div className="space-y-3">
                  {offTimes.map(v => (
                    <div key={v.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-4 shadow-sm group relative overflow-hidden">
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${v.type === 'weekend' ? 'bg-blue-400' : v.type === 'single' ? 'bg-emerald-400' : 'bg-orange-400'}`}></span>
                            <input 
                              value={v.label} 
                              onChange={(e) => updateOffTime(v.id, { label: e.target.value })}
                              className="font-bold text-slate-900 border-none outline-none focus:text-orange-500"
                            />
                          </div>
                          <button 
                            onClick={() => setOffTimes(offTimes.filter(x => x.id !== v.id))}
                            className="text-slate-300 hover:text-red-500 font-black uppercase text-[9px] tracking-widest px-3 py-1 bg-slate-50 rounded-lg"
                          >
                            Remove
                          </button>
                       </div>

                       {v.type !== 'weekend' && (
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[8px] font-black uppercase text-slate-300">Start</label>
                               <input type="date" value={v.startDate} onChange={(e) => updateOffTime(v.id, { startDate: e.target.value, endDate: v.type === 'single' ? e.target.value : v.endDate })} className="w-full bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold outline-none" />
                            </div>
                            {v.type === 'range' && (
                              <div className="space-y-1">
                                 <label className="text-[8px] font-black uppercase text-slate-300">End</label>
                                 <input type="date" value={v.endDate} onChange={(e) => updateOffTime(v.id, { endDate: e.target.value })} className="w-full bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold outline-none" />
                              </div>
                            )}
                         </div>
                       )}

                       {v.type === 'weekend' && (
                         <p className="text-[10px] font-bold text-slate-400 italic">Saturday and Sunday will be blocked for scheduling.</p>
                       )}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-12 shadow-2xl space-y-8">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Quick Add</h3>
            <div className="space-y-8">
              <input 
                type="text" 
                value={newTaskDraft.title}
                onChange={(e) => setNewTaskDraft({...newTaskDraft, title: e.target.value})}
                placeholder="What's the plan?"
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-900"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={newTaskDraft.date} onChange={(e) => setNewTaskDraft({...newTaskDraft, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold" />
                <input type="time" value={newTaskDraft.startTime || ''} onChange={(e) => setNewTaskDraft({...newTaskDraft, startTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold" />
              </div>
              <DurationSlider value={newTaskDraft.durationMinutes || 30} onChange={(val) => setNewTaskDraft({...newTaskDraft, durationMinutes: val})} />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsTaskModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl text-[11px] font-black uppercase">Close</button>
              <button onClick={() => { saveNewTask(newTaskDraft); setIsTaskModalOpen(false); }} className="flex-[2] py-4 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase">Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white/95 backdrop-blur-xl border-l border-slate-100 shadow-2xl z-[100] transition-transform duration-500 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col relative">
          <div className="p-8 bg-slate-950 text-white flex justify-between items-center rounded-bl-[3rem]">
            <h4 className="text-xs font-black uppercase tracking-widest">Assistant</h4>
            <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-slate-900 rounded-xl">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-3 text-xs leading-relaxed font-medium rounded-2xl ${msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-700'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-50 px-5 py-3 rounded-2xl flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-6 bg-white border-t">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              placeholder="Message..."
              className="w-full px-6 py-4 bg-slate-100 rounded-[2.5rem] text-sm font-bold outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;


import React, { useState } from 'react';
import { Project } from '../types';

interface ProjectInputProps {
  onAdd: (project: Project) => void;
}

export const ProjectInput: React.FC<ProjectInputProps> = ({ onAdd }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline || !startDate) return;

    onAdd({
      id: crypto.randomUUID(),
      title,
      startDate,
      deadline,
      description,
      isBrokenDown: false
    });

    setTitle('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Name</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Wedding Video Editing"
          className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-slate-800"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-slate-600"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deadline</label>
          <input
            type="date"
            value={deadline}
            min={startDate}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-slate-600"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are we trying to achieve?"
          className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 transition-all h-24 resize-none font-medium text-slate-600"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-slate-950 hover:bg-orange-600 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
      >
        Initialize Project
      </button>
    </form>
  );
};

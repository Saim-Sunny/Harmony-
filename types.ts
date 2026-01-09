
export type TaskCategory = 'Work' | 'School' | 'Personal' | 'Other';

export interface RoutineItem {
  id: string;
  label: string;
  startTime: string; // 24h format "08:30"
  endTime: string;
  days: number[]; // 0 for Sunday, 1 for Monday, etc.
}

export type OffTimeType = 'single' | 'range' | 'weekend';

export interface OffTime {
  id: string;
  label: string;
  type: OffTimeType;
  startDate: string;
  endDate: string;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  durationMinutes: number;
  category: TaskCategory;
  date: string; // ISO date string YYYY-MM-DD
  startTime?: string; // Optional specific time "14:00"
  projectRef?: string; // ID of the project it belongs to
  isAIGenerated?: boolean;
}

export interface Project {
  id: string;
  title: string;
  startDate: string;
  deadline: string;
  description: string;
  isBrokenDown: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type AppView = 'dashboard' | 'focus' | 'projects' | 'routine';

export interface Workload {
  projectTitle: string;
  tasks: TaskItem[];
}

export interface DayPlan {
  id: string;
  date: string;
  label: string;
  workloads: Workload[];
}

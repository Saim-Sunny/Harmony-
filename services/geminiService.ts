
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { Project, TaskItem, RoutineItem, ChatMessage, OffTime } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const addTaskTool: FunctionDeclaration = {
  name: 'addTask',
  parameters: {
    type: Type.OBJECT,
    description: 'Add a new task to the user schedule.',
    properties: {
      title: { type: Type.STRING, description: 'The title of the task.' },
      date: { type: Type.STRING, description: 'The date in YYYY-MM-DD format.' },
      durationMinutes: { type: Type.NUMBER, description: 'Duration in minutes.' },
      startTime: { type: Type.STRING, description: 'Optional start time in HH:MM format.' },
      category: { type: Type.STRING, enum: ['Work', 'School', 'Personal', 'Other'] }
    },
    required: ['title', 'date', 'durationMinutes']
  }
};

export const generateRoutine = async (lifestyleDescription: string): Promise<Partial<RoutineItem>[]> => {
  const systemInstruction = `
    You are a Routine Specialist. 
    Based on the user description, create a weekly routine.
    Use 24h time format (HH:MM).
    Days: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.
    Return ONLY a JSON array.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: lifestyleDescription,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            days: { type: Type.ARRAY, items: { type: Type.INTEGER } }
          },
          required: ["label", "startTime", "endTime", "days"]
        }
      }
    }
  });

  return response.text ? JSON.parse(response.text) : [];
};

export const breakdownProject = async (
  project: Project, 
  startDate: string, 
  endDate: string, 
  routine: RoutineItem[], 
  offTimes: OffTime[]
): Promise<Partial<TaskItem>[]> => {
  const systemInstruction = `
    You are a Task Breakdown Expert. 
    Break down "${project.title}" between ${startDate} and ${endDate}.
    Routine busy times: ${JSON.stringify(routine)}.
    User Off-Times (DO NOT schedule tasks during these): ${JSON.stringify(offTimes)}.
    Rules:
    - Return ONLY a JSON array of subtasks.
    - If weekends are off, avoid Saturday/Sunday.
    - Use simple English.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Breakdown project: ${project.title}. Duration: ${startDate} to ${endDate}.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            durationMinutes: { type: Type.NUMBER },
            date: { type: Type.STRING },
            category: { type: Type.STRING, enum: ["Work", "School", "Personal", "Other"] },
            startTime: { type: Type.STRING }
          },
          required: ["title", "durationMinutes", "date", "category"]
        }
      }
    }
  });

  return response.text ? JSON.parse(response.text) : [];
};

export const chatWithAssistant = async (
  message: string, 
  history: ChatMessage[], 
  context: { tasks: TaskItem[], routine: RoutineItem[], projects: Project[] }
): Promise<GenerateContentResponse> => {
  const systemInstruction = `
    You are Harmony Assistant. 
    Use SIMPLE ENGLISH only. No fancy words.
    Use dashes (-) for lists. 
    DO NOT use markdown stars (*) or bold.
    You can add tasks using the addTask tool.
    
    Context:
    Routine: ${JSON.stringify(context.routine)}
    Tasks: ${JSON.stringify(context.tasks)}
    Date: ${new Date().toISOString().split('T')[0]}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: message,
    config: { 
      systemInstruction,
      tools: [{ functionDeclarations: [addTaskTool] }]
    }
  });

  return response;
};

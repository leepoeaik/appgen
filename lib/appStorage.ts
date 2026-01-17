export interface AppData {
  id: string;
  name: string;
  description: string;
  code: string;
  initialPrompt: string;
  createdAt: string;
  lastModified: string;
}

const STORAGE_KEY = 'appgen_apps';

export function getAllApps(): AppData[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading apps from localStorage:', error);
    return [];
  }
}

export function getAppById(id: string): AppData | null {
  const apps = getAllApps();
  return apps.find(app => app.id === id) || null;
}

export function saveApp(app: AppData): void {
  if (typeof window === 'undefined') return;
  
  try {
    const apps = getAllApps();
    const existingIndex = apps.findIndex(a => a.id === app.id);
    
    if (existingIndex >= 0) {
      apps[existingIndex] = app;
    } else {
      apps.push(app);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch (error) {
    console.error('Error saving app to localStorage:', error);
    throw error;
  }
}

export function deleteApp(id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const apps = getAllApps();
    const filtered = apps.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting app from localStorage:', error);
  }
}

export function generateAppId(): string {
  return `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function extractAppNameFromPrompt(prompt: string): string {
  // Try to extract a reasonable name from the prompt
  const lowerPrompt = prompt.toLowerCase();
  
  // Common patterns
  if (lowerPrompt.includes('workout') || lowerPrompt.includes('exercise')) return 'Workout Tracker';
  if (lowerPrompt.includes('calorie') || lowerPrompt.includes('diet')) return 'Calorie Tracker';
  if (lowerPrompt.includes('todo') || lowerPrompt.includes('task')) return 'Todo List';
  if (lowerPrompt.includes('budget') || lowerPrompt.includes('expense')) return 'Budget Tracker';
  if (lowerPrompt.includes('pomodoro') || lowerPrompt.includes('timer')) return 'Pomodoro Timer';
  
  // Fallback: use first few words of prompt
  const words = prompt.trim().split(/\s+/).slice(0, 4);
  return words.join(' ') || 'Untitled App';
}

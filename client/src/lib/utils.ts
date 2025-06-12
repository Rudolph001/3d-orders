import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(minutes: number): string {
  if (!minutes || minutes === 0) return "0m";
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}m`;
  } else if (remainingMinutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${remainingMinutes}m`;
  }
}

export function parseTimeString(timeStr: string): number {
  if (!timeStr) return 0;
  
  const timePattern = /(?:(\d+)h)?\s*(?:(\d+)m)?/i;
  const match = timeStr.match(timePattern);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  
  return hours * 60 + minutes;
}

export function formatStatus(status: string): string {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'not_started':
      return 'bg-slate-100 text-slate-600';
    case 'printing':
      return 'bg-primary/10 text-primary';
    case 'paused':
      return 'bg-warning/10 text-warning';
    case 'completed':
      return 'bg-success/10 text-success';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-danger/10 text-danger';
    case 'high':
      return 'bg-warning/10 text-warning';
    case 'normal':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

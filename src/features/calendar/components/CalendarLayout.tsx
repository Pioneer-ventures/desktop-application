/**
 * Calendar Layout - Main layout with sidebar and calendar view
 */

import React, { useState, useEffect } from 'react';
import { CalendarEvent, CalendarViewMode } from '@/types/calendar';
import { CalendarSidebar } from './CalendarSidebar';
import { CalendarView } from './CalendarView';
import { TaskForm } from './TaskForm';
import { CalendarFiltersState } from './CalendarFilters';
import './CalendarLayout.css';

interface CalendarLayoutProps {
  events: CalendarEvent[];
  currentDate: Date;
  viewMode: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onEventCreate: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  loading?: boolean;
  onFiltersChange?: (filters: CalendarFiltersState) => void;
}

export const CalendarLayout: React.FC<CalendarLayoutProps> = ({
  events,
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  loading,
  onFiltersChange,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarEvent | undefined>();
  const [taskFormInitialDate, setTaskFormInitialDate] = useState<Date | undefined>();
  const filtersInitializedRef = React.useRef(false);
  
  // Initialize filters from localStorage or defaults
  const getInitialFilters = (): CalendarFiltersState => {
    try {
      const savedFilters = localStorage.getItem('calendar-filters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
    return {
      assignedTo: [],
      assignedBy: [],
      status: [],
      priority: [],
      type: [],
      dateRange: {},
    };
  };

  const [filters, setFilters] = useState<CalendarFiltersState>(getInitialFilters);

  useEffect(() => {
    const handleCreateTask = (e: CustomEvent) => {
      setTaskFormInitialDate(e.detail?.date);
      setEditingTask(undefined);
      setShowTaskForm(true);
    };

    window.addEventListener('calendar:create-task', handleCreateTask as EventListener);

    // Notify parent of initial filters after mount
    if (!filtersInitializedRef.current && onFiltersChange) {
      filtersInitializedRef.current = true;
      onFiltersChange(filters);
    }

    return () => {
      window.removeEventListener('calendar:create-task', handleCreateTask as EventListener);
    };
  }, []); // Only run on mount

  // Save filters to localStorage and notify parent when they change (after initialization)
  const prevFiltersRef = React.useRef<string>('');
  useEffect(() => {
    const filtersStr = JSON.stringify(filters);
    // Only trigger if filters actually changed (compare JSON strings to avoid infinite loops)
    if (filtersInitializedRef.current && filtersStr !== prevFiltersRef.current) {
      prevFiltersRef.current = filtersStr;
      localStorage.setItem('calendar-filters', filtersStr);
      if (onFiltersChange) {
        onFiltersChange(filters);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // Only depend on filters, not onFiltersChange to avoid infinite loop

  const handleTaskFormSuccess = (task: CalendarEvent) => {
    if (editingTask) {
      onEventUpdate(task);
    } else {
      onEventCreate(task);
    }
    setShowTaskForm(false);
    setEditingTask(undefined);
    setTaskFormInitialDate(undefined);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingTask(event);
    setTaskFormInitialDate(new Date(event.startTime));
    setShowTaskForm(true);
  };

  return (
    <div className="calendar-layout">
      <CalendarSidebar
        currentDate={currentDate}
        viewMode={viewMode}
        onDateChange={onDateChange}
        onViewModeChange={onViewModeChange}
        onEventCreate={onEventCreate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <CalendarView
        events={events}
        currentDate={currentDate}
        viewMode={viewMode}
        onEventClick={handleEventClick}
        onEventUpdate={onEventUpdate}
        onEventDelete={onEventDelete}
        loading={loading}
        sidebarCollapsed={sidebarCollapsed}
      />
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          initialDate={taskFormInitialDate}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(undefined);
            setTaskFormInitialDate(undefined);
          }}
          onSuccess={handleTaskFormSuccess}
        />
      )}
    </div>
  );
};


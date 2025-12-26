/**
 * Calendar View - Main calendar display area
 */

import React from 'react';
import { CalendarEvent, CalendarViewMode } from '@/types/calendar';
import { CalendarWeekView } from './views/CalendarWeekView';
import { CalendarDayView } from './views/CalendarDayView';
import { CalendarMonthView } from './views/CalendarMonthView';
import './CalendarView.css';

interface CalendarViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  viewMode: CalendarViewMode;
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  loading?: boolean;
  sidebarCollapsed: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  currentDate,
  viewMode,
  onEventClick,
  onEventUpdate,
  onEventDelete,
  loading,
  sidebarCollapsed,
}) => {
  const renderView = () => {
    switch (viewMode) {
      case 'day':
        return (
          <CalendarDayView
            events={events}
            currentDate={currentDate}
            onEventClick={onEventClick}
            onEventUpdate={onEventUpdate}
            onEventDelete={onEventDelete}
          />
        );
      case 'week':
        return (
          <CalendarWeekView
            events={events}
            currentDate={currentDate}
            onEventClick={onEventClick}
            onEventUpdate={onEventUpdate}
            onEventDelete={onEventDelete}
          />
        );
      case 'month':
        return (
          <CalendarMonthView
            events={events}
            currentDate={currentDate}
            onEventClick={onEventClick}
            onEventUpdate={onEventUpdate}
            onEventDelete={onEventDelete}
          />
        );
      default:
        return <div>Timeline view coming soon</div>;
    }
  };

  return (
    <div className="calendar-view">
      {loading && (
        <div className="calendar-view-loading">
          Loading calendar events...
        </div>
      )}
      {renderView()}
    </div>
  );
};


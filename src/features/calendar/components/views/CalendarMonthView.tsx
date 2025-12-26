/**
 * Calendar Month View - Calendar grid with compact event indicators
 */

import React from 'react';
import { CalendarEvent } from '@/types/calendar';
import './CalendarMonthView.css';

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  events,
  currentDate,
  onEventClick,
  onEventUpdate,
  onEventDelete,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get first Monday of the calendar grid
  const startDate = new Date(firstDay);
  const dayOfWeek = startDate.getDay();
  const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startDate.setDate(diff);

  // Generate all days in the grid (6 weeks * 7 days = 42 days)
  const days = Array.from({ length: 42 }, (_, i) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    return day;
  });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getEventsForDay = (day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  const isCurrentMonth = (day: Date) => {
    return day.getMonth() === month;
  };

  const isToday = (day: Date) => {
    const today = new Date();
    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="calendar-month-view">
      <div className="calendar-month-view-header">
        {weekDays.map((dayName) => (
          <div key={dayName} className="calendar-month-view-weekday">
            {dayName}
          </div>
        ))}
      </div>
      <div className="calendar-month-view-grid">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          return (
            <div
              key={idx}
              className={`calendar-month-view-day ${!isCurrentMonth(day) ? 'other-month' : ''} ${
                isToday(day) ? 'today' : ''
              }`}
            >
              <div className="calendar-month-view-day-number">{day.getDate()}</div>
              <div className="calendar-month-view-day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="calendar-month-view-event-indicator"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="calendar-month-view-more-indicator">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


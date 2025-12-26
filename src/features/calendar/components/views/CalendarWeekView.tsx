/**
 * Calendar Week View - 7-day horizontal timeline
 */

import React, { useMemo } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { calculateEventLayout, getEventLayoutStyle, LayoutedEvent } from '../../utils/overlapLayout.util';
import './CalendarWeekView.css';

interface CalendarWeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  events,
  currentDate,
  onEventClick,
  onEventUpdate,
  onEventDelete,
}) => {
  // Get week start (Monday)
  const weekStart = new Date(currentDate);
  const dayOfWeek = weekStart.getDay();
  const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = useMemo(() => {
    return (day: Date) => {
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
  }, [events]);

  const formatTime = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const formatDayHeader = (day: Date): string => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    return day.toLocaleDateString('en-US', options);
  };

  // Calculate pixels per minute (1440 minutes in a day)
  const pixelsPerMinute = 1; // 1px per minute

  const getEventStyle = (layoutedEvent: LayoutedEvent, day: Date): React.CSSProperties => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    return getEventLayoutStyle(layoutedEvent, dayStart, pixelsPerMinute);
  };

  // Calculate layouted events for each day
  const getLayoutedEventsForDay = (day: Date): LayoutedEvent[] => {
    const dayEvents = getEventsForDay(day);
    return calculateEventLayout(dayEvents);
  };

  return (
    <div className="calendar-week-view">
      <div className="calendar-week-view-header">
        <div className="calendar-week-view-time-column"></div>
        {days.map((day, idx) => (
          <div key={idx} className="calendar-week-view-day-header">
            <div className="calendar-week-view-day-name">{formatDayHeader(day)}</div>
            <div className="calendar-week-view-day-number">{day.getDate()}</div>
          </div>
        ))}
      </div>
      <div className="calendar-week-view-body">
        <div className="calendar-week-view-time-column">
          {hours.map((hour) => (
            <div key={hour} className="calendar-week-view-hour">
              {formatTime(hour)}
            </div>
          ))}
        </div>
        {days.map((day, dayIdx) => {
          const layoutedEvents = getLayoutedEventsForDay(day);
          return (
            <div key={dayIdx} className="calendar-week-view-day-column calendar-week-view-day-column--positioned">
              {hours.map((hour) => (
                <div key={hour} className="calendar-week-view-hour-slot"></div>
              ))}
              {layoutedEvents.map((layoutedEvent) => (
                <div
                  key={layoutedEvent.id}
                  className="calendar-week-view-event"
                  style={getEventStyle(layoutedEvent, day)}
                  onClick={() => onEventClick(layoutedEvent)}
                  title={layoutedEvent.title}
                  data-column-index={layoutedEvent.columnIndex}
                  data-total-columns={layoutedEvent.totalColumns}
                >
                  <div className="calendar-week-view-event-title">{layoutedEvent.title}</div>
                  <div className="calendar-week-view-event-time">
                    {new Date(layoutedEvent.startTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};


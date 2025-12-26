/**
 * Calendar Day View - Single day with hourly slots
 */

import React, { useMemo } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { calculateEventLayout, getEventLayoutStyle, LayoutedEvent } from '../../utils/overlapLayout.util';
import './CalendarDayView.css';

interface CalendarDayViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  events,
  currentDate,
  onEventClick,
  onEventUpdate,
  onEventDelete,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);

  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  }, [events, dayStart, dayEnd]);

  // Calculate overlap layout for events
  const layoutedEvents = useMemo(() => {
    return calculateEventLayout(dayEvents);
  }, [dayEvents]);

  // Calculate pixels per minute (1440 minutes in a day, container height determines pixels)
  // For now, assume 100% height = 1440 pixels (1 pixel per minute)
  // This will be adjusted based on actual container height
  const pixelsPerMinute = 1; // Will be dynamic based on container

  const formatTime = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getEventStyle = (layoutedEvent: LayoutedEvent): React.CSSProperties => {
    return getEventLayoutStyle(layoutedEvent, dayStart, pixelsPerMinute);
  };

  return (
    <div className="calendar-day-view">
      <div className="calendar-day-view-header">
        <div className="calendar-day-view-time-column"></div>
        <div className="calendar-day-view-day-header">
          <div className="calendar-day-view-day-name">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
      <div className="calendar-day-view-body">
        <div className="calendar-day-view-time-column">
          {hours.map((hour) => (
            <div key={hour} className="calendar-day-view-hour">
              {formatTime(hour)}
            </div>
          ))}
        </div>
        <div className="calendar-day-view-day-column calendar-day-view-day-column--positioned">
          {hours.map((hour) => (
            <div key={hour} className="calendar-day-view-hour-slot"></div>
          ))}
          {layoutedEvents.map((layoutedEvent) => (
            <div
              key={layoutedEvent.id}
              className="calendar-day-view-event"
              style={getEventStyle(layoutedEvent)}
              onClick={() => onEventClick(layoutedEvent)}
              title={layoutedEvent.title}
              data-column-index={layoutedEvent.columnIndex}
              data-total-columns={layoutedEvent.totalColumns}
            >
              <div className="calendar-day-view-event-title">{layoutedEvent.title}</div>
              <div className="calendar-day-view-event-time">
                {new Date(layoutedEvent.startTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {new Date(layoutedEvent.endTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


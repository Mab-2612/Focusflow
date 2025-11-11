// app/planning/page.tsx
"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'

// --- ADVANCED EVENT INTERFACE ---
// This now matches the database columns you added with the SQL
interface CalendarEvent {
  id?: string
  user_id: string
  title: string
  description?: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  type: 'appointment' | 'task' | 'reminder'
  priority: 'low' | 'medium' | 'high'
  reminder_minutes?: number // e.g., 15, 60, 1440 (1 day)
}

// --- MOCK HOLIDAY DATA ---
// Simulates fetching public holidays.
const getPublicHolidays = (year: number, month: number): { [dateStr: string]: string } => {
  const holidays: { [key: string]: string } = {
    [`${year}-01-01`]: "New Year's Day",
    [`${year}-12-25`]: "Christmas Day",
  };
  
  const monthHolidays: { [dateStr: string]: string } = {};
  Object.keys(holidays).forEach(dateStr => {
    const holidayDate = new Date(dateStr + "T00:00:00");
    if (holidayDate.getFullYear() === year && holidayDate.getMonth() === month) {
      monthHolidays[dateStr] = holidays[dateStr];
    }
  });
  return monthHolidays;
};

// --- HELPER: FORMAT TIME ---
const formatEventTime = (startTime: string, endTime: string) => {
  if (startTime === 'All-Day') return 'All-Day';
  
  const format = (time: string) => {
    if (!time) return '';
    try {
      const [hour, minute] = time.split(':');
      const h = parseInt(hour) % 12 || 12;
      const ampm = parseInt(hour) >= 12 ? 'PM' : 'AM';
      return `${h}:${minute} ${ampm}`;
    } catch (e) {
      return ''; // Handle invalid time format
    }
  };
  
  const start = format(startTime);
  const end = format(endTime);
  
  return end ? `${start} - ${end}` : start;
};


// --- MAIN COMPONENT ---
export default function PlanningPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date()) // For the calendar month
  const [selectedDate, setSelectedDate] = useState(new Date()) // For the agenda
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [holidays, setHolidays] = useState<{ [dateStr: string]: string }>({})
  const [showEventModal, setShowEventModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true);
  
  // FIXED: Default view is now 'agenda' per your request
  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda') 
  
  const [newEventData, setNewEventData] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    type: 'appointment',
    priority: 'medium',
    reminder_minutes: 15
  })

  // --- DATA FETCHING ---
  const fetchEventsAndHolidays = useCallback(async (date: Date) => {
    if (!user) return;
    setLoading(true);

    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    try {
      // Fetch user events
      const { data: eventData, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', firstDay)
        .lte('date', lastDay);

      if (error) throw error;
      setEvents(eventData || []);
      
      // Fetch simulated holidays
      const holidayData = getPublicHolidays(year, month);
      setHolidays(holidayData);

    } catch (error) {
      console.error('Error loading calendar data:', error)
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEventsAndHolidays(currentDate);
  }, [user, currentDate, fetchEventsAndHolidays]);

  // --- EVENT HANDLERS ---
  const handleSaveEvent = async () => {
    if (!user || !newEventData.title) return;

    try {
      // FIXED: Ensure default values for time to prevent null errors
      const eventToSave = {
        ...newEventData,
        user_id: user.id,
        startTime: newEventData.startTime || '00:00',
        endTime: newEventData.endTime || '00:00',
        reminder_minutes: newEventData.reminder_minutes || 0,
      };

      const { data, error } = await supabase
        .from('calendar_events')
        .upsert(eventToSave as any, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving event:', error); // Log the error
        throw error;
      }
      
      // Refresh local state
      if (isEditing) {
        setEvents(events.map(e => e.id === data.id ? data as CalendarEvent : e));
      } else {
        setEvents([...events, data as CalendarEvent]);
      }
      
      closeModal();
    } catch (error) {
      // Error is already logged in the console
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    // Use a simple confirmation dialog
    const isConfirmed = (window as any).confirm("Are you sure you want to delete this event?");
    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      setEvents(events.filter(e => e.id !== eventId));
      closeModal();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }

  const openModal = (event?: CalendarEvent) => {
    if (event) {
      // Edit existing event
      setIsEditing(true);
      setNewEventData({
        id: event.id,
        title: event.title,
        description: event.description || '',
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        type: event.type,
        priority: event.priority,
        reminder_minutes: event.reminder_minutes || 15
      });
    } else {
      // Create new event
      setIsEditing(false);
      setNewEventData({
        title: '',
        description: '',
        date: selectedDate.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        type: 'appointment',
        priority: 'medium',
        reminder_minutes: 15
      });
    }
    setShowEventModal(true);
  }

  const closeModal = () => {
    setShowEventModal(false);
    setIsEditing(false);
  }

  const handleDayClick = (day: any) => {
    if (day.empty) return;
    setSelectedDate(day.date);
    setViewMode('agenda'); // Snap back to agenda view on mobile
  }

  const handleMonthChange = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      const today = new Date();
      setCurrentDate(today);
      setSelectedDate(today);
      // Manually fetch if the month didn't change (e.g., already in current month)
      if (today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()) {
        fetchEventsAndHolidays(today);
      }
    } else {
      const newMonth = direction === 'prev' ? -1 : 1;
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + newMonth, 1);
      setCurrentDate(newDate);
      // Set selected date to the 1st of the new month
      setSelectedDate(newDate);
    }
  }

  // --- CALENDAR LOGIC & STYLES ---
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ key: `prev-${i}`, empty: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        key: `day-${i}`,
        date,
        dateStr,
        dayNum: i,
        isToday: dateStr === new Date().toISOString().split('T')[0],
        isSelected: dateStr === selectedDate.toISOString().split('T')[0],
        events: events.filter(e => e.date === dateStr),
        holiday: holidays[dateStr]
      });
    }
    return days;
  }, [currentDate, selectedDate, events, holidays]);

  const selectedDayEvents = useMemo(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayEvents = events.filter(e => e.date === dateStr);
    const dayHolidays = holidays[dateStr] ? [{
      id: `holiday-${dateStr}`,
      title: holidays[dateStr],
      startTime: 'All-Day',
      endTime: '',
      type: 'reminder',
      priority: 'medium',
      user_id: 'system'
    }] : [];
    
    // @ts-ignore
    return [...dayHolidays, ...dayEvents].sort((a, b) => {
      // FIXED: Handle potential null or undefined startTime to prevent crash
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      if (timeA === 'All-Day') return -1;
      if (timeB === 'All-Day') return 1;
      return timeA.localeCompare(timeB);
    });
  }, [selectedDate, events, holidays]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // --- STYLES ---
  const containerStyle = {
    // minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
  }

  const cardStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '24px',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
  }

  const calendarHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
    gap: '10px'
  }

  const calendarGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    borderRadius: '8px',
    overflow: 'hidden'
  }

  const dayHeaderStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
    padding: '8px 4px',
    textAlign: 'center' as const,
    fontWeight: '600' as const,
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    fontSize: 'var(--font-sm)'
  }

  const dayCellStyle = (day: any) => ({
    backgroundColor: day.isSelected ? (theme === 'dark' ? '#2563eb' : '#dbeafe') : (theme === 'dark' ? '#1f2937' : '#ffffff'),
    padding: '8px 4px',
    minHeight: '80px',
    cursor: 'pointer',
    opacity: day.empty ? 0 : 1,
    transition: 'background-color 0.2s ease',
    fontSize: 'var(--font-sm)',
    color: day.isSelected ? (theme === 'dark' ? 'white' : '#1e3a8a') : 'inherit'
  })

  const dayNumberStyle = (day: any) => ({
    fontWeight: '600' as const,
    color: day.isToday ? '#3b82f6' : (day.isSelected ? (theme === 'dark' ? 'white' : '#1e3a8a') : (theme === 'dark' ? '#f3f4f6' : '#1f2937')),
    display: 'inline-block',
    width: '24px',
    height: '24px',
    lineHeight: '24px',
    textAlign: 'center' as const,
    borderRadius: '50%',
    backgroundColor: day.isToday && !day.isSelected ? (theme === 'dark' ? '#3b82f6' : '#bfdbfe') : 'transparent'
  })

  const agendaItemStyle = (item: CalendarEvent) => ({
    display: 'flex',
    gap: '12px',
    padding: '12px',
    backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
    borderRadius: '8px',
    borderLeft: `4px solid ${
      item.type === 'reminder' ? '#f59e0b' :
      item.priority === 'high' ? '#ef4444' :
      item.priority === 'medium' ? '#3b82f6' : '#10b981'
    }`,
    cursor: item.type !== 'reminder' ? 'pointer' : 'default'
  })

  const modalStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    padding: '24px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '500px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    maxHeight: '90vh',
    overflowY: 'auto' as const
  }

  const modalInputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
    borderRadius: '8px',
    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    fontSize: '16px' // Prevent mobile zoom
  }

  const modalSelectStyle = {
    ...modalInputStyle,
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23${theme === 'dark' ? '9ca3af' : '6b7280'}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
  }

  const modalButtonStyle = (variant: 'primary' | 'danger' | 'secondary') => ({
    padding: '10px 20px',
    backgroundColor: variant === 'primary' ? '#3b82f6' : (variant === 'danger' ? '#ef4444' : 'transparent'),
    color: variant === 'secondary' ? (theme === 'dark' ? '#9ca3af' : '#6b7280') : 'white',
    border: variant === 'secondary' ? `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}` : 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500' as const
  })

  // --- FIXED: Replaced 'border' shorthand with long-form properties ---
  const viewToggleStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    backgroundColor: isActive ? '#3b82f6' : (theme === 'dark' ? '#374151' : '#f3f4f6'),
    color: isActive ? 'white' : (theme === 'dark' ? '#f3f4f6' : '#374151'),
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: isActive ? '#3b82f6' : (theme === 'dark' ? '#4b5563' : '#d1d5db'),
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  })

  return (
    <div style={containerStyle}>
      <div className="page-container">

        {/* --- View Toggler for Mobile --- */}
        <div className="view-toggler-mobile" style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <button 
            onClick={() => setViewMode('agenda')}
            style={{...viewToggleStyle(viewMode === 'agenda'), width: '50%', borderRadius: '8px 0 0 8px'}}
          >
            Agenda
          </button>
          <button 
            onClick={() => setViewMode('month')}
            style={{...viewToggleStyle(viewMode === 'month'), width: '50%', borderRadius: '0 8px 8px 0', borderLeftWidth: 0}}
          >
            Calendar
          </button>
        </div>

        {/* --- Main Content: Calendar + Agenda --- */}
        <div className="planning-layout">
          {/* --- Calendar Sidebar (Grid View) --- */}
          <div className="calendar-sidebar" style={cardStyle}>
            <div style={calendarHeaderStyle}>
              <h2 style={{ 
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                fontSize: '1.5rem',
                margin: 0
              }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleMonthChange('prev')}
                  style={{...modalButtonStyle('secondary'), padding: '8px 12px'}}
                  title="Previous Month"
                >
                  ←
                </button>
                <button
                  onClick={() => handleMonthChange('today')}
                  style={{...modalButtonStyle('secondary'), padding: '8px 12px'}}
                >
                  Today
                </button>
                <button
                  onClick={() => handleMonthChange('next')}
                  style={{...modalButtonStyle('secondary'), padding: '8px 12px'}}
                  title="Next Month"
                >
                  →
                </button>
              </div>
            </div>

            <div style={calendarGridStyle}>
              {weekDays.map(day => (
                <div key={day} style={dayHeaderStyle}>{day}</div>
              ))}
              
              {loading ? (
                Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} style={{...dayCellStyle({}), minHeight: '80px', backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'}}></div>
                ))
              ) : (
                calendarGrid.map(day => {
                  if (day.empty) return <div key={day.key} style={dayCellStyle(day)}></div>
                  
                  return (
                    <div 
                      key={day.key} 
                      style={dayCellStyle(day)}
                      onClick={() => handleDayClick(day)}
                    >
                      <span style={dayNumberStyle(day)}>{day.dayNum}</span>
                      {day.holiday && (
                        <div style={{
                          fontSize: '10px',
                          color: '#10b981',
                          fontWeight: '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{day.holiday}</div>
                      )}
                      <div style={{ display: 'flex', gap: '2px', marginTop: '4px', justifyContent: 'center' }}>
                        {day.events.slice(0, 3).map((event: any) => (
                          <div key={event.id} style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: event.priority === 'high' ? '#ef4444' : '#3b82f6'
                          }}></div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          
          {/* --- Agenda Main View --- */}
          <div className="agenda-main" style={cardStyle}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h3 style={{ 
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                fontSize: '1.25rem',
                margin: 0
              }}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button
                onClick={() => openModal()}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                + Add
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((item: any) => (
                  <div 
                    key={item.id} 
                    style={agendaItemStyle(item)}
                    onClick={() => item.type !== 'reminder' && openModal(item)}
                  >
                    <div style={{width: '80px', fontSize: '14px', color: theme === 'dark' ? '#9ca3af' : '#6b7280', flexShrink: 0}}>
                      {formatEventTime(item.startTime, item.endTime)}
                    </div>
                    <div>
                      <div style={{fontWeight: '600'}}>{item.title}</div>
                      {item.description && (
                        <div style={{fontSize: '14px', color: theme === 'dark' ? '#9ca3af' : '#6b7280'}}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                  No events planned for this day.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Event Modal --- */}
        {showEventModal && (
          <div className="modal-overlay">
            <div style={modalStyle}>
              <h3 style={{ marginBottom: '20px' }}>
                {isEditing ? 'Edit Event' : 'Add New Event'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Title */}
                <input
                  type="text"
                  placeholder="Event title"
                  value={newEventData.title || ''}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, title: e.target.value }))}
                  style={modalInputStyle}
                />
                
                {/* Type & Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <select
                    value={newEventData.type || 'appointment'}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, type: e.target.value as any }))}
                    style={modalSelectStyle}
                  >
                    <option value="appointment">📅 Appointment</option>
                    <option value="task">✅ Task</option>
                    <option value="reminder">🔔 Reminder</option>
                  </select>
                  <select
                    value={newEventData.priority || 'medium'}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, priority: e.target.value as any }))}
                    style={modalSelectStyle}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                
                {/* Date & Reminder */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="date"
                    value={newEventData.date || ''}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, date: e.target.value }))}
                    style={modalInputStyle}
                  />
                  <select
                    value={newEventData.reminder_minutes || 0}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, reminder_minutes: parseInt(e.target.value) }))}
                    style={modalSelectStyle}
                  >
                    <option value={0}>No reminder</option>
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </div>

                {/* Start & End Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="time"
                    value={newEventData.startTime || ''}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, startTime: e.target.value }))}
                    style={modalInputStyle}
                  />
                  <input
                    type="time"
                    value={newEventData.endTime || ''}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, endTime: e.target.value }))}
                    style={modalInputStyle}
                  />
                </div>
                
                {/* Description */}
                <textarea
                  placeholder="Description (optional)"
                  value={newEventData.description || ''}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, description: e.target.value }))}
                  style={{...modalInputStyle, minHeight: '80px'}}
                />
                
                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '10px' }}>
                  <div>
                    {isEditing && (
                      <button
                        onClick={() => handleDeleteEvent(newEventData.id!)}
                        style={modalButtonStyle('danger')}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={closeModal}
                      style={modalButtonStyle('secondary')}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEvent}
                      disabled={!newEventData.title}
                      style={{...modalButtonStyle('primary'), opacity: !newEventData.title ? 0.6 : 1}}
                    >
                      {isEditing ? 'Save Changes' : 'Create Event'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Navbar />

      {/* --- PAGE-SPECIFIC STYLES --- */}
      <style jsx>{`
        /* --- DESKTOP: Side-by-side layout --- */
        @media (min-width: 900px) {
          .planning-layout {
            display: grid;
            grid-template-columns: 350px 1fr; /* Fixed calendar, flexible agenda */
            gap: 24px;
            align-items: flex-start;
          }
          
          .view-toggler-mobile {
            display: none !important; /* Hide mobile toggle on desktop */
          }
        }
        
        /* --- MOBILE: Toggled layout --- */
        @media (max-width: 899px) {
          .planning-layout {
            display: block; /* Stack them */
          }
          
          .view-toggler-mobile {
            display: flex !important;
          }

          /* Show only the active view on mobile */
          .calendar-sidebar {
            display: ${viewMode === 'month' ? 'block' : 'none'};
          }
          .agenda-main {
            display: ${viewMode === 'agenda' ? 'block' : 'none'};
          }
        }
      `}</style>
    </div>
  )
}
"use client"

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'

interface CalendarEvent {
  id: string
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  type: 'task' | 'event' | 'reminder'
  priority: 'low' | 'medium' | 'high'
}

export default function PlanningPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    type: 'task',
    priority: 'medium'
  })

  // Load events from database
  useEffect(() => {
    if (user) {
      loadEvents()
    }
  }, [user])

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const saveEvent = async () => {
    if (!user || !newEvent.title) return

    try {
      const { error } = await supabase
        .from('calendar_events')
        .upsert({
          ...newEvent,
          user_id: user.id,
          id: newEvent.id || undefined
        })

      if (error) throw error
      
      setShowEventModal(false)
      setNewEvent({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        type: 'task',
        priority: 'medium'
      })
      loadEvents()
    } catch (error) {
      console.error('Error saving event:', error)
    }
  }

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)

      if (error) throw error
      loadEvents()
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  // Calendar generation functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const generateCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedDate)
    const firstDay = getFirstDayOfMonth(selectedDate)
    const days = []

    // Previous month's days
    const prevMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
    const prevMonthDays = getDaysInMonth(prevMonth)
    
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonthDays - i),
        isCurrentMonth: false,
        events: []
      })
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i)
      const dayEvents = events.filter(event => 
        event.date === date.toISOString().split('T')[0]
      )
      days.push({
        date,
        isCurrentMonth: true,
        events: dayEvents
      })
    }

    // Next month's days
    const totalCells = 42 // 6 weeks
    while (days.length < totalCells) {
      const nextMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
      const day = days.length - getFirstDayOfMonth(selectedDate) - daysInMonth + 1
      days.push({
        date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day),
        isCurrentMonth: false,
        events: []
      })
    }

    return days
  }

  const calendarDays = generateCalendar()
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    paddingBottom: '120px'
  }

  const contentStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 16px'
  }

  const cardStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
  }

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '32px',
          color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
          textAlign: 'center'
        }}>
          📅 Planning & Calendar
        </h1>

        {/* Calendar Header */}
        <div style={cardStyle}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ 
              color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
              fontSize: '1.5rem',
              margin: 0
            }}>
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                  color: theme === 'dark' ? '#f3f4f6' : '#374151',
                  border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`,
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ← Previous
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                  color: theme === 'dark' ? '#f3f4f6' : '#374151',
                  border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`,
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb'
          }}>
            {/* Week Days Header */}
            {weekDays.map(day => (
              <div key={day} style={{
                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                padding: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
                color: theme === 'dark' ? '#f3f4f6' : '#374151'
              }}>
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                onClick={() => {
                  setNewEvent(prev => ({ ...prev, date: day.date.toISOString().split('T')[0] }))
                  setShowEventModal(true)
                }}
                style={{
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  padding: '10px',
                  minHeight: '100px',
                  border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  cursor: 'pointer',
                  opacity: day.isCurrentMonth ? 1 : 0.4
                }}
              >
                <div style={{
                  fontWeight: 'bold',
                  marginBottom: '5px',
                  color: day.date.toDateString() === new Date().toDateString() 
                    ? '#3b82f6' 
                    : (theme === 'dark' ? '#f3f4f6' : '#374151')
                }}>
                  {day.date.getDate()}
                </div>
                <div style={{ fontSize: '12px' }}>
                  {day.events.slice(0, 3).map(event => (
                    <div key={event.id} style={{
                      backgroundColor: 
                        event.priority === 'high' ? '#ef4444' :
                        event.priority === 'medium' ? '#f59e0b' : '#10b981',
                      color: 'white',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      marginBottom: '2px',
                      fontSize: '10px'
                    }}>
                      {event.title}
                    </div>
                  ))}
                  {day.events.length > 3 && (
                    <div style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                      +{day.events.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={cardStyle}>
          <h2 style={{ 
            marginBottom: '20px', 
            color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
            fontSize: '1.5rem'
          }}>
            Quick Actions
          </h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowEventModal(true)}
              style={{
                padding: '12px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              📅 Schedule Event
            </button>
            <button style={{
              padding: '12px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              📋 Create Plan
            </button>
          </div>
        </div>

        {/* Event Modal */}
        {showEventModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '500px'
            }}>
              <h3 style={{ marginBottom: '20px', color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}>
                {newEvent.id ? 'Edit Event' : 'Add New Event'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Event title"
                  value={newEvent.title || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                    borderRadius: '8px',
                    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
                  }}
                />
                
                <textarea
                  placeholder="Description"
                  value={newEvent.description || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  style={{
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                    borderRadius: '8px',
                    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                    minHeight: '80px'
                  }}
                />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="date"
                    value={newEvent.date || ''}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                    style={{
                      padding: '10px',
                      border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                      borderRadius: '8px'
                    }}
                  />
                  <select
                    value={newEvent.priority || 'medium'}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, priority: e.target.value as any }))}
                    style={{
                      padding: '10px',
                      border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                      borderRadius: '8px'
                    }}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowEventModal(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'transparent',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEvent}
                    disabled={!newEvent.title}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: newEvent.title ? '#10b981' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: newEvent.title ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Save Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Navbar />
    </div>
  )
}
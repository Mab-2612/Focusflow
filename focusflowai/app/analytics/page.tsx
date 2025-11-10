// app/analytics/page.tsx
"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useAnalyticsStore } from '@/lib/analyticsStore'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, TooltipProps 
} from 'recharts'
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

// Helper to format time
const formatTime = (minutes: number): string => {
  if (isNaN(minutes)) return '0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

// Custom Tooltip for better hover details
const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  const { theme } = useTheme(); 
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        border: `1px solid ${theme ==='dark' ? '#374151' : '#e5e7eb'}`,
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <p style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '8px' }}>{label}</p>
        <p style={{ color: payload[0].fill, fontSize: '14px' }}>
          {`${payload[0].name}: ${payload[0].value} min`}
        </p>
        <p style={{ color: payload[1].fill, fontSize: '14px' }}>
          {`${payload[1].name}: ${payload[1].value}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  
  const { 
    focusSessions, 
    productivityScore, 
    weeklyTrends, 
    isLoading, 
    loadUserAnalytics,
    daily_focus_goal
  } = useAnalyticsStore()

  const [isMounted, setIsMounted] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const instructionsRef = useRef<HTMLDivElement>(null)
  const questionButtonRef = useRef<HTMLButtonElement>(null)

  const { totalWeekFocus, totalWeekTasks } = useMemo(() => {
    return weeklyTrends.reduce((acc, day) => {
      acc.totalWeekFocus += day.focusTime;
      acc.totalWeekTasks += day.tasksCompleted;
      return acc;
    }, { totalWeekFocus: 0, totalWeekTasks: 0 });
  }, [weeklyTrends]);

  useEffect(() => {
    setIsMounted(true)
    if (user) {
      loadUserAnalytics(user.id)
    }
  }, [user, loadUserAnalytics])

  // --- Popover Logic ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        instructionsRef.current && 
        !instructionsRef.current.contains(event.target as Node) &&
        questionButtonRef.current &&
        !questionButtonRef.current.contains(event.target as Node)
      ) {
        setShowInstructions(false)
      }
    }
    if (showInstructions) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showInstructions])

  const getInstructionsPosition = () => {
    if (!questionButtonRef.current) return { top: '50%', left: '50%' }
    const rect = questionButtonRef.current.getBoundingClientRect()
    return {
      top: `${rect.bottom + 10}px`,
      right: `${window.innerWidth - rect.right}px`,
      transform: 'none'
    }
  }

  // FIXED: Improved CSV Export
  const exportAnalyticsData = () => {
    let csvContent = "FocusFlow Analytics Export\n";
    csvContent += `Exported on: ${new Date().toLocaleString()}\n\n`;
    
    csvContent += "Key Metrics (Last 7 Days)\n";
    csvContent += `Productivity Score,${productivityScore}/100\n`;
    csvContent += `Total Weekly Focus,${formatTime(totalWeekFocus)}\n`;
    csvContent += `Total Weekly Tasks,${totalWeekTasks}\n`;
    csvContent += `Total Sessions Logged (All Time),${focusSessions.length}\n\n`;
    
    csvContent += "Raw Session Data (All Time)\n";
    csvContent += "Date,Session Type,Duration (minutes),Tasks Completed\n";

    focusSessions.forEach(session => {
      const date = new Date(session.created_at).toLocaleDateString();
      const type = session.session_type;
      const duration = Math.round(session.duration / 60);
      const tasks = session.completed_tasks;
      csvContent += `"${date}","${type}",${duration},${tasks}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `focusflow-analytics-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // --- Styles ---
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    transition: 'background-color 0.3s ease, color 0.3s ease'
  }
  const titleStyle = {
    fontSize: 'var(--font-xl)',
    fontWeight: '700',
    marginBottom: '32px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }
  const sectionStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    marginBottom: '24px',
    position: 'relative' as const
  }
  const sectionTitleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }
  const statCardStyle = {
    backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center' as const
  }
  const statValueStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '8px 0',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }
  const statLabelStyle = {
    fontSize: '14px',
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    margin: 0
  }
  const downloadButtonStyle = {
    padding: '10px 16px', 
    backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6', 
    color: theme === 'dark' ? '#d1d5db' : '#374151', 
    border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`, 
    borderRadius: '8px', 
    cursor: 'pointer', 
    marginTop: '24px',
    fontSize: '14px',
    fontWeight: '500'
  }

  if (!isMounted) {
     return (
      <div style={containerStyle}>
        <div className="page-container">
          <h1 style={titleStyle}>Analytics</h1>
        </div>
        <Navbar />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div className="page-container">
        <h1 style={titleStyle}>Analytics</h1>

        {/* Main Stats Section */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Weekly Overview</h2>
          
          <button
            ref={questionButtonRef}
            onClick={() => setShowInstructions(!showInstructions)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
              color: theme === 'dark' ? '#d1d5db' : '#4b5563',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              zIndex: 10
            }}
            title="How it works"
          >
            ?
          </button>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              <div className="animate-spin" style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
              Loading your productivity data...
            </div>
          ) : (
            <>
              <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={statCardStyle}>
                  <div style={{...statValueStyle, color: productivityScore > 80 ? 'var(--accent-success)' : productivityScore > 60 ? 'var(--accent-warning)' : 'var(--accent-danger)'}}>
                    {productivityScore}
                  </div>
                  <div style={statLabelStyle}>Productivity Score</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{...statValueStyle, color: 'var(--accent-primary)'}}>
                    {formatTime(totalWeekFocus)}
                  </div>
                  <div style={statLabelStyle}>Weekly Focus</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{...statValueStyle, color: 'var(--accent-success)'}}>
                    {totalWeekTasks}
                  </div>
                  <div style={statLabelStyle}>Weekly Tasks</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{...statValueStyle, color: 'var(--accent-warning)'}}>
                    {daily_focus_goal} {daily_focus_goal > 1 ? 'hrs' : 'hr'}
                  </div>
                  <div style={statLabelStyle}>Daily Goal</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{...statValueStyle, color: 'var(--accent-warning)'}}>
                    {formatTime(daily_focus_goal * 60 * 7)}
                  </div>
                  <div style={statLabelStyle}>Weekly Goal</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{...statValueStyle, color: '#8b5cf6'}}>
                    {focusSessions.length}
                  </div>
                  <div style={statLabelStyle}>Total Sessions</div>
                </div>
              </div>
              
              {focusSessions.length > 0 && (
                <button onClick={exportAnalyticsData} style={downloadButtonStyle}>
                  Export Analytics Data
                </button>
              )}
            </>
          )}
        </div>

        {/* Weekly Chart Section */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Last 7 Days</h2>
          
          {/* FIXED: This div wrapper fixes the recharts width/height error */}
          <div style={{ width: '100%', height: 300, minWidth: 0 }}>
            {isLoading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrends} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="day" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} interval={0} />
                  
                  <YAxis 
                    yAxisId="left" 
                    stroke={theme === 'dark' ? '#60a5fa' : '#3b82f6'} 
                    allowDecimals={false}
                    tickFormatter={(tick) => `${tick}m`}
                  />
                  
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke={theme === 'dark' ? '#34d399' : '#10b981'} 
                    allowDecimals={false}
                    tickFormatter={(tick) => Math.floor(tick)}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="focusTime" name="Focus (min)" fill={theme === 'dark' ? '#60a5fa' : '#3b82f6'} />
                  <Bar yAxisId="right" dataKey="tasksCompleted" name="Tasks Done" fill={theme ==='dark' ? '#34d399' : '#10b981'} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Help Popover */}
      {showInstructions && (
        <div
          ref={instructionsRef}
          style={{
            position: 'fixed',
            ...getInstructionsPosition(),
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            maxWidth: '350px',
            width: '90%',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <h3 style={{ 
            color: 'var(--text-primary)', 
            marginBottom: '16px',
            fontSize: '18px'
          }}>
            How Analytics Work
          </h3>
          <div style={{ 
            color: 'var(--text-secondary)', 
            lineHeight: '1.6',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            <p style={{ margin: '6px 0' }}>
              <strong>Productivity Score:</strong> An average of your consistency and focus goal.
            </p>
            <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
              <li><strong>50% Consistency:</strong> Did you complete a focus session on at least 4 of the last 7 days?</li>
              <li><strong>50% Goal:</strong> How close did you get to your weekly focus goal of <strong>{formatTime((daily_focus_goal || 1) * 60 * 7)}</strong>?</li>
            </ul>
            <p style={{ margin: '6px 0' }}>
              <strong>Weekly Focus:</strong> Total minutes you spent in a "Focus" session in the last 7 days.
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Weekly Tasks:</strong> Total tasks you completed during your focus sessions in the last 7 days.
            </p>
          </div>
          <button
            onClick={() => setShowInstructions(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
              color: 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
        </div>
      )}

      <Navbar />
    </div>
  )
}
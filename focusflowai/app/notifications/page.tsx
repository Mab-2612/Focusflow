// app/notifications/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle2, Info, XCircle, Bell, Loader2, Inbox } from 'lucide-react' // <-- IMPORT ICONS

// Define the Notification type based on your DB table
interface Notification {
  id: string; // Changed from number to string (UUID)
  created_at: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
}

export default function NotificationsPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // FIXED: Load notifications from Supabase
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data || []);
      }
      setIsLoading(false);
    };

    fetchNotifications();
  }, [user]);

  // FIXED: Update read status in Supabase
  const markAsRead = async (id: string) => {
    // Optimistically update the UI
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    
    // Update in database
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
      
    if (error) {
      console.error('Error marking as read:', error);
      // Revert UI if error
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: false } : n)
      );
    }
  };
  
  // FIXED: Mark all as read in Supabase
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    // Update in database
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
      
    if (error) {
      console.error('Error marking all as read:', error);
      // Revert UI on error
      setNotifications(prev => 
        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: false } : n)
      );
    }
  };

  // --- UPDATED: Use SVG icons instead of emojis ---
  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 color="var(--accent-success)" />;
      case 'info': return <Info color="var(--accent-primary)" />;
      case 'error': return <XCircle color="var(--accent-danger)" />;
      default: return <Bell color="var(--text-tertiary)" />;
    }
  };
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // --- Styles ---
  const containerStyle = {
    minHeight: '90vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
  }
  const titleStyle = {
    fontSize: 'var(--font-xl)',
    fontWeight: '700',
    marginBottom: '16px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }
  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  }
  const markAllButtonStyle = {
    padding: '8px 12px',
    fontSize: '14px',
    color: 'var(--accent-primary)',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontWeight: '500'
  }
  const notificationListStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  }
  const notificationItemStyle = (isRead: boolean) => ({
    display: 'flex',
    gap: '16px',
    padding: '16px',
    backgroundColor: theme === 'dark' ? 'var(--bg-secondary)' : 'var(--bg-primary)',
    border: `1px solid var(--border-light)`,
    borderRadius: 'var(--radius-lg)',
    opacity: isRead ? 0.6 : 1,
    transition: 'all 0.3s ease',
    cursor: isRead ? 'default' : 'pointer'
  })
  const iconStyle = {
    fontSize: '24px',
    flexShrink: 0,
    marginTop: '4px',
    width: '24px', // Set fixed width for alignment
    height: '24px', // Set fixed height
  }
  const contentStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flexGrow: 1
  }
  const notificationTitleStyle = {
    fontSize: 'var(--font-base)',
    fontWeight: '600',
    color: 'var(--text-primary)'
  }
  const notificationMessageStyle = {
    fontSize: 'var(--font-sm)',
    color: 'var(--text-secondary)',
    lineHeight: 1.5
  }
  const notificationDateStyle = {
    fontSize: 'var(--font-xs)',
    color: 'var(--text-tertiary)',
    marginTop: '4px'
  }
  const dotStyle = {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    flexShrink: 0,
    marginTop: '10px'
  }

  return (
    <div style={containerStyle}>
      <div className="page-container">
        <div style={headerStyle}>
          <h1 style={titleStyle}>Notifications</h1>
          {unreadCount > 0 && (
            <button 
              style={markAllButtonStyle}
              onClick={markAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>
        
        {isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {/* --- UPDATED --- */}
            <Loader2 size={48} className="animate-spin" />
            Loading notifications...
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {/* --- UPDATED --- */}
            <Inbox size={48} />
            You have no notifications yet.
          </div>
        )}

        {!isLoading && (
          <div style={notificationListStyle}>
            {notifications.map(n => (
              <div 
                key={n.id} 
                style={notificationItemStyle(n.is_read)}
                onClick={() => !n.is_read && markAsRead(n.id)}
              >
                <div style={iconStyle}>{getIcon(n.type)}</div>
                <div style={contentStyle}>
                  <span style={notificationTitleStyle}>{n.title}</span>
                  <span style={notificationMessageStyle}>{n.message}</span>
                  <span style={notificationDateStyle}>
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                {!n.is_read && (
                  <div style={dotStyle} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  )
}
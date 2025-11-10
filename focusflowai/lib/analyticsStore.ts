// lib/analyticsStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase/client'

interface DailyStats {
  focusTime: number // in minutes
  tasksCompleted: number
}

interface FocusSession {
  id: string
  user_id: string
  duration: number // in seconds
  session_type: string
  completed_tasks: number
  created_at: string
}

interface AnalyticsState {
  focusSessions: FocusSession[]
  dailyStats: { [date: string]: DailyStats }
  weeklyTrends: any[]
  productivityScore: number
  isLoading: boolean
  daily_focus_goal: number
  lastLoaded: Date | null // FIXED: Added timestamp
  
  // Actions
  addFocusSession: (session: FocusSession) => void
  updateDailyStats: (date: string, focusTime: number, tasksCompleted: number) => void
  calculateProductivityScore: () => void
  getWeeklyTrends: () => any[]
  clearAnalytics: () => void
  loadUserAnalytics: (userId: string) => Promise<void>
  syncWithDatabase: (userId: string) => Promise<void>
}

// Helper functions (no change)
const calculateDailyProductivity = (focusTime: number, tasksCompleted: number): number => {
  if (focusTime === 0) return 0
  const focusHours = focusTime / 60
  const timeEfficiency = Math.min(1, focusHours / 8) * 0.6
  const taskEfficiency = Math.min(1, tasksCompleted / 10) * 0.4
  return Math.round((timeEfficiency + taskEfficiency) * 100)
}

const calculateWeeklyTrends = (dailyStats: { [date: string]: DailyStats }) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date.toISOString().split('T')[0]
  }).reverse()

  return last7Days.map(date => {
    const stats = dailyStats[date] || { focusTime: 0, tasksCompleted: 0 }
    return {
      date,
      day: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      focusTime: stats.focusTime,
      tasksCompleted: stats.tasksCompleted,
      productivity: calculateDailyProductivity(stats.focusTime, stats.tasksCompleted)
    }
  })
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      focusSessions: [],
      dailyStats: {},
      weeklyTrends: [],
      productivityScore: 0,
      isLoading: false,
      daily_focus_goal: 1,
      lastLoaded: null, // FIXED: Initialize as null

      addFocusSession: (session) => {
        set((state) => ({
          focusSessions: [...state.focusSessions, session].slice(-1000)
        }))
        get().updateAnalytics()
      },

      updateDailyStats: (date, focusTime, tasksCompleted) => {
        set((state) => {
          const current = state.dailyStats[date] || { focusTime: 0, tasksCompleted: 0 }
          return {
            dailyStats: {
              ...state.dailyStats,
              [date]: {
                focusTime: current.focusTime + focusTime,
                tasksCompleted: current.tasksCompleted + tasksCompleted
              }
            }
          }
        })
        get().updateAnalytics()
      },

      updateAnalytics: () => {
        const { dailyStats, daily_focus_goal } = get()
        const weeklyTrends = calculateWeeklyTrends(dailyStats)
        
        const activeDays = weeklyTrends.filter(day => day.focusTime > 0).length
        const totalWeekFocus = weeklyTrends.reduce((sum, day) => sum + day.focusTime, 0)
        
        const WEEKLY_FOCUS_GOAL_MINUTES = (daily_focus_goal || 1) * 60 * 7

        const consistency = (activeDays / 7) * 100
        const goalMet = (Math.min(totalWeekFocus, WEEKLY_FOCUS_GOAL_MINUTES) / WEEKLY_FOCUS_GOAL_MINUTES) * 100
        
        const productivityScore = Math.round((consistency * 0.5) + (goalMet * 0.5))
        
        set({ weeklyTrends, productivityScore })
      },

      calculateProductivityScore: () => {
        get().updateAnalytics()
      },

      getWeeklyTrends: () => {
        return get().weeklyTrends
      },

      clearAnalytics: () => {
        set({
          focusSessions: [],
          dailyStats: {},
          weeklyTrends: [],
          productivityScore: 0,
          lastLoaded: null
        })
      },

      loadUserAnalytics: async (userId: string) => {
        set({ isLoading: true })
        try {
          const [sessionsResult, prefsResult] = await Promise.all([
            supabase
              .from('focus_sessions')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false }),
            supabase
              .from('user_preferences')
              .select('preferences')
              .eq('user_id', userId)
              .single()
          ])

          const { data: sessions, error } = sessionsResult;
          
          if (prefsResult.data && prefsResult.data.preferences) {
            set({ daily_focus_goal: Number(prefsResult.data.preferences.daily_focus_goal) || 1 })
          } else {
            set({ daily_focus_goal: 1 })
          }

          if (sessions && !error) {
            set({ focusSessions: sessions })
            
            const dailyStats: { [date: string]: DailyStats } = {}
            
            sessions.forEach(session => {
              const date = new Date(session.created_at).toISOString().split('T')[0]
              const durationMinutes = Math.round(session.duration / 60)
              
              if (!dailyStats[date]) {
                dailyStats[date] = { focusTime: 0, tasksCompleted: 0 }
              }
              
              dailyStats[date].focusTime += durationMinutes
              dailyStats[date].tasksCompleted += session.completed_tasks
            })
            
            set({ dailyStats, lastLoaded: new Date() }) // FIXED: Set timestamp on success
            get().updateAnalytics()
          }
        } catch (error) {
          console.error('Error loading analytics:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      syncWithDatabase: async (userId: string) => {
        await get().loadUserAnalytics(userId)
      }
    }),
    {
      name: 'analytics-storage',
      partialize: (state) => ({
        focusSessions: state.focusSessions,
        dailyStats: state.dailyStats,
        weeklyTrends: state.weeklyTrends,
        productivityScore: state.productivityScore,
        daily_focus_goal: state.daily_focus_goal,
        lastLoaded: state.lastLoaded // FIXED: Persist the timestamp
      })
    }
  )
)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabaseClient'

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
  
  // Actions
  addFocusSession: (session: FocusSession) => void
  updateDailyStats: (date: string, focusTime: number, tasksCompleted: number) => void
  calculateProductivityScore: () => number
  getWeeklyTrends: () => any[]
  clearAnalytics: () => void
  loadUserAnalytics: (userId: string) => Promise<void>
  syncWithDatabase: (userId: string) => Promise<void>
}

// Helper functions
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
        const { dailyStats, focusSessions } = get()
        
        const weeklyTrends = calculateWeeklyTrends(dailyStats)
        const productivityScore = get().calculateProductivityScore()
        
        set({ weeklyTrends, productivityScore })
      },

      calculateProductivityScore: () => {
        const { dailyStats, focusSessions } = get()
        
        if (focusSessions.length === 0) return 0
        
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - i)
          return date.toISOString().split('T')[0]
        })

        const activeDays = last7Days.filter(date => 
          dailyStats[date]?.focusTime > 0
        ).length

        const consistency = (activeDays / 7) * 40

        const totalProductivity = last7Days.reduce((sum, date) => {
          const stats = dailyStats[date] || { focusTime: 0, tasksCompleted: 0 }
          return sum + calculateDailyProductivity(stats.focusTime, stats.tasksCompleted)
        }, 0)

        const efficiency = (totalProductivity / 7) * 0.6

        return Math.round(consistency + efficiency)
      },

      getWeeklyTrends: () => {
        return get().weeklyTrends
      },

      clearAnalytics: () => {
        set({
          focusSessions: [],
          dailyStats: {},
          weeklyTrends: [],
          productivityScore: 0
        })
      },

      loadUserAnalytics: async (userId: string) => {
        set({ isLoading: true })
        try {
          // Load focus sessions
          const { data: sessions, error } = await supabase
            .from('focus_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

          if (sessions && !error) {
            set({ focusSessions: sessions })
            
            // Calculate daily stats from sessions
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
            
            set({ dailyStats })
            get().updateAnalytics()
          }
        } catch (error) {
          console.error('Error loading analytics:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      syncWithDatabase: async (userId: string) => {
        // This will sync local analytics with database
        await get().loadUserAnalytics(userId)
      }
    }),
    {
      name: 'analytics-storage',
      partialize: (state) => ({
        focusSessions: state.focusSessions,
        dailyStats: state.dailyStats,
        weeklyTrends: state.weeklyTrends,
        productivityScore: state.productivityScore
      })
    }
  )
)
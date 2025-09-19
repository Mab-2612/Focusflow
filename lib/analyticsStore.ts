//lib/analyticsStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Helper functions (defined outside the store)
const calculateWeeklyTrends = (dailyStats: any) => {
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

const calculateDailyProductivity = (focusTime: number, tasksCompleted: number) => {
  if (focusTime === 0) return 0
  
  // Convert focusTime from seconds to hours for calculation
  const focusHours = focusTime / 3600
  const timeEfficiency = Math.min(1, focusHours / 8) * 0.6 // 60% weight (8-hour target)
  const taskEfficiency = Math.min(1, tasksCompleted / 10) * 0.4 // 40% weight (10-task target)
  
  return Math.round((timeEfficiency + taskEfficiency) * 100)
}

const calculateProductivityScore = (focusSessions: any[], dailyStats: any) => {
  if (focusSessions.length === 0) return 0
  
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date.toISOString().split('T')[0]
  })

  // Calculate consistency (days with at least one session)
  const activeDays = last7Days.filter(date => 
    dailyStats[date]?.focusTime > 0
  ).length

  const consistency = (activeDays / 7) * 40 // 40% weight

  // Calculate efficiency (average daily productivity)
  const totalProductivity = last7Days.reduce((sum, date) => {
    const stats = dailyStats[date] || { focusTime: 0, tasksCompleted: 0 }
    return sum + calculateDailyProductivity(stats.focusTime, stats.tasksCompleted)
  }, 0)

  const efficiency = (totalProductivity / 7) * 0.6 // 60% weight

  return Math.round(consistency + efficiency)
}

interface AnalyticsState {
  // Real-time analytics data
  focusSessions: any[]
  dailyStats: { [date: string]: { focusTime: number; tasksCompleted: number } }
  weeklyTrends: any[]
  productivityScore: number
  
  // Actions
  addFocusSession: (session: any) => void
  updateDailyStats: (date: string, focusTime: number, tasksCompleted: number) => void
  calculateProductivityScore: () => void
  getWeeklyTrends: () => any[]
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      focusSessions: [],
      dailyStats: {},
      weeklyTrends: [],
      productivityScore: 0,

      addFocusSession: (session) => {
        const { focusSessions } = get()
        const newSessions = [...focusSessions, session].slice(-1000) // Keep last 1000 sessions
        set({ focusSessions: newSessions })
        get().updateAnalytics()
      },

      updateDailyStats: (date, focusTime, tasksCompleted) => {
        const { dailyStats } = get()
        const current = dailyStats[date] || { focusTime: 0, tasksCompleted: 0 }
        
        set({
          dailyStats: {
            ...dailyStats,
            [date]: {
              focusTime: current.focusTime + focusTime,
              tasksCompleted: current.tasksCompleted + tasksCompleted
            }
          }
        })
        get().updateAnalytics()
      },

      updateAnalytics: () => {
        const { focusSessions, dailyStats } = get()
        
        // Calculate weekly trends
        const weeklyTrends = calculateWeeklyTrends(dailyStats)
        
        // Calculate productivity score
        const productivityScore = calculateProductivityScore(focusSessions, dailyStats)
        
        set({ weeklyTrends, productivityScore })
      },

      calculateProductivityScore: () => {
        const { focusSessions, dailyStats } = get()
        set({ productivityScore: calculateProductivityScore(focusSessions, dailyStats) })
      },

      getWeeklyTrends: () => {
        return get().weeklyTrends
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
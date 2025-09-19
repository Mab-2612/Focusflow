import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Task, Category, setTaskChangeCallbacks } from '@/services/taskService'

interface AppState {
  // Real-time data
  tasks: Task[]
  categories: Category[]
  currentSession: any
  analytics: any
  
  // Offline queue
  offlineQueue: Array<{
    id: string
    type: string
    payload: any
    timestamp: number
  }>
  
  // UI state
  isOnline: boolean
  lastSync: number | null

  // Actions
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  deleteTask: (taskId: string) => void
  setCategories: (categories: Category[]) => void
  setOnlineStatus: (isOnline: boolean) => void
  addToOfflineQueue: (action: { type: string; payload: any }) => void
  clearOfflineQueue: () => void
  processOfflineQueue: () => Promise<void>
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      // Initialize real-time callbacks
      setTaskChangeCallbacks({
        onTaskChange: (payload) => {
          const { tasks } = get()
          switch (payload.eventType) {
            case 'INSERT':
              set({ tasks: [...tasks, payload.new] })
              break
            case 'UPDATE':
              set({ 
                tasks: tasks.map(task => 
                  task.id === payload.new.id ? { ...task, ...payload.new } : task
                )
              })
              break
            case 'DELETE':
              set({ tasks: tasks.filter(task => task.id !== payload.old.id) })
              break
            case 'SYNC':
              set({ tasks: payload.new })
              break
          }
        },
        onCategoryChange: (payload) => {
          const { categories } = get()
          switch (payload.eventType) {
            case 'INSERT':
              set({ categories: [...categories, payload.new] })
              break
            case 'UPDATE':
              set({ 
                categories: categories.map(category => 
                  category.id === payload.new.id ? { ...category, ...payload.new } : category
                )
              })
              break
            case 'DELETE':
              set({ categories: categories.filter(category => category.id !== payload.old.id) })
              break
            case 'SYNC':
              set({ categories: payload.new })
              break
          }
        }
      })

      return {
        // Initial state
        tasks: [],
        categories: [],
        currentSession: null,
        analytics: null,
        offlineQueue: [],
        isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
        lastSync: null,

        // Actions
        setTasks: (tasks) => set({ tasks }),
        
        addTask: (task) => {
          const { tasks, isOnline } = get()
          const newTasks = [...tasks, task]
          set({ tasks: newTasks })
          
          if (!isOnline) {
            get().addToOfflineQueue({
              type: 'CREATE_TASK',
              payload: task
            })
          }
        },

        updateTask: (taskId, updates) => {
          const { tasks, isOnline } = get()
          const newTasks = tasks.map(task => 
            task.id === taskId ? { ...task, ...updates } : task
          )
          set({ tasks: newTasks })
          
          if (!isOnline) {
            get().addToOfflineQueue({
              type: 'UPDATE_TASK',
              payload: { taskId, updates }
            })
          }
        },

        deleteTask: (taskId) => {
          const { tasks, isOnline } = get()
          const newTasks = tasks.filter(task => task.id !== taskId)
          set({ tasks: newTasks })
          
          if (!isOnline) {
            get().addToOfflineQueue({
              type: 'DELETE_TASK',
              payload: { taskId }
            })
          }
        },

        setCategories: (categories) => set({ categories }),
        
        setOnlineStatus: (isOnline) => {
          set({ isOnline })
          if (isOnline) {
            get().processOfflineQueue()
          }
        },

        addToOfflineQueue: (action) => {
          const { offlineQueue } = get()
          const newAction = {
            ...action,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
          }
          set({ offlineQueue: [...offlineQueue, newAction] })
        },

        clearOfflineQueue: () => set({ offlineQueue: [] }),

        processOfflineQueue: async () => {
          const { offlineQueue, clearOfflineQueue } = get()
          if (offlineQueue.length === 0) return

          try {
            // Process each action in the queue
            for (const action of offlineQueue) {
              await processOfflineAction(action)
            }
            clearOfflineQueue()
            set({ lastSync: Date.now() })
          } catch (error) {
            console.error('Error processing offline queue:', error)
          }
        }
      }
    },
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        categories: state.categories,
        offlineQueue: state.offlineQueue,
        lastSync: state.lastSync
      })
    }
  )
)

// Helper function to process offline actions
async function processOfflineAction(action: any) {
  const { taskService } = await import('@/services/taskService')
  
  switch (action.type) {
    case 'CREATE_TASK':
      await taskService.createTask(action.payload)
      break
    case 'UPDATE_TASK':
      await taskService.updateTask(action.payload.taskId, action.payload.updates)
      break
    case 'DELETE_TASK':
      await taskService.deleteTask(action.payload.taskId)
      break
    default:
      console.warn('Unknown action type:', action.type)
  }
}
//components/TaskCategories.tsx
"use client"

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { taskService, Category } from '@/services/taskService'

interface TaskCategoriesProps {
  selectedCategory: string | null
  onCategorySelect: (categoryId: string | null) => void
}

export default function TaskCategories({ selectedCategory, onCategorySelect }: TaskCategoriesProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (user) {
      loadCategories()
    }
  }, [user])

  const loadCategories = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const result = await taskService.getCategories(user.id)
      
      if (result.error) {
        setError(result.error)
        setCategories([]) // Ensure it's always an array
      } else {
        setCategories(result.data || []) // Handle case where data might be null
        setError('')
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      setError('Failed to load categories')
      setCategories([]) // Ensure it's always an array
    } finally {
      setIsLoading(false)
    }
  }

  const addCategory = async () => {
    if (!user || !newCategoryName.trim()) {
      setError('Please enter a category name')
      return
    }
    
    setError('')
    try {
      const result = await taskService.createCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        user_id: user.id
      })
      
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setCategories(prev => [...prev, result.data!])
        setNewCategoryName('')
        setNewCategoryColor('#3b82f6')
        setIsAdding(false)
      }
    } catch (error) {
      console.error('Error adding category:', error)
      setError('Failed to create category')
    }
  }

  const deleteCategory = async (categoryId: string) => {
    if (!user) return
    
    try {
      const success = await taskService.deleteCategory(categoryId)
      if (success) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryId))
        if (selectedCategory === categoryId) {
          onCategorySelect(null)
        }
      } else {
        setError('Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setError('Failed to delete category')
    }
  }

  const categoryColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'
  ]

  const containerStyle = {
    marginBottom: '24px'
  }

  const titleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const categoriesStyle = {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginBottom: '12px'
  }

  const categoryStyle = (category: Category, isSelected: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: isSelected ? category.color : 'transparent',
    color: isSelected ? 'white' : theme === 'dark' ? '#d1d5db' : '#4b5563',
    border: `1px solid ${category.color}`,
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    opacity: isSelected ? 1 : 0.8,
    transition: 'all 0.2s ease'
  })

  const addButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    border: `1px dashed ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`,
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px'
  }

  const formStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    padding: '16px',
    backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
    borderRadius: '12px',
    marginTop: '12px'
  }

  const inputStyle = {
    padding: '8px 12px',
    border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`,
    borderRadius: '8px',
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    fontSize: '14px'
  }

  const colorOptionsStyle = {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const
  }

  const colorOptionStyle = (color: string, isSelected: boolean) => ({
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: color,
    cursor: 'pointer',
    border: isSelected ? '2px solid white' : 'none',
    boxShadow: isSelected ? '0 0 0 2px #3b82f6' : 'none'
  })

  const buttonGroupStyle = {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  }

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  }

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>Categories</div>
        <div style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>Loading categories...</div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Categories</div>
      
      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: '14px',
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#fef2f2',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      <div style={categoriesStyle}>
        <div 
          style={categoryStyle({ id: 'all', name: 'All', color: '#6b7280', user_id: '', created_at: '' } as Category, selectedCategory === null)}
          onClick={() => onCategorySelect(null)}
        >
          <span>All Tasks</span>
        </div>
        
        {/* SAFE RENDER: Always ensure categories is an array */}
        {(categories || []).map(category => (
          <div 
            key={category.id}
            style={categoryStyle(category, selectedCategory === category.id)}
            onClick={() => onCategorySelect(category.id)}
          >
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: category.color
            }} />
            <span>{category.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteCategory(category.id)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                opacity: 0.7,
                fontSize: '12px',
                marginLeft: '4px'
              }}
              title="Delete category"
            >
              ×
            </button>
          </div>
        ))}
        
        {!isAdding ? (
          <button 
            style={addButtonStyle}
            onClick={() => setIsAdding(true)}
          >
            + Add Category
          </button>
        ) : null}
      </div>

      {isAdding && (
        <div style={formStyle}>
          <input
            type="text"
            placeholder="Category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            style={inputStyle}
            autoFocus
          />
          
          <div>
            <div style={{ fontSize: '14px', marginBottom: '8px', color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>
              Choose a color:
            </div>
            <div style={colorOptionsStyle}>
              {categoryColors.map(color => (
                <div
                  key={color}
                  style={colorOptionStyle(color, newCategoryColor === color)}
                  onClick={() => setNewCategoryColor(color)}
                />
              ))}
            </div>
          </div>
          
          <div style={buttonGroupStyle}>
            <button
              onClick={() => {
                setIsAdding(false)
                setError('')
              }}
              style={{
                ...buttonStyle,
                backgroundColor: 'transparent',
                color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`
              }}
            >
              Cancel
            </button>
            <button
              onClick={addCategory}
              disabled={!newCategoryName.trim()}
              style={{
                ...buttonStyle,
                backgroundColor: '#3b82f6',
                color: 'white',
                opacity: !newCategoryName.trim() ? 0.5 : 1
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
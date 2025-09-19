"use client"

import { useState } from 'react'

export default function TestAPIPage() {
  const [status, setStatus] = useState('Click to list available models')
  const [models, setModels] = useState<any[]>([])
  const [error, setError] = useState<string>('')

  const listModels = async () => {
    setStatus('Fetching available models...')
    
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBN_-DBQzUOVAJ32BpgfJSLFfm0fB_DfIQ')
      
      if (response.ok) {
        const data = await response.json()
        setStatus(`✅ Found ${data.models?.length || 0} models`)
        setModels(data.models || [])
        setError('')
      } else {
        const errorData = await response.json()
        setStatus('❌ Failed to list models')
        setError(JSON.stringify(errorData, null, 2))
      }
    } catch (error) {
      setStatus('❌ Network error')
      setError(error.message)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>API Model List</h1>
      <button onClick={listModels} style={{ padding: '10px', marginBottom: '20px' }}>
        List Available Models
      </button>
      
      <div style={{ padding: '10px', backgroundColor: '#f5f5f5', marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
      </div>
      
      {error && (
        <div style={{ padding: '10px', backgroundColor: '#ffebee', marginBottom: '20px' }}>
          <h3>Error:</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {error}
          </pre>
        </div>
      )}
      
      {models.length > 0 && (
        <div>
          <h3>Available Models:</h3>
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {models.map((model, index) => (
              <div key={index} style={{ 
                padding: '10px', 
                margin: '5px', 
                backgroundColor: '#e8f5e8',
                border: '1px solid #ccc'
              }}>
                <strong>Name:</strong> {model.name}<br />
                <strong>Display Name:</strong> {model.displayName}<br />
                <strong>Supported Methods:</strong> {model.supportedGenerationMethods?.join(', ')}<br />
                <strong>Description:</strong> {model.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
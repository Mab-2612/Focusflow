// app/api/voice-command/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/serverSSR'

// Initialize the Gemini AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

export async function POST(request: Request) {
  const { message, user_id } = await request.json()

  if (!user_id || !message) {
    return new Response(JSON.stringify({ error: 'Missing user_id or message' }), { status: 400 })
  }

  const supabase = createClient()

  try {
    // 1. Save the user's message to the database
    const { error: userError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user_id,
        role: 'user',
        content: message
      })

    if (userError) {
      console.error('Error saving user message:', userError)
      return new Response(JSON.stringify({ error: userError.message }), { status: 500 })
    }

    // 2. Get the response from Gemini
    const chat = model.startChat()
    const result = await chat.sendMessage(message)
    const response = result.response
    const text = response.text()

    // 3. Save the assistant's response to the database
    const { error: assistantError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user_id,
        role: 'assistant',
        content: text
      })
      
    if (assistantError) {
      console.error('Error saving assistant message:', assistantError)
      // Note: We still return the response to the user even if saving fails
    }

    // 4. Return the response to the client for TTS
    return new Response(JSON.stringify({ response: text }), { status: 200 })

  } catch (error) {
    console.error('Error in voice-command route:', error)
    return new Response(JSON.stringify({ error: 'Failed to process command' }), { status: 500 })
  }
}
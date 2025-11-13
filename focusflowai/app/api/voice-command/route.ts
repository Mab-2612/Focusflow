// app/api/voice-command/route.ts
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'

// --- REMOVE THIS LINE ---
// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

interface ApiHistoryItem {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export async function POST(request: Request) {
  // 1. GET THE API KEY *INSIDE* THE HANDLER
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY is not set.');
    return Response.json({ 
      error: 'AI service is not configured.',
      details: 'GEMINI_API_KEY is missing.'
    }, { status: 500 });
  }

  // 2. INITIALIZE THE CLIENT *INSIDE* THE HANDLER
  const ai = new GoogleGenAI({ apiKey });

  try {
    const { message, history, user_id, timezone } = (await request.json()) as {
      message: string;
      history: ApiHistoryItem[];
      user_id: string;
      timezone: string;
    };

    if (!user_id || !message) {
      return Response.json({ error: 'Missing user_id or message' }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user_id)) {
      return Response.json({ error: 'Invalid user_id format' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // 1. Save user message (don't wait)
    supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: user_id,
        role: 'user',
        content: message
      })
      .then(({ error }) => {
        if (error) console.error('Error saving user message:', error)
      });

    // 2. Get response from Gemini AI
    const now = new Date();
    const systemPrompt = `You are a helpful assistant. The user is in the ${timezone || 'UTC'} timezone. The current date and time is: ${now.toLocaleString("en-US", { timeZone: timezone || 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}. Answer all time/date-related questions based on this information. Format responses with markdown (bold, italics, lists).`;
    
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Understood. I'll be aware of the user's time and date." }] },
        ...history, 
        { role: 'user', parts: [{ text: message }] }
      ]
    })

    const text = geminiResponse.text

    // 3. Save assistant response (don't wait)
    supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: user_id,
        role: 'assistant',
        content: text
      })
      .then(({ error: assistantError }) => {
        if (assistantError) {
          console.error('Error saving assistant message:', assistantError)
        }
      })

    // 4. Return the response immediately
    return Response.json({ response: text }, { status: 200 })

  } catch (error: any) {
    console.error('Error in voice-command route:', error)
    return Response.json({ 
      error: 'Failed to process command',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
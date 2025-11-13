// app/api/gemini/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai'; // Use your preferred package

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // FIXED: The 'contents' format was wrong
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Your preferred model
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ error: 'Failed to generate subtasks' }, { status: 500 });
  }
}
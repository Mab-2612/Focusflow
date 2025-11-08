// app/api/voice-command/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const getGeminiResponse = async (genAI: any, prompt: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to get response from AI');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { command, userId } = await request.json();

    if (!command || !userId) {
      return NextResponse.json({ error: 'Missing command or userId' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Gracefully handle missing or empty API key by sending a specific, successful response
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
      console.warn('Gemini API key is not configured. AI features are disabled.');
      return NextResponse.json({ 
        response: "The advanced AI features are currently unavailable because an API key has not been configured. Basic commands like 'time' and 'date' will still work.",
        success: true, // Send a success status so the client doesn't throw an error
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    const prompt = `You are a helpful and concise productivity assistant. The user said: "${command}". Respond helpfully. Do not use emojis or markdown.`;

    const responseText = await getGeminiResponse(genAI, prompt);
    
    return NextResponse.json({ 
      response: responseText.trim(),
      success: true,
    });

  } catch (error) {
    console.error('Voice command API error:', error);
    return NextResponse.json({ 
      response: "I'm experiencing some technical difficulties. Please try again.",
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
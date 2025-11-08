// app/api/gemini/route.ts

export const runtime = "nodejs"

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return NextResponse.json({ text: response.text() });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ error: 'Failed to generate subtasks' }, { status: 500 });
  }
}
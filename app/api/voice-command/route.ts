// app/api/voice-command/route.ts - UPDATED WITH CONTEXT-AWARE "ANOTHER ONE"
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getGeminiResponse = async (genAI: any, prompt: string) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// Track conversation context
let conversationContext: any = {};

export async function POST(request: NextRequest) {
  try {
    const { command, userId, context = {} } = await request.json();

    if (!command || !userId) {
      return NextResponse.json({ error: 'Missing command or userId' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const now = new Date();
    const currentTime = now.toLocaleTimeString();
    const currentDate = now.toLocaleDateString();

    const lowerCommand = command.toLowerCase();
    
    // Update global conversation context
    conversationContext = {
      ...conversationContext,
      ...context,
      lastCommand: command,
      timestamp: now.toISOString()
    };

    // Handle "another one" contextually
    if (lowerCommand.includes('another one') || 
        lowerCommand.includes('more') || 
        lowerCommand.includes('again')) {
      
      // Determine what "another one" refers to based on context
      const lastTopic = conversationContext.lastTopic || 'general';
      const lastResponse = conversationContext.lastResponse || '';
      
      if (lastTopic === 'quote' || lastResponse.includes('quote') || lastResponse.includes('motivational')) {
        // Continue with quotes
        const quotePrompt = `
          Provide another motivational or inspirational quote. Make it different from previous ones.
          
          PREVIOUS QUOTE: "${lastResponse}"
          
          Generate a new motivational quote:
        `;
        const response = await getGeminiResponse(genAI, quotePrompt);
        
        return NextResponse.json({ 
          response: response.trim(),
          success: true,
          context: {
            ...conversationContext,
            lastTopic: 'quote',
            lastResponse: response.substring(0, 100) + '...'
          }
        });
      }
      else if (lastTopic === 'joke' || lastResponse.includes('joke') || lastResponse.includes('funny')) {
        // Continue with jokes
        const jokePrompt = `
          Provide another funny joke. Make it different from previous ones.
          
          PREVIOUS JOKE: "${lastResponse}"
          
          Generate a new joke:
        `;
        const response = await getGeminiResponse(genAI, jokePrompt);
        
        return NextResponse.json({ 
          response: response.trim(),
          success: true,
          context: {
            ...conversationContext,
            lastTopic: 'joke',
            lastResponse: response.substring(0, 100) + '...'
          }
        });
      }
      // Add more context types as needed...
    }

    // Regular command processing
    const fullConversation = context.fullConversation || [];
    const conversationHistory = fullConversation.map((item: any) => 
      `${item.type === 'user' ? 'User' : 'Assistant'}: ${item.message}`
    ).join('\n');

    const prompt = `
      You are FocusFlow AI. Today is ${currentDate}, current time is ${currentTime}.

      CONVERSATION HISTORY:
      ${conversationHistory || 'No previous conversation'}

      CURRENT USER COMMAND: "${command}"

      CONTEXT:
      - Last topic: ${conversationContext.lastTopic || 'none'}
      - Previous response: ${conversationContext.lastResponse ? conversationContext.lastResponse.substring(0, 50) + '...' : 'none'}

      RESPONSE GUIDELINES:
      1. Maintain conversation context and continuity
      2. If user says "another one" or "more", continue the current topic
      3. Be consistent with earlier responses
      4. If user refers to something from earlier, acknowledge it
      5. Keep natural flow based on conversation history
      6. NO EMOJIS, NO MARKDOWN

      Generate a contextual, continuous response:
    `;

    const responseText = await getGeminiResponse(genAI, prompt);
    
    // Update what type of content this is for future reference
    let detectedTopic = 'general';
    if (responseText.includes('quote') || responseText.includes('motiv') || responseText.includes('inspire')) {
      detectedTopic = 'quote';
    } else if (responseText.includes('joke') || responseText.includes('funny') || responseText.includes('laugh')) {
      detectedTopic = 'joke';
    }

    return NextResponse.json({ 
      response: responseText.trim(),
      success: true,
      context: {
        ...conversationContext,
        lastTopic: detectedTopic,
        lastResponse: responseText.substring(0, 100) + '...',
        lastCommand: command
      }
    });

  } catch (error) {
    console.error('Voice command API error:', error);
    
    return NextResponse.json({ 
      response: "I'm experiencing some technical difficulties. Please try again.",
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
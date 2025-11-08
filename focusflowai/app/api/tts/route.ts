// app/api/tts/route.ts - ENHANCED RELIABILITY

export const runtime = "nodejs"

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VOICE_PROFILES = {
  default: { name: 'en-US-Neural2-J', rate: 1.0, pitch: 0.0 },
  excited: { name: 'en-US-Neural2-I', rate: 1.1, pitch: 2.0 },
  calm: { name: 'en-US-Neural2-A', rate: 0.9, pitch: -1.0 }
};

export async function POST(request: NextRequest) {
  try {
    const { text, emotion = 'default' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;
    
    if (!GOOGLE_CLOUD_API_KEY) {
      return NextResponse.json({ 
        error: 'Google Cloud TTS API key not configured',
        fallback: false // No fallback
      }, { status: 500 });
    }

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`;
    const voiceProfile = VOICE_PROFILES[emotion as keyof typeof VOICE_PROFILES] || VOICE_PROFILES.default;

    // Clean text for better speech
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .trim();

    const requestBody = {
      input: { 
        ssml: `
          <speak>
            <prosody rate="${voiceProfile.rate}" pitch="${voiceProfile.pitch}st">
              ${cleanText}
            </prosody>
          </speak>
        `
      },
      voice: {
        languageCode: 'en-US',
        name: voiceProfile.name,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: voiceProfile.rate,
        pitch: voiceProfile.pitch,
        volumeGainDb: 2.0,
        effectsProfileId: ['medium-bluetooth-speaker-class-device']
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google TTS API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.audioContent) {
      throw new Error('No audio content in response');
    }

    return NextResponse.json({
      success: true,
      audioContent: data.audioContent,
      voice: voiceProfile.name
    });

  } catch (error) {
    console.error('TTS API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: false // No fallback
    }, { status: 500 });
  }
}
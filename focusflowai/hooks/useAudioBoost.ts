// hooks/useAudioBoost.ts
"use client"

import { useRef, useEffect } from 'react'
import { Howler } from 'howler'

export const useAudioBoost = () => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)

  useEffect(() => {
    const setupAudioBoost = async () => {
      if (typeof window === 'undefined' || !Howler.ctx) return;

      try {
        const audioContext = Howler.ctx;
        audioContextRef.current = audioContext;

        // Create and configure the compressor
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
        compressor.knee.setValueAtTime(30, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);
        compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, audioContext.currentTime);
        compressorRef.current = compressor;

        // Disconnect Howler's master gain from the destination
        if (Howler.masterGain) {
            Howler.masterGain.disconnect();
            // Connect Howler's output to your compressor
            Howler.masterGain.connect(compressor);
        }

        // Connect your compressor to the final destination
        compressor.connect(audioContext.destination);

      } catch (error) {
        console.error('Audio boost setup failed:', error)
      }
    }

    setupAudioBoost();

    // Cleanup on unmount
    return () => {
        if (Howler.masterGain && compressorRef.current && audioContextRef.current) {
            try {
                // Disconnect the compressor and reconnect Howler's master gain directly to the destination
                Howler.masterGain.disconnect(compressorRef.current);
                Howler.masterGain.connect(audioContextRef.current.destination);
            } catch(e) {
                console.error("Error cleaning up audio boost", e)
            }
        }
    }
  }, []) // Empty dependency array ensures this runs only once

  // This hook no longer needs to export anything
  return {};
}
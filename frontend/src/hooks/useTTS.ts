import { useState, useCallback, useRef, useEffect } from 'react';
import api from '@/lib/api';

interface UseTTS {
    speak: (text: string) => void;
    cancel: () => void;
    isSpeaking: boolean;
}

export const useTTS = (): UseTTS => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const currentSpeakIdRef = useRef<number>(0);

    const cancel = useCallback(() => {
        currentSpeakIdRef.current += 1; // Invalidate any pending speak operations
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setIsSpeaking(false);
    }, []);

    const speak = useCallback(async (text: string) => {
        if (!text) return;

        // Stop current audio if playing
        cancel();
        
        const speakId = currentSpeakIdRef.current;

        try {
            const response = await api.post('/api/v1/tts/speak', { text }, {
                responseType: 'blob'
            });

            // If cancel was called or a new speak was initiated while we were fetching
            if (currentSpeakIdRef.current !== speakId) {
                return;
            }

            const blob = new Blob([response.data], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            audioRef.current = audio;

            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => {
                if (currentSpeakIdRef.current === speakId) {
                    setIsSpeaking(false);
                }
                URL.revokeObjectURL(url); // Cleanup
                if (audioRef.current === audio) {
                    audioRef.current = null;
                }
            };
            audio.onerror = (e) => {
                console.error("Audio playback error:", e);
                if (currentSpeakIdRef.current === speakId) {
                    setIsSpeaking(false);
                }
                URL.revokeObjectURL(url);
                if (audioRef.current === audio) {
                    audioRef.current = null;
                }
            };

            await audio.play();

        } catch (error) {
            console.error("TTS API Error:", error);
            if (currentSpeakIdRef.current === speakId) {
                setIsSpeaking(false);
            }
        }
    }, [cancel]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancel();
        };
    }, [cancel]);

    return { speak, cancel, isSpeaking };
};

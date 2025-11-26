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

    const cancel = useCallback(() => {
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

        try {
            const response = await api.post('/api/v1/tts/speak', { text }, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            audioRef.current = audio;

            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(url); // Cleanup
                audioRef.current = null;
            };
            audio.onerror = (e) => {
                console.error("Audio playback error:", e);
                setIsSpeaking(false);
                URL.revokeObjectURL(url);
                audioRef.current = null;
            };

            await audio.play();

        } catch (error) {
            console.error("TTS API Error:", error);
            setIsSpeaking(false);
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

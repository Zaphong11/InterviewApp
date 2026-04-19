import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, Send, Bot, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTTS } from '@/hooks/useTTS';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, ShieldAlert, CheckCircle2, Maximize } from 'lucide-react';

interface Question {
    question_text: string;
    user_answer?: string;
    ai_grade?: number;
    ai_feedback?: string;
}

interface Message {
    id: string;
    sender: 'ai' | 'user';
    text: string;
}

const InterviewRoom: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    
    // Anti-Cheat & Rules States
    const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const [isBanned, setIsBanned] = useState(false);

    // Timer states
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    const { speak, cancel } = useTTS();

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isProcessing]);

    // Sync transcript to input
    useEffect(() => {
        if (transcript) {
            setInputText(transcript);
        }
    }, [transcript]);

    // Auto-speak AI messages
    useEffect(() => {
        if (!hasAcceptedRules) return; // BUG FIX: Ngăn chặn đọc âm thanh khi chưa bấm "Tôi đã hiểu"

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.sender === 'ai') {
                speak(lastMessage.text);
            }
        }
    }, [messages, speak, hasAcceptedRules]);

    // Cleanup TTS on unmount
    useEffect(() => {
        return () => {
            cancel();
        };
    }, [cancel]);

    // Anti-Cheat Listeners
    useEffect(() => {
        if (!hasAcceptedRules || isFinished || isBanned) return;

        const handleViolation = () => {
            setViolationCount(prev => {
                const newCount = prev + 1;
                if (newCount >= 3) {
                    setIsBanned(true);
                    handleFinishPunished();
                } else {
                    toast.error(`CẢNH BÁO VI PHẠM (${newCount}/3): Bạn đã thoát khỏi màn hình làm bài hoặc bị che khuất!`, {
                        duration: 5000,
                    });
                }
                return newCount;
            });
        };

        const handleVisibilityChange = () => {
            if (document.hidden) handleViolation();
        };

        const handleBlur = () => {
            handleViolation();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block F12, PrintScreen, Ctrl+C, Ctrl+S
            if (e.key === 'F12' || e.key === 'PrintScreen' || (e.ctrlKey && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 's'))) {
                e.preventDefault();
                toast.error("Hành động bị cấm trong phòng thi!");
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            toast.error("Chuột phải đã bị khóa!");
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasAcceptedRules, isFinished, isBanned, violationCount]);

    const handleFinishPunished = async () => {
        if (isProcessing || isFinished) return;
        setIsProcessing(true);
        cancel();
        try {
            await api.post(`/api/v1/interviews/${id}/finish?is_banned=true`);
        } catch (error) {
            console.error("Silent error handled in punishment", error);
        } finally {
            setIsFinished(true);
            setIsProcessing(false);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(console.warn);
            }
        }
    };


    // Fetch Interview Details
    useEffect(() => {
        const fetchInterview = async () => {
            try {
                const response = await api.get(`/api/v1/interviews/${id}`);
                const data = response.data;
                const fetchedQuestions = data.content.questions || [];
                setQuestions(fetchedQuestions);
                
                if (data.status === "COMPLETED" || data.status === "GRADED") {
                    setIsFinished(true);
                    setHasAcceptedRules(true); // Bỏ qua màn Rules nếu đã hoàn thành
                    setIsLoading(false);
                    return;
                }

                // Get interview duration and calculate initial time left
                const duration = data.content.interview_duration;
                if (duration) {
                    setTimeLeft(duration * 60);
                }

                // Reconstruct history
                const history: Message[] = [];
                let lastAnsweredIndex = -1;

                for (let i = 0; i < fetchedQuestions.length; i++) {
                    const q = fetchedQuestions[i];

                    // Push Question
                    history.push({
                        id: `q-${i}`,
                        sender: 'ai',
                        text: q.question_text
                    });

                    // If answered, push Answer
                    if (q.user_answer) {
                        history.push({
                            id: `a-${i}`,
                            sender: 'user',
                            text: q.user_answer
                        });

                        lastAnsweredIndex = i;
                    } else {
                        // Stop at the first unanswered question
                        break;
                    }
                }

                setMessages(history);
                setCurrentQuestionIndex(lastAnsweredIndex + 1);

            } catch (error) {
                console.error("Error fetching interview:", error);
                toast.error("Không thể tải nội dung phỏng vấn");
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchInterview();
        }
    }, [id]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const answerText = inputText;
        setInputText('');
        resetTranscript();

        // Add User Message immediately
        const userMsgId = `temp-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: userMsgId,
            sender: 'user',
            text: answerText
        }]);

        // Call API in background (don't wait for grading)
        try {
            await api.post(`/api/v1/interviews/${id}/submit`, {
                question_id: currentQuestionIndex,
                answer_text: answerText
            });
        } catch (error) {
            console.error("Error submitting answer:", error);
            toast.error("Lỗi khi lưu câu trả lời (nhưng bạn cứ tiếp tục)");
        }

        // Move to next question immediately
        const nextQIndex = currentQuestionIndex + 1;
        if (nextQIndex < questions.length) {
            setCurrentQuestionIndex(nextQIndex);
            const nextQ = questions[nextQIndex];

            // Small delay for natural feel
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: `q-${nextQIndex}`,
                    sender: 'ai',
                    text: nextQ.question_text
                }]);
            }, 500);
        } else {
            // Finished all questions - Auto Finish
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: 'finish-wait',
                    sender: 'ai',
                    text: "Cảm ơn bạn. Đợi tôi tổng hợp kết quả..."
                }]);
                handleFinish();
            }, 500);
        }
    };

    const handleFinish = async () => {
        if (isProcessing || isFinished || isBanned) return;
        setIsProcessing(true); 
        cancel(); // Stop any audio
        
        // Khóa màn hình NGAY LẬP TỨC để phản hồi ứng viên
        setIsFinished(true);
        setHasAcceptedRules(true);
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(console.warn);
        }

        try {
            // Xử lý nộp bài cho LLM ngầm ở background
            await api.post(`/api/v1/interviews/${id}/finish`);
        } catch (error) {
            console.error("Graceful error parsing finish call", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = () => {
        cancel(); // Stop AI speaking immediately
        if (listening) {
            SpeechRecognition.stopListening();
        } else {
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true, language: 'vi-VN' });
        }
    };

    // Timer logic
    useEffect(() => {
        if (timeLeft === null || isFinished || isProcessing) return;

        if (timeLeft <= 0) {
            toast.error("Đã hết thời gian phỏng vấn! Tự động nộp bài.");
            handleFinish();
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft, isFinished, isProcessing]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Đang tải...</div>;
    }

    if (!browserSupportsSpeechRecognition) {
        return <span>Browser doesn't support speech recognition.</span>;
    }



    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAcceptRules = async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.warn("Fullscreen API failed", e);
            toast.warning("Không thể tự động bật Toàn màn hình. Vui lòng ấn F11.");
        }
        setHasAcceptedRules(true);
    };

    // --- OVERLAY RENDERERS ---

    if (!hasAcceptedRules) {
        return (
            <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-4">
                <div className="bg-white max-w-2xl w-full p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
                    <ShieldAlert className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">Quy Chế Phòng Thi Kỹ Thuật Số</h1>
                    <div className="text-left text-gray-600 space-y-4 bg-yellow-50 p-6 rounded-xl border border-yellow-100 mb-8">
                        <p className="font-semibold text-gray-800">Bạn chuẩn bị tham gia bài phỏng vấn với AI. Vui lòng tuân thủ tuyệt đối các quy định sau:</p>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Bài thi sẽ mở ở chế độ <strong>Toàn Màn Hình (Fullscreen)</strong>.</li>
                            <li><strong>CẤM</strong> chuyển sang thẻ (tab) khác hoặc thu nhỏ trình duyệt.</li>
                            <li><strong>CẤM</strong> chụp ảnh màn hình, sử dụng phím tắt hoặc mở Menu chuột phải.</li>
                            <li>Hãy tắt các ứng dụng có thể nhảy thông báo (Zalo, Messenger...) vì điều đó sẽ tính là rời khỏi phòng thi.</li>
                        </ul>
                        <p className="text-red-600 font-bold mt-4">
                            LƯU Ý: Nếu vi phạm quá 3 lần, hệ thống sẽ LẬP TỨC Thu Bài và đánh Điểm 0!
                        </p>
                    </div>
                    <Button onClick={handleAcceptRules} size="lg" className="w-full text-lg h-14 bg-blue-600 hover:bg-blue-700">
                        <Maximize className="w-5 h-5 mr-2" />
                        Tôi Đã Hiểu & Bắt Đầu Phỏng Vấn
                    </Button>
                </div>
            </div>
        );
    }

    if (isFinished || isBanned) {
        return (
            <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-4">
                <div className="bg-white max-w-lg w-full p-10 rounded-3xl shadow-2xl border text-center relative overflow-hidden">
                    <div className={cn(
                        "absolute top-0 left-0 w-full h-2",
                        isBanned ? "bg-red-500" : "bg-green-500"
                    )}></div>
                    
                    {isBanned ? (
                        <>
                            <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                            <h2 className="text-3xl font-bold text-gray-800 mb-4">HỦY BÀI THI</h2>
                            <p className="text-gray-600 text-lg mb-8">
                                Bạn đã vi phạm quy chế quá 3 lần (chuyển tap, tắt trình duyệt, thoát màn hình). <br/><br/>
                                Bài thi đã bị hủy và đánh 0 điểm.
                            </p>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
                            <h2 className="text-3xl font-bold text-gray-800 mb-4">Hoàn Tất Phỏng Vấn</h2>
                            <p className="text-gray-600 text-lg mb-8">
                                Bạn đã kết thúc lượt thi thành công. Thông tin đã được ghi nhận bảo mật. <br/><br/>
                                Kết quả chấm điểm vòng này sẽ được thông báo sớm trên bảng điều khiển.
                            </p>
                        </>
                    )}

                    <Button 
                        size="lg" 
                        onClick={() => navigate('/candidate-dashboard')} 
                        className={cn(
                            "w-full text-lg h-14",
                            isBanned ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                        )}
                    >
                        Quay Về Bảng Điều Khiển
                    </Button>
                </div>
            </div>
        );
    }

    // --- MAIN ROOM RENDERER ---
    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-800">Phỏng vấn AI</h1>
                    <p className="text-sm text-gray-500">Job ID: {id}</p>
                </div>
                
                {/* Timer Display */}
                {timeLeft !== null && !isFinished && (
                    <div className="flex-1 flex justify-center">
                        <div className={cn(
                            "font-mono text-2xl font-bold px-6 py-2 rounded-full border shadow-sm transition-colors",
                            timeLeft <= 60 
                                ? "bg-red-100 text-red-600 border-red-200 animate-pulse" 
                                : "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                )}
                
                <div className="flex-1 flex justify-end items-center gap-4">
                    {violationCount > 0 && (
                        <div className="flex items-center text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            <span className="text-sm font-semibold">Vi phạm {violationCount}/3</span>
                        </div>
                    )}
                    <Button variant="destructive" onClick={handleFinish}>
                        Kết thúc
                    </Button>
                </div>
            </header>

            {/* Chat History */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex w-full",
                            msg.sender === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        <div className={cn(
                            "flex max-w-[80%] md:max-w-[70%]",
                            msg.sender === 'user' ? "flex-row-reverse" : "flex-row"
                        )}>
                            {/* Avatar */}
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                msg.sender === 'user' ? "bg-blue-100 ml-3" : "bg-green-100 mr-3"
                            )}>
                                {msg.sender === 'user' ? <UserIcon className="w-6 h-6 text-blue-600" /> : <Bot className="w-6 h-6 text-green-600" />}
                            </div>

                            {/* Message Content */}
                            <div className="flex flex-col">
                                <div className={cn(
                                    "p-4 rounded-2xl shadow-sm text-base",
                                    msg.sender === 'user'
                                        ? "bg-blue-600 text-white rounded-tr-none"
                                        : "bg-white text-gray-800 border rounded-tl-none"
                                )}>
                                    <div className="prose prose-sm max-w-none">
                                        <ReactMarkdown>
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

        {/* Return Button handled by Overlay already */}

                <div ref={messagesEndRef} />
            </main>

            {/* Input Area */}
            <footer className="bg-white border-t p-4">
                <div className="max-w-4xl mx-auto flex items-end gap-3">
                    <Button
                        type="button"
                        variant={listening ? "destructive" : "secondary"}
                        size="icon"
                        className={cn("rounded-full w-12 h-12 shrink-0", listening && "animate-pulse")}
                        onClick={toggleListening}
                    >
                        <Mic className="w-5 h-5" />
                    </Button>

                    <div className="flex-1 relative">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Nhập câu trả lời hoặc bấm micro để nói..."
                            className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-h-32 min-h-[50px]"
                            rows={1}
                        />
                    </div>

                    <Button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isProcessing || currentQuestionIndex >= questions.length || isFinished || (timeLeft !== null && timeLeft <= 0)}
                        className="rounded-full w-12 h-12 shrink-0"
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </div>
                <div className="text-center mt-2 text-xs text-gray-400">
                    {listening ? "Đang nghe... (Nói xong bấm lại nút Micro để dừng)" : "Bấm nút Micro để bắt đầu nói"}
                    {timeLeft !== null && " | Lưu ý: Bài sẽ tự động nộp khi hết giờ"}
                </div>
            </footer>
        </div>
    );
};

export default InterviewRoom;

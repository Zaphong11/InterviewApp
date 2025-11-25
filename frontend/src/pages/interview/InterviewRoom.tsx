import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

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
    score?: number;
    feedback?: string;
    isFeedback?: boolean;
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

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

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

    // Fetch Interview Details
    useEffect(() => {
        const fetchInterview = async () => {
            try {
                const response = await api.get(`/api/v1/interviews/${id}`);
                const data = response.data;
                const fetchedQuestions = data.content.questions || [];
                setQuestions(fetchedQuestions);

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

                    // If answered, push Answer and Feedback
                    if (q.user_answer) {
                        history.push({
                            id: `a-${i}`,
                            sender: 'user',
                            text: q.user_answer
                        });

                        // Push Feedback as separate AI message
                        if (q.ai_feedback) {
                            history.push({
                                id: `f-${i}`,
                                sender: 'ai',
                                text: `Điểm số: ${q.ai_grade}/10\n\n${q.ai_feedback}`,
                                isFeedback: true
                            });
                        }

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

        setIsProcessing(true);

        try {
            const response = await api.post(`/api/v1/interviews/${id}/submit`, {
                question_id: currentQuestionIndex,
                answer_text: answerText
            });

            const { score, feedback, next_question_id } = response.data;

            // Add Feedback Message
            setMessages(prev => [...prev, {
                id: `f-${currentQuestionIndex}`,
                sender: 'ai',
                text: `Điểm số: ${score}/10\n\n${feedback}`,
                isFeedback: true
            }]);

            // Handle Next Question
            if (next_question_id !== null) {
                setCurrentQuestionIndex(next_question_id);
                setTimeout(() => {
                    const nextQ = questions[next_question_id];
                    setMessages(prev => [...prev, {
                        id: `q-${next_question_id}`,
                        sender: 'ai',
                        text: nextQ.question_text
                    }]);
                }, 1000);
            } else {
                // Finished
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: 'finish',
                        sender: 'ai',
                        text: "Chúc mừng bạn đã hoàn thành buổi phỏng vấn! Bạn có thể xem kết quả tổng hợp ngay bây giờ."
                    }]);
                }, 1000);
            }

        } catch (error) {
            console.error("Error submitting answer:", error);
            toast.error("Lỗi khi gửi câu trả lời");
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = () => {
        if (listening) {
            SpeechRecognition.stopListening();
        } else {
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true, language: 'vi-VN' });
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Đang tải...</div>;
    }

    if (!browserSupportsSpeechRecognition) {
        return <span>Browser doesn't support speech recognition.</span>;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Phỏng vấn AI</h1>
                    <p className="text-sm text-gray-500">Job ID: {id}</p>
                </div>
                <Button variant="destructive" onClick={() => navigate('/my-interviews')}>
                    Kết thúc
                </Button>
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
                                    {msg.text}
                                </div>

                                {/* Feedback & Score (Only for User messages) */}
                                {msg.score !== undefined && (
                                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 animate-in fade-in slide-in-from-top-2">
                                        <div className="font-bold mb-1">Điểm số: {msg.score}/10</div>
                                        <div>{msg.feedback}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isProcessing && (
                    <div className="flex justify-start w-full">
                        <div className="flex flex-row items-center ml-14 space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            <span className="text-sm text-gray-500 italic">AI đang chấm điểm...</span>
                        </div>
                    </div>
                )}
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
                        disabled={!inputText.trim() || isProcessing}
                        className="rounded-full w-12 h-12 shrink-0"
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </div>
                <div className="text-center mt-2 text-xs text-gray-400">
                    {listening ? "Đang nghe... (Nói xong bấm lại nút Micro để dừng)" : "Bấm nút Micro để bắt đầu nói"}
                </div>
            </footer>
        </div>
    );
};

export default InterviewRoom;

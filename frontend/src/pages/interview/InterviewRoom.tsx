import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTTS } from '@/hooks/useTTS';
import ReactMarkdown from 'react-markdown';

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
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.sender === 'ai') {
                speak(lastMessage.text);
            }
        }
    }, [messages, speak]);

    // Cleanup TTS on unmount
    useEffect(() => {
        return () => {
            cancel();
        };
    }, [cancel]);

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
        setIsProcessing(true); // Show loading overlay
        try {
            const response = await api.post(`/api/v1/interviews/${id}/finish`);
            const { summary } = response.data;

            setIsFinished(true);
            toast.success("Nộp bài thành công!");

            // Add Summary Message
            if (summary) {
                setMessages(prev => [...prev, {
                    id: 'summary',
                    sender: 'ai',
                    text: summary
                }]);
                // Speak the summary
                speak(summary);
            }

        } catch (error) {
            console.error("Error finishing interview:", error);
            toast.error("Lỗi khi nộp bài");
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
                <Button variant="destructive" onClick={() => navigate('/candidate-dashboard')}>
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

                {/* Back to Dashboard Button if finished */}
                {isFinished && (
                    <div className="flex justify-center py-4">
                        <Button
                            size="lg"
                            onClick={() => navigate('/candidate-dashboard')}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Quay về Dashboard
                        </Button>
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
                        disabled={!inputText.trim() || isProcessing || currentQuestionIndex >= questions.length || isFinished}
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

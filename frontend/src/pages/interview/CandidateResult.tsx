import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

interface Question {
    question_text: string;
    user_answer: string | null;
    ai_grade: number | null;
    ai_feedback: string | null;
}

interface InterviewDetail {
    id: number;
    job_id: number;
    status: string;
    total_score: number | null;
    ai_feedback: string | null;
    content: {
        questions: Question[];
    };
    created_at: string;
}

const CandidateResult: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [interview, setInterview] = useState<InterviewDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchInterviewDetail(id);
        }
    }, [id]);

    const fetchInterviewDetail = async (interviewId: string) => {
        setIsLoading(true);
        try {
            const response = await api.get(`/api/v1/interviews/${interviewId}`);
            setInterview(response.data);
        } catch (error: any) {
            console.error('Failed to fetch interview details:', error);
            if (error.response && error.response.status === 403) {
                toast.error('Bạn không có quyền xem kết quả này');
                navigate('/candidate-dashboard');
            } else {
                toast.error('Không thể tải chi tiết phỏng vấn');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'text-gray-500';
        if (score >= 8) return 'text-green-600';
        if (score >= 5) return 'text-yellow-600';
        return 'text-red-600';
    };



    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-screen">
                    Đang tải kết quả...
                </div>
            </DashboardLayout>
        );
    }

    if (!interview) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <h2 className="text-xl font-semibold">Không tìm thấy bài phỏng vấn</h2>
                    <Button onClick={() => navigate('/candidate-dashboard')}>
                        Quay về Dashboard
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="container mx-auto py-8 px-4 max-w-4xl">
                <Button
                    variant="ghost"
                    className="mb-6 pl-0 hover:pl-2 transition-all"
                    onClick={() => navigate('/candidate-dashboard')}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại Dashboard
                </Button>

                <div className="grid gap-6">
                    {/* Summary Card */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center justify-between">
                                <span>Kết quả Phỏng vấn</span>
                                {interview.total_score !== null && (
                                    <Badge className="text-lg px-4 py-1 bg-primary">
                                        {typeof interview.total_score === 'number' ? interview.total_score.toFixed(1) : '-'}/10
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Ngày thực hiện: {new Date(interview.created_at).toLocaleDateString('vi-VN')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg">Nhận xét chung của AI:</h3>
                                <div className="p-4 bg-background rounded-lg border text-muted-foreground italic">
                                    {interview.ai_feedback || "Chưa có nhận xét tổng quan."}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Questions List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Chi tiết câu trả lời</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {interview.content.questions.map((q, index) => (
                                    <AccordionItem key={index} value={`item-${index}`}>
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center text-left gap-3">
                                                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold text-sm">
                                                    {index + 1}
                                                </span>
                                                <span className="font-medium flex-grow">{q.question_text}</span>
                                                {q.ai_grade !== null && (
                                                    <span className={`font-bold ml-2 ${getScoreColor(q.ai_grade)}`}>
                                                        {q.ai_grade}/10
                                                    </span>
                                                )}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-4 pb-6 px-4 space-y-4">
                                            <div>
                                                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Câu trả lời của bạn:</h4>
                                                <div className="p-3 bg-muted/50 rounded-md text-sm">
                                                    {q.user_answer || <span className="text-muted-foreground italic">Không có câu trả lời</span>}
                                                </div>
                                            </div>

                                            {q.ai_feedback && (
                                                <div className="border-l-4 border-primary pl-4 py-1">
                                                    <h4 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4" />
                                                        Đánh giá chi tiết:
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {q.ai_feedback}
                                                    </p>
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CandidateResult;

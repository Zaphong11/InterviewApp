import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ArrowLeft, AlertCircle, FileText, Users } from 'lucide-react';

interface Criteria {
    keyword: string;
    score: number;
}

interface Question {
    question_text: string;
    user_answer: string | null;
    ai_grade: number | null;
    ai_feedback: string | null;
    criteria: Criteria[];
}

interface Interview {
    id: number;
    job_id: number;
    candidate_id: number;
    status: string;
    total_score: number | null;
    ai_feedback: string | null;
    content: {
        questions: Question[];
    };
}

const InterviewReport: React.FC = () => {
    const { interviewId } = useParams<{ interviewId: string }>();
    const navigate = useNavigate();
    const [interview, setInterview] = useState<Interview | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (interviewId) {
            fetchInterview(interviewId);
        }
    }, [interviewId]);

    const fetchInterview = async (id: string) => {
        setIsLoading(true);
        try {
            const response = await api.get(`/api/v1/interviews/${id}`);
            setInterview(response.data);
        } catch (error) {
            console.error('Failed to fetch interview:', error);
            toast.error('Không thể tải báo cáo phỏng vấn');
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
            <DashboardLayout sidebar={<div></div>}>
                <div className="flex items-center justify-center h-full">
                    <p>Đang tải báo cáo...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!interview) {
        return (
            <DashboardLayout sidebar={<div></div>}>
                <div className="flex items-center justify-center h-full">
                    <p>Không tìm thấy báo cáo.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            sidebar={
                <nav className="space-y-1">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full flex items-center px-6 py-3 text-left transition-colors text-gray-600 hover:bg-gray-50"
                    >
                        <Users className="w-5 h-5 mr-3" />
                        <span className="font-medium">Ứng viên</span>
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full flex items-center px-6 py-3 text-left transition-colors text-gray-600 hover:bg-gray-50"
                    >
                        <FileText className="w-5 h-5 mr-3" />
                        <span className="font-medium">Tin tuyển dụng</span>
                    </button>
                </nav>
            }
        >
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Báo cáo Phỏng vấn</h2>
                        <p className="text-muted-foreground">ID: {interview.id} - Status: {interview.status}</p>
                    </div>
                </div>

                {/* Overview Card */}
                <Card className="bg-gradient-to-br from-white to-gray-50 border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-semibold">Kết quả tổng quan</h3>
                                <p className="text-sm text-muted-foreground">Đánh giá bởi AI System</p>
                            </div>
                            <div className="text-center">
                                <span className="text-sm text-muted-foreground uppercase tracking-wider">Tổng điểm</span>
                                <div className={`text-4xl font-bold ${getScoreColor(interview.total_score)}`}>
                                    {interview.total_score !== null ? interview.total_score.toFixed(1) : '-'}
                                    <span className="text-lg text-gray-400 font-normal">/ {interview.content.questions.length * 10}</span>
                                </div>
                            </div>
                        </div>
                        {interview.ai_feedback && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-md text-blue-800 text-sm">
                                <p className="font-semibold mb-1 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Nhận xét chung:
                                </p>
                                {interview.ai_feedback}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Detailed Questions */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Chi tiết câu trả lời</h3>
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {interview.content.questions.map((q, index) => (
                            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4 bg-white shadow-sm">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-4 text-left">
                                        <span className="font-medium mr-4">
                                            Câu {index + 1}: {q.question_text}
                                        </span>
                                        <Badge variant={q.ai_grade && q.ai_grade >= 5 ? "default" : "destructive"} className={q.ai_grade && q.ai_grade >= 8 ? "bg-green-600" : ""}>
                                            {q.ai_grade !== null ? q.ai_grade : '-'} / 10
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4 space-y-4">
                                    {/* User Answer */}
                                    <div className="bg-gray-50 p-4 rounded-md border">
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Câu trả lời của ứng viên</p>
                                        <p className="text-gray-800 whitespace-pre-wrap">
                                            {q.user_answer || <span className="italic text-gray-400">Chưa trả lời</span>}
                                        </p>
                                    </div>

                                    {/* AI Feedback */}
                                    <div className="bg-yellow-50/50 p-4 rounded-md border border-yellow-100">
                                        <p className="text-xs font-semibold text-yellow-700 uppercase mb-2">Đánh giá chi tiết</p>
                                        <p className="text-gray-700 mb-3">{q.ai_feedback || "Chưa có đánh giá"}</p>

                                        {/* Criteria / Keywords */}
                                        {q.criteria && q.criteria.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {q.criteria.map((c, i) => (
                                                    <Badge key={i} variant="outline" className="bg-white">
                                                        {c.keyword} ({c.score})
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default InterviewReport;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InterviewHistory {
    id: number;
    job_title: string;
    created_at: string;
    status: string;
    total_score: number | null;
    decision: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

const CandidateDashboard: React.FC = () => {
    const [interviews, setInterviews] = useState<InterviewHistory[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            const response = await api.get('/api/v1/interviews/me');
            setInterviews(response.data);
        } catch (error) {
            console.error('Failed to fetch interviews:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
            case 'graded':
                return <Badge className="bg-green-500">Hoàn thành</Badge>;
            case 'in_progress':
                return <Badge className="bg-blue-500">Đang thực hiện</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getDecisionIcon = (decision: string) => {
        switch (decision) {
            case 'ACCEPTED':
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Chúc mừng! Bạn đã được nhận</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            case 'REJECTED':
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <XCircle className="w-6 h-6 text-red-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Rất tiếc, bạn chưa phù hợp</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            default:
                return (
                    <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="w-4 h-4 mr-1" />
                        Đang chờ duyệt
                    </div>
                );
        }
    };

    return (
        <DashboardLayout>
            <div className="container mx-auto py-8 px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard Ứng viên</h1>
                    <p className="text-muted-foreground">
                        Theo dõi lịch sử phỏng vấn của bạn.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Lịch sử phỏng vấn</CardTitle>
                        <CardDescription>
                            Danh sách các bài phỏng vấn bạn đã thực hiện.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {interviews.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Bạn chưa tham gia phỏng vấn nào.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Vị trí ứng tuyển</TableHead>
                                        <TableHead>Ngày thực hiện</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead>Điểm số</TableHead>
                                        <TableHead>Kết quả</TableHead>
                                        <TableHead className="text-right">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {interviews.map((interview) => (
                                        <TableRow key={interview.id}>
                                            <TableCell className="font-medium">{interview.job_title}</TableCell>
                                            <TableCell>
                                                {new Date(interview.created_at).toLocaleDateString('vi-VN')}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(interview.status)}</TableCell>
                                            <TableCell>
                                                {interview.total_score !== null ? (
                                                    <span className="font-bold text-primary">
                                                        {interview.total_score.toFixed(1)}/10
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getDecisionIcon(interview.decision)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => navigate(`/my-result/${interview.id}`)}
                                                    title="Xem kết quả"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default CandidateDashboard;

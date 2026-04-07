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
import { toast } from 'sonner';
interface ApplicationHistory {
    id: number;
    job_id: number;
    job_title: string;
    created_at: string;
    status: string;
    match_score: number | null;
    interview_decision?: string | null;
    interview_id?: number | null;
}
const CandidateDashboard: React.FC = () => {
    const [applications, setApplications] = useState<ApplicationHistory[]>([]);
    const navigate = useNavigate();
    useEffect(() => {
        fetchApplications();
    }, []);
    const fetchApplications = async () => {
        try {
            const response = await api.get('/api/v1/applications/me');
            setApplications(response.data);
        } catch (error) {
            console.error('Failed to fetch applications:', error);
            toast.error('Lỗi khi tải danh sách ứng tuyển');
        }
    };
    const handleStartInterview = async (jobId: number) => {
        try {
            const response = await api.post('/api/v1/interviews/start', { job_id: jobId });
            const interview = response.data;
            toast.success('Bắt đầu phỏng vấn thành công!');
            navigate(`/interview/${interview.id}/room`);
        } catch (error: any) {
            console.error('Failed to start interview:', error);
            toast.error('Không thể bắt đầu phỏng vấn. Vui lòng thử lại.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SCREENING':
                return <Badge variant="secondary">Đợi duyệt CV</Badge>;
            case 'AI_TEST':
                return <Badge className="bg-blue-500 text-white">Bài Test AI</Badge>;
            case 'INTERVIEW':
                return <Badge className="bg-purple-500 text-white">Phỏng vấn</Badge>;
            case 'OFFER':
                return <Badge className="bg-green-500 text-white">Đề nghị (Offer)</Badge>;
            case 'REJECTED':
                return <Badge className="bg-red-500 text-white">Từ chối</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getInterviewBadge = (decision?: string | null) => {
        if (!decision) return <span className="text-muted-foreground text-sm italic">Chưa có</span>;
        switch (decision) {
            case 'PENDING':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">Đang chờ chấm</Badge>;
            case 'ACCEPTED':
                return <Badge className="bg-green-500 text-white">Đạt</Badge>;
            case 'REJECTED':
                return <Badge className="bg-red-500 text-white">Không Đạt</Badge>;
            default:
                return <Badge variant="secondary">{decision}</Badge>;
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
                        {applications.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Bạn chưa nộp đơn ứng tuyển nào.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Vị trí ứng tuyển</TableHead>
                                        <TableHead>Ngày nộp</TableHead>
                                        <TableHead>Trạng thái ATS</TableHead>
                                        <TableHead>Kết quả Phỏng Vấn</TableHead>
                                        <TableHead className="text-right">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {applications.map((app) => (
                                        <TableRow key={app.id}>
                                            <TableCell className="font-medium">{app.job_title}</TableCell>
                                            <TableCell>{new Date(app.created_at).toLocaleDateString('vi-VN')}</TableCell>
                                            <TableCell>{getStatusBadge(app.status)}</TableCell>
                                            <TableCell>{getInterviewBadge(app.interview_decision)}</TableCell>
                                            <TableCell className="text-right">
                                                {app.status === 'AI_TEST' && !app.interview_id ? (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => handleStartInterview(app.job_id)}
                                                    >
                                                        Bắt đầu phỏng vấn
                                                    </Button>
                                                ) : app.interview_id ? (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="pointer-events-none opacity-50"
                                                    >
                                                        Đã làm bài
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Chưa có yêu cầu thi</span>
                                                )}
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

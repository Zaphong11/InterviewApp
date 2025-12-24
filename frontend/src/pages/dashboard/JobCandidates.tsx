import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ArrowLeft, Eye } from 'lucide-react';

interface Candidate {
    interview_id: number;
    candidate_name: string;
    candidate_email: string;
    status: string;
    total_score: number | null;
    created_at: string;
}

const JobCandidates: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (jobId) {
            fetchCandidates(jobId);
        }
    }, [jobId]);

    const fetchCandidates = async (id: string) => {
        setIsLoading(true);
        try {
            const response = await api.get(`/api/v1/jobs/${id}/candidates`);
            setCandidates(response.data);
        } catch (error) {
            console.error('Failed to fetch candidates:', error);
            toast.error('Không thể tải danh sách ứng viên');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="bg-green-500">Hoàn thành</Badge>;
            case 'in_progress':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Đang thực hiện</Badge>;
            case 'pending':
                return <Badge variant="outline">Chờ xử lý</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getScoreBadge = (score: number | null) => {
        if (score === null) return <span className="text-muted-foreground">-</span>;
        if (score >= 80) return <Badge className="bg-green-600">{score}</Badge>;
        if (score >= 50) return <Badge className="bg-yellow-500">{score}</Badge>;
        return <Badge className="bg-red-500">{score}</Badge>;
    };



    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Danh sách Ứng viên</h2>
                        <p className="text-muted-foreground">Job ID: {jobId}</p>
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tên Ứng viên</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Ngày nộp</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead>Điểm Tổng</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Đang tải...
                                    </TableCell>
                                </TableRow>
                            ) : candidates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Chưa có ứng viên nào.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                candidates.map((candidate) => (
                                    <TableRow key={candidate.interview_id}>
                                        <TableCell className="font-medium">{candidate.candidate_name}</TableCell>
                                        <TableCell>{candidate.candidate_email}</TableCell>
                                        <TableCell>
                                            {candidate.created_at
                                                ? new Date(candidate.created_at).toLocaleDateString('vi-VN')
                                                : '-'}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(candidate.status)}</TableCell>
                                        <TableCell>{getScoreBadge(candidate.total_score)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => navigate(`/interview-report/${candidate.interview_id}`)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Xem chi tiết
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default JobCandidates;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Briefcase, PlayCircle, User } from 'lucide-react';

interface Job {
    id: number;
    title: string;
    description: string;
    requirements: string;
    created_at: string;
}

const CandidateDashboard: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/v1/jobs/');
            setJobs(response.data);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
            toast.error('Không thể tải danh sách công việc');
        } finally {
            setIsLoading(false);
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
            if (error.response && error.response.status === 401) {
                toast.error('Vui lòng đăng nhập lại');
                navigate('/login');
            } else {
                toast.error('Không thể bắt đầu phỏng vấn. Vui lòng thử lại.');
            }
        }
    };

    const SidebarItem = ({
        label,
        icon: Icon
    }: {
        label: string,
        icon: any
    }) => (
        <button
            className="w-full flex items-center px-6 py-3 text-left transition-colors bg-primary/10 text-primary border-r-4 border-primary"
        >
            <Icon className="w-5 h-5 mr-3" />
            <span className="font-medium">{label}</span>
        </button>
    );

    return (
        <DashboardLayout
            sidebar={
                <nav className="space-y-1">
                    <SidebarItem label="Việc làm" icon={Briefcase} />
                    {/* Placeholder for future features */}
                    {/* <SidebarItem label="Hồ sơ" icon={User} /> */}
                </nav>
            }
        >
            <div className="container mx-auto py-8 px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Cơ hội việc làm</h1>
                    <p className="text-muted-foreground">
                        Khám phá các vị trí đang tuyển dụng và bắt đầu phỏng vấn ngay.
                    </p>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">Đang tải danh sách công việc...</div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Hiện chưa có công việc nào đang tuyển.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {jobs.map((job) => (
                            <Card key={job.id} className="flex flex-col h-full hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <CardTitle className="flex items-start justify-between">
                                        <span className="text-xl font-bold text-primary">{job.title}</span>
                                        <Briefcase className="w-5 h-5 text-muted-foreground" />
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {job.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <div className="text-sm text-muted-foreground mb-4">
                                        <span className="font-semibold text-foreground">Yêu cầu: </span>
                                        <span className="line-clamp-3">{job.requirements}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Đăng ngày: {new Date(job.created_at).toLocaleDateString('vi-VN')}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        className="w-full"
                                        onClick={() => handleStartInterview(job.id)}
                                    >
                                        <PlayCircle className="w-4 h-4 mr-2" />
                                        Phỏng vấn ngay
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default CandidateDashboard;

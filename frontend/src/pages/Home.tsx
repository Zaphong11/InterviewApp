import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Clock } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import api from '@/lib/api';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';

interface Job {
    id: number;
    title: string;
    description: string;
    requirements: string;
    created_at: string;
    candidate_count?: number;
}

const Home: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await api.get('/api/v1/jobs/');
                setJobs(response.data);
            } catch (error) {
                console.error('Failed to fetch jobs:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchJobs();
    }, []);

    const handleJobClick = (job: Job) => {
        setSelectedJob(job);
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Hero Section */}
                <div className="text-center space-y-4 py-12">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                        Tìm kiếm cơ hội nghề nghiệp
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Khám phá các vị trí hấp dẫn và tham gia phỏng vấn AI ngay lập tức.
                    </p>
                </div>

                {/* Jobs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            Đang tải danh sách việc làm...
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            Hiện chưa có tin tuyển dụng nào.
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <Card
                                key={job.id}
                                className="flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => handleJobClick(job)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                                            <CardDescription className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                {new Date(job.created_at).toLocaleDateString('vi-VN')}
                                            </CardDescription>
                                        </div>
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <Briefcase className="w-5 h-5 text-primary" />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                                        {job.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Full-time
                                        </span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Remote
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full">
                                        Xem chi tiết & Ứng tuyển
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                    )}
                </div>

                <JobDetailDialog
                    job={selectedJob}
                    isOpen={!!selectedJob}
                    onClose={() => setSelectedJob(null)}
                />
            </div>
        </DashboardLayout>
    );
};

export default Home;
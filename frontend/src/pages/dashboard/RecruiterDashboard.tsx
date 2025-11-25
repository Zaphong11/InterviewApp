import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Plus, FileText, Users } from 'lucide-react';

interface Job {
    id: number;
    title: string;
    created_at: string;
    description: string;
    requirements: string;
    // candidate_count is not yet in API, mocking for UI
    candidate_count?: number;
}

const RecruiterDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'jobs' | 'candidates'>('jobs');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [requirements, setRequirements] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    useEffect(() => {
        if (activeTab === 'jobs') {
            fetchJobs();
        }
    }, [activeTab]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                toast.error('Chỉ chấp nhận file PDF');
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !requirements) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }
        if (!file) {
            toast.error('Vui lòng upload kịch bản phỏng vấn (PDF)');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Create Job
            const jobData = { title, description, requirements };
            const jobResponse = await api.post('/api/v1/jobs/', jobData);
            const newJobId = jobResponse.data.id;

            // 2. Upload Script
            const formData = new FormData();
            formData.append('file', file);

            await api.post(`/api/v1/jobs/${newJobId}/upload-script`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            toast.success('Tạo tin tuyển dụng thành công!');
            setIsDialogOpen(false);

            // Reset form
            setTitle('');
            setDescription('');
            setRequirements('');
            setFile(null);

            // Reload jobs
            fetchJobs();

        } catch (error) {
            console.error('Error creating job:', error);
            toast.error('Có lỗi xảy ra khi tạo tin tuyển dụng');
        } finally {
            setIsSubmitting(false);
        }
    };

    const SidebarItem = ({
        id,
        label,
        icon: Icon
    }: {
        id: 'jobs' | 'candidates',
        label: string,
        icon: any
    }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === id
                    ? 'bg-primary/10 text-primary border-r-4 border-primary'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
        >
            <Icon className="w-5 h-5 mr-3" />
            <span className="font-medium">{label}</span>
        </button>
    );

    return (
        <DashboardLayout
            sidebar={
                <nav className="space-y-1">
                    <SidebarItem id="jobs" label="Tin tuyển dụng" icon={FileText} />
                    <SidebarItem id="candidates" label="Ứng viên" icon={Users} />
                </nav>
            }
        >
            {activeTab === 'jobs' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Tin tuyển dụng</h2>
                            <p className="text-muted-foreground">Quản lý các vị trí đang tuyển dụng</p>
                        </div>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tạo Tin Tuyển Dụng
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                    <DialogTitle>Tạo Tin Tuyển Dụng Mới</DialogTitle>
                                    <DialogDescription>
                                        Điền thông tin chi tiết và upload kịch bản phỏng vấn.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Tiêu đề công việc</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="VD: Senior React Developer"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Mô tả công việc</Label>
                                        <textarea
                                            id="description"
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Mô tả chi tiết..."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="requirements">Yêu cầu ứng viên</Label>
                                        <textarea
                                            id="requirements"
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={requirements}
                                            onChange={(e) => setRequirements(e.target.value)}
                                            placeholder="Các kỹ năng cần thiết..."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="script">Kịch bản phỏng vấn (PDF)</Label>
                                        <Input
                                            id="script"
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleFileChange}
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            File PDF chứa các câu hỏi và tiêu chí đánh giá cho AI.
                                        </p>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                            Hủy
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? 'Đang tạo...' : 'Tạo tin tuyển dụng'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tên Job</TableHead>
                                    <TableHead>Ngày tạo</TableHead>
                                    <TableHead>Số lượng ứng viên</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            Đang tải...
                                        </TableCell>
                                    </TableRow>
                                ) : jobs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            Chưa có tin tuyển dụng nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    jobs.map((job) => (
                                        <TableRow key={job.id}>
                                            <TableCell className="font-medium">{job.title}</TableCell>
                                            <TableCell>{new Date(job.created_at).toLocaleDateString('vi-VN')}</TableCell>
                                            <TableCell>{job.candidate_count || 0}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">Chi tiết</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {activeTab === 'candidates' && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Users className="w-12 h-12 mb-4 opacity-20" />
                    <p>Tính năng quản lý ứng viên đang được phát triển.</p>
                </div>
            )}
        </DashboardLayout>
    );
};

export default RecruiterDashboard;

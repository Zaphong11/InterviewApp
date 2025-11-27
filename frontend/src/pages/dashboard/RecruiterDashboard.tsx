import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Users, MoreHorizontal, Edit, Trash, Eye } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Job {
    id: number;
    title: string;
    created_at: string;
    description: string;
    requirements: string;
    candidate_count?: number;
}

const RecruiterDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'jobs' | 'candidates'>('jobs');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [currentJobId, setCurrentJobId] = useState<number | null>(null);

    // Alert Dialog State
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

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

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setRequirements('');
        setFile(null);
        setIsEditing(false);
        setIsReadOnly(false);
        setCurrentJobId(null);
    };

    const handleCreate = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleEdit = (job: Job) => {
        setTitle(job.title);
        setDescription(job.description);
        setRequirements(job.requirements);
        setFile(null); // Reset file, optional to update
        setCurrentJobId(job.id);
        setIsEditing(true);
        setIsReadOnly(false);
        setIsDialogOpen(true);
    };

    const handleViewContent = (job: Job) => {
        setTitle(job.title);
        setDescription(job.description);
        setRequirements(job.requirements);
        setFile(null);
        setIsReadOnly(true);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (job: Job) => {
        setJobToDelete(job);
        setIsAlertOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!jobToDelete) return;
        try {
            await api.delete(`/api/v1/jobs/${jobToDelete.id}`);
            toast.success('Đã xóa tin tuyển dụng');
            fetchJobs();
        } catch (error) {
            console.error('Error deleting job:', error);
            toast.error('Lỗi khi xóa tin tuyển dụng');
        } finally {
            setIsAlertOpen(false);
            setJobToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !requirements) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        // If creating, file is required. If editing, file is optional.
        if (!isEditing && !file) {
            toast.error('Vui lòng upload kịch bản phỏng vấn (PDF)');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditing && currentJobId) {
                // Update Job
                await api.put(`/api/v1/jobs/${currentJobId}`, {
                    title,
                    description,
                    requirements
                });

                // If file provided during edit, upload it
                if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    await api.post(`/api/v1/jobs/${currentJobId}/upload-script`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                }
                toast.success('Cập nhật tin tuyển dụng thành công!');
            } else {
                // Create Job
                const jobData = { title, description, requirements };
                const jobResponse = await api.post('/api/v1/jobs/', jobData);
                const newJobId = jobResponse.data.id;

                // Upload Script
                if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    await api.post(`/api/v1/jobs/${newJobId}/upload-script`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                }
                toast.success('Tạo tin tuyển dụng thành công!');
            }

            setIsDialogOpen(false);
            resetForm();
            fetchJobs();

        } catch (error) {
            console.error('Error saving job:', error);
            toast.error('Có lỗi xảy ra');
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
        <DashboardLayout>
            <div className="flex flex-col md:flex-row gap-6">
                {/* Mobile/Desktop Tabs Navigation */}
                {/* <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <h2 className="font-semibold text-lg mb-4 px-2">Menu</h2>
                        <nav className="space-y-1">
                            <SidebarItem id="jobs" label="Tin tuyển dụng" icon={FileText} />
                            <SidebarItem id="candidates" label="Ứng viên" icon={Users} />
                        </nav>
                    </div>
                </div> */}

                {/* Main Content Area */}
                <div className="flex-1">
                    {activeTab === 'jobs' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Tin tuyển dụng</h2>
                                    <p className="text-muted-foreground">Quản lý các vị trí đang tuyển dụng</p>
                                </div>

                                <Button onClick={handleCreate}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tạo Tin Tuyển Dụng
                                </Button>

                                {/* Create/Edit/View Dialog */}
                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <DialogContent className="sm:max-w-[600px]">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {isReadOnly ? 'Chi Tiết Tin Tuyển Dụng' : isEditing ? 'Sửa Tin Tuyển Dụng' : 'Tạo Tin Tuyển Dụng Mới'}
                                            </DialogTitle>
                                            <DialogDescription>
                                                {isReadOnly ? 'Xem thông tin chi tiết.' : 'Điền thông tin chi tiết và upload kịch bản phỏng vấn.'}
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
                                                    disabled={isReadOnly}
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
                                                    disabled={isReadOnly}
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
                                                    disabled={isReadOnly}
                                                />
                                            </div>
                                            {!isReadOnly && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="script">Kịch bản phỏng vấn (PDF)</Label>
                                                    <Input
                                                        id="script"
                                                        type="file"
                                                        accept="application/pdf"
                                                        onChange={handleFileChange}
                                                        required={!isEditing} // Required only for new jobs
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        {isEditing ? 'Upload file mới nếu muốn thay đổi.' : 'File PDF chứa các câu hỏi và tiêu chí đánh giá cho AI.'}
                                                    </p>
                                                </div>
                                            )}
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                                    {isReadOnly ? 'Đóng' : 'Hủy'}
                                                </Button>
                                                {!isReadOnly && (
                                                    <Button type="submit" disabled={isSubmitting}>
                                                        {isSubmitting ? 'Đang xử lý...' : (isEditing ? 'Cập nhật' : 'Tạo tin tuyển dụng')}
                                                    </Button>
                                                )}
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>

                                {/* Delete Alert Dialog */}
                                <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Hành động này không thể hoàn tác. Tin tuyển dụng và tất cả dữ liệu phỏng vấn liên quan sẽ bị xóa vĩnh viễn.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                                                Xóa
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
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
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}/candidates`)}>
                                                                    <Users className="mr-2 h-4 w-4" />
                                                                    Xem ứng viên
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleViewContent(job)}>
                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                    Xem nội dung
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => handleEdit(job)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Sửa tin
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDeleteClick(job)} className="text-red-600">
                                                                    <Trash className="mr-2 h-4 w-4" />
                                                                    Xóa tin
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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
                </div>
            </div>
        </DashboardLayout>
    );
};

export default RecruiterDashboard;

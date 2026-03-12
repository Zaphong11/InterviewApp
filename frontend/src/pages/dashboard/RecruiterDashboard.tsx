import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Users, MoreHorizontal, Edit, Trash, Eye, Settings } from 'lucide-react';
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
import { CampaignSetupModal } from '@/components/dashboard/CampaignSetupModal';

interface Job {
    id: number;
    title: string;
    created_at: string;
    description: string;
    requirements: string;
    candidate_count?: number;
    industry_id?: number;
    job_type?: string[]; // Array of strings (enums)
    location?: string;
    salary_min?: number;
    salary_max?: number;
}

interface Industry {
    id: number;
    name: string;
    slug: string;
}

interface JobCategory {
    id: number;
    name: string;
    description?: string;
}

const RecruiterDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'jobs' | 'candidates'>('jobs');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [industries, setIndustries] = useState<Industry[]>([]); // New State
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [currentJobId, setCurrentJobId] = useState<number | null>(null);

    // Campaign Modal State
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [selectedCampaignJobId, setSelectedCampaignJobId] = useState<number | null>(null);
    const [selectedCampaignJobTitle, setSelectedCampaignJobTitle] = useState<string>('');

    // Alert Dialog State
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [requirements, setRequirements] = useState('');

    // New Fields State
    const [selectedIndustry, setSelectedIndustry] = useState<string>(''); // Storing ID as string for Select
    const [selectedCategory, setSelectedCategory] = useState<string>(''); // For job category
    const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
    const [location, setLocation] = useState('');
    const [salaryMin, setSalaryMin] = useState<string>('');
    const [salaryMax, setSalaryMax] = useState<string>('');
    const [isNegotiable, setIsNegotiable] = useState(false);

    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchJobs = async () => {
        setIsLoading(true);
        try {
            const [jobsRes, industriesRes, categoriesRes] = await Promise.all([
                api.get('/api/v1/jobs/'),
                api.get('/api/v1/industries'),
                api.get('/api/v1/job-categories')
            ]);
            setJobs(jobsRes.data);
            setIndustries(industriesRes.data);
            setJobCategories(categoriesRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Không thể tải dữ liệu');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setRequirements('');

        // Reset New Fields
        setSelectedIndustry('');
        setSelectedCategory('');
        setSelectedJobTypes([]);
        setLocation('');
        setSalaryMin('');
        setSalaryMax('');
        setIsNegotiable(false);

        setFile(null);
        setIsEditing(false);
        setIsReadOnly(false);
        setCurrentJobId(null);
    };

    // ... handleCreate ...

    const handleEdit = (job: Job) => {
        setTitle(job.title);
        setDescription(job.description);
        setRequirements(job.requirements);

        // Populate New Fields
        setSelectedIndustry(job.industry_id ? job.industry_id.toString() : '');
        setSelectedCategory((job as any).category_id ? (job as any).category_id.toString() : '');
        setSelectedJobTypes(job.job_type || []);
        setLocation(job.location || '');
        setSalaryMin(job.salary_min ? job.salary_min.toString() : '');
        setSalaryMax(job.salary_max ? job.salary_max.toString() : '');
        setIsNegotiable(job.salary_min === 0); // Assuming 0 implies negotiable based on my quick fix in migration

        setFile(null);
        setCurrentJobId(job.id);
        setIsEditing(true);
        setIsReadOnly(false);
        setIsDialogOpen(true);
    };

    const handleOpenCampaignModal = (job: Job) => {
        setSelectedCampaignJobId(job.id);
        setSelectedCampaignJobTitle(job.title);
        setIsCampaignModalOpen(true);
    };

    const handleViewContent = (job: Job) => {
        setTitle(job.title);
        setDescription(job.description);
        setRequirements(job.requirements);

        // Populate New Fields for View
        setSelectedIndustry(job.industry_id ? job.industry_id.toString() : '');
        setSelectedCategory((job as any).category_id ? (job as any).category_id.toString() : '');
        setSelectedJobTypes(job.job_type || []);
        setLocation(job.location || '');
        setSalaryMin(job.salary_min ? job.salary_min.toString() : '');
        setSalaryMax(job.salary_max ? job.salary_max.toString() : '');
        setIsNegotiable(job.salary_min === 0);

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

        // Validation
        if (!title || !description || !requirements || !location || !selectedIndustry) {
            toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc');
            return;
        }

        if (selectedJobTypes.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 loại hình làm việc');
            return;
        }

        // File is no longer required when creating or editing.
        // if (!isEditing && !file) {
        //     toast.error('Vui lòng upload kịch bản phỏng vấn (PDF)');
        //     return;
        // }

        const salary_min = isNegotiable ? 0 : (parseInt(salaryMin) || 0);
        const salary_max = isNegotiable ? null : (parseInt(salaryMax) || null);

        const jobPayload = {
            title,
            description,
            requirements,
            industry_id: selectedIndustry ? parseInt(selectedIndustry) : null,
            category_id: selectedCategory ? parseInt(selectedCategory) : null,
            job_type: selectedJobTypes,
            location,
            salary_min,
            salary_max,
            currency: 'VND', // Default
            experience_level: null // Optional for now
        };

        setIsSubmitting(true);
        try {
            if (isEditing && currentJobId) {
                // Update Job
                await api.put(`/api/v1/jobs/${currentJobId}`, jobPayload);

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
                const jobResponse = await api.post('/api/v1/jobs/', jobPayload);
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

    // Helper for Job Type Checkbox
    const toggleJobType = (type: string) => {
        if (selectedJobTypes.includes(type)) {
            setSelectedJobTypes(selectedJobTypes.filter(t => t !== type));
        } else {
            setSelectedJobTypes([...selectedJobTypes, type]);
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
                <div className="w-full md:w-64 flex-shrink-0 space-y-2 hidden md:block">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <h2 className="font-semibold text-lg mb-4 px-2">Menu</h2>
                        <nav className="space-y-1">
                            <SidebarItem id="jobs" label="Tin tuyển dụng" icon={FileText} />
                            <SidebarItem id="candidates" label="Ứng viên" icon={Users} />
                        </nav>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1">
                    {activeTab === 'jobs' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Tin tuyển dụng</h2>
                                    <p className="text-muted-foreground">Quản lý các vị trí đang tuyển dụng</p>
                                </div>

                                <Button onClick={() => {
                                    resetForm();
                                    setIsDialogOpen(true);
                                }}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tạo Tin Tuyển Dụng
                                </Button>
                            </div>

                            {/* Create/Edit/View Dialog */}
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>
                                            {isReadOnly ? 'Chi Tiết Tin Tuyển Dụng' : isEditing ? 'Sửa Tin Tuyển Dụng' : 'Tạo Tin Tuyển Dụng Mới'}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {isReadOnly ? 'Xem thông tin chi tiết.' : 'Điền thông tin chi tiết và upload kịch bản phỏng vấn.'}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="title">Tiêu đề công việc <span className="text-red-500">*</span></Label>
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
                                                <Label htmlFor="industry">Ngành nghề</Label>
                                                <select
                                                    id="industry"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={selectedIndustry}
                                                    onChange={(e) => setSelectedIndustry(e.target.value)}
                                                    disabled={isReadOnly}
                                                >
                                                    <option value="">Chọn ngành nghề</option>
                                                    {industries.map(ind => (
                                                        <option key={ind.id} value={ind.id}>{ind.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="category">Danh mục đặc thù</Label>
                                                <select
                                                    id="category"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={selectedCategory}
                                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                                    disabled={isReadOnly}
                                                >
                                                    <option value="">Chọn danh mục</option>
                                                    {jobCategories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Loại hình làm việc <span className="text-red-500">*</span></Label>
                                            <div className="flex gap-4 flex-wrap">
                                                {['FULL_TIME', 'PART_TIME', 'REMOTE', 'HYBRID', 'CONTRACT'].map(type => (
                                                    <label key={type} className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            value={type}
                                                            checked={selectedJobTypes.includes(type)}
                                                            onChange={() => toggleJobType(type)}
                                                            disabled={isReadOnly}
                                                            className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                                                        />
                                                        <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="location">Địa điểm <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="location"
                                                    value={location}
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    placeholder="VD: Hà Nội"
                                                    required
                                                    disabled={isReadOnly}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Mức lương (VNĐ)</Label>
                                                <div className="flex items-center gap-2">
                                                    <label className="flex items-center space-x-2 text-sm text-muted-foreground whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            checked={isNegotiable}
                                                            onChange={(e) => setIsNegotiable(e.target.checked)}
                                                            disabled={isReadOnly}
                                                        />
                                                        <span>Thỏa thuận</span>
                                                    </label>
                                                </div>
                                                {!isNegotiable && (
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="Min"
                                                            type="number"
                                                            value={salaryMin}
                                                            onChange={e => setSalaryMin(e.target.value)}
                                                            disabled={isReadOnly}
                                                        />
                                                        <Input
                                                            placeholder="Max"
                                                            type="number"
                                                            value={salaryMax}
                                                            onChange={e => setSalaryMax(e.target.value)}
                                                            disabled={isReadOnly}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="description">Mô tả công việc <span className="text-red-500">*</span></Label>
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
                                            <Label htmlFor="requirements">Yêu cầu ứng viên <span className="text-red-500">*</span></Label>
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
                                                <Label htmlFor="script">Kịch bản phỏng vấn (PDF) <span className="text-muted-foreground font-normal">(Không bắt buộc)</span></Label>
                                                <Input
                                                    id="script"
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={handleFileChange}
                                                    required={false}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    {isEditing ? 'Upload file mới nếu muốn thay đổi kịch bản.' : 'Tùy chọn: File PDF chứa các câu hỏi và tiêu chí đánh giá cho AI.'}
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
                                                                <DropdownMenuItem onClick={() => handleOpenCampaignModal(job)}>
                                                                    <Settings className="mr-2 h-4 w-4" />
                                                                    Chiến dịch đa vòng
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

                            <CampaignSetupModal
                                jobId={selectedCampaignJobId}
                                jobTitle={selectedCampaignJobTitle}
                                isOpen={isCampaignModalOpen}
                                onClose={() => setIsCampaignModalOpen(false)}
                            />
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

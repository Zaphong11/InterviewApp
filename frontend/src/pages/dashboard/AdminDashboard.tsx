import React, { useEffect, useState } from 'react';
import {
    Users,
    Briefcase,
    FileText,
    Activity,
    Trash,
    AlertTriangle
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';

import api from '@/lib/api';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- Types ---
interface AdminStats {
    users: {
        candidate: number;
        business: number;
        total: number;
    };
    jobs: {
        total: number;
    };
    interviews: {
        finished: number;
        total: number;
    };
    api_usage: {
        gemini_requests: number;
        estimated_tokens: number;
    };
}

interface User {
    id: number;
    email: string;
    full_name: string;
    role: 'admin' | 'business' | 'candidate';
    is_active: boolean;
    company_name?: string;
}

interface Job {
    id: number;
    title: string;
    recruiter_id: number;
    created_at: string;
    recruiter?: {
        full_name: string;
        email: string;
    };
}

// --- Types ---
// ... existing types ...
interface Industry {
    id: number;
    name: string;
    slug: string;
    created_at: string;
}

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Delete State
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isJobAlertOpen, setIsJobAlertOpen] = useState(false);

    // Industry Create State
    const [isIndustryDialogOpen, setIsIndustryDialogOpen] = useState(false);
    const [newIndustryName, setNewIndustryName] = useState('');
    const [newIndustrySlug, setNewIndustrySlug] = useState('');

    // Mock data for the chart
    const activityData = [
        { name: 'T2', jobs: 4, interviews: 2 },
        { name: 'T3', jobs: 3, interviews: 5 },
        { name: 'T4', jobs: 7, interviews: 8 },
        { name: 'T5', jobs: 2, interviews: 4 },
        { name: 'T6', jobs: 5, interviews: 6 },
        { name: 'T7', jobs: 1, interviews: 2 },
        { name: 'CN', jobs: 0, interviews: 0 },
    ];

    // Mock Data for Chart
    // ...

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, usersRes, jobsRes, industriesRes] = await Promise.all([
                api.get('/api/v1/admin/stats'),
                api.get('/api/v1/admin/users'),
                api.get('/api/v1/admin/jobs'),
                api.get('/api/v1/industries') // New fetch
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
            setJobs(jobsRes.data);
            setIndustries(industriesRes.data);
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
            toast.error('Không thể tải dữ liệu Admin');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Industry Handlers ---
    const handleCreateIndustry = async () => {
        if (!newIndustryName || !newIndustrySlug) {
            toast.error('Vui lòng nhập tên và slug');
            return;
        }
        try {
            await api.post('/api/v1/industries/', {
                name: newIndustryName,
                slug: newIndustrySlug
            });
            toast.success('Thêm ngành nghề thành công');
            setIsIndustryDialogOpen(false);
            setNewIndustryName('');
            setNewIndustrySlug('');
            fetchData();
        } catch (error) {
            console.error('Error creating industry:', error);
            toast.error('Lỗi khi tạo ngành nghề. Slug có thể đã tồn tại.');
        }
    };

    // --- User Handlers ---
    const handleDeleteUserClick = (user: User) => {
        setUserToDelete(user);
        setIsAlertOpen(true);
    };

    const handleConfirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await api.delete(`/api/v1/admin/users/${userToDelete.id}`);
            toast.success('Đã xóa người dùng');
            fetchData();
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Lỗi khi xóa người dùng');
        } finally {
            setIsAlertOpen(false);
            setUserToDelete(null);
        }
    };

    // --- Job Handlers ---
    const handleDeleteJobClick = (job: Job) => {
        setJobToDelete(job);
        setIsJobAlertOpen(true);
    };

    const handleConfirmDeleteJob = async () => {
        if (!jobToDelete) return;
        try {
            await api.delete(`/api/v1/admin/jobs/${jobToDelete.id}`);
            toast.success('Đã xóa tin tuyển dụng');
            fetchData();
        } catch (error) {
            console.error('Error deleting job:', error);
            toast.error('Lỗi khi xóa tin tuyển dụng');
        } finally {
            setIsJobAlertOpen(false);
            setJobToDelete(null);
        }
    };


    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                        <p className="text-muted-foreground">Quản lý hệ thống và người dùng</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tổng User</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats?.users.candidate || 0} Candidate, {stats?.users.business || 0} Business
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tổng Job</CardTitle>
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.jobs.total || 0}</div>
                            <p className="text-xs text-muted-foreground">Tin tuyển dụng đang hoạt động</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tổng Interview</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.interviews.total || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats?.interviews.finished || 0} đã hoàn thành
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Google API Requests</CardTitle>
                            {(stats?.api_usage.gemini_requests || 0) > 1000 ? (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : (
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.api_usage.gemini_requests || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                ~{stats?.api_usage.estimated_tokens.toLocaleString()} tokens ước tính
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7 mb-8">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Hoạt động trong tuần</CardTitle>
                            <CardDescription>Số lượng Job mới và Interview thực hiện</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={activityData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="jobs" name="Jobs" fill="#0f172a" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="interviews" name="Interviews" fill="#adfa1d" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Placeholder for another chart or info if needed */}
                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Phân bố người dùng</CardTitle>
                            <CardDescription>Tỷ lệ giữa Candidate và Business</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center h-[350px]">
                            <div className="text-center space-y-4">
                                <div className="flex items-center justify-center space-x-8">
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-primary">{stats?.users.candidate || 0}</div>
                                        <div className="text-sm text-muted-foreground mt-1">Candidates</div>
                                    </div>
                                    <div className="h-12 w-px bg-border"></div>
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-blue-600">{stats?.users.business || 0}</div>
                                        <div className="text-sm text-muted-foreground mt-1">Business</div>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground max-w-[200px] mx-auto pt-4">
                                    Hệ thống đang có tổng cộng {stats?.users.total || 0} người dùng hoạt động.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="users" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="users">Danh sách người dùng</TabsTrigger>
                        <TabsTrigger value="jobs">Danh sách bài viết</TabsTrigger>
                        <TabsTrigger value="industries">Danh sách ngành nghề</TabsTrigger>
                    </TabsList>

                    {/* Users Tab */}
                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <CardTitle>Danh sách người dùng</CardTitle>
                                <CardDescription>Quản lý tất cả tài khoản trong hệ thống.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Tên</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                            <TableHead className="text-right">Hành động</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell>
                                            </TableRow>
                                        ) : (
                                            users.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium">#{user.id}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>{user.full_name}</span>
                                                            {user.company_name && (
                                                                <span className="text-xs text-muted-foreground">{user.company_name}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            user.role === 'admin' ? 'default' :
                                                                user.role === 'business' ? 'secondary' : 'outline'
                                                        }>
                                                            {user.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={user.is_active ? 'outline' : 'destructive'} className={user.is_active ? "text-green-600 border-green-600" : ""}>
                                                            {user.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {user.role !== 'admin' && user.is_active && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleDeleteUserClick(user)}
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Jobs Tab */}
                    <TabsContent value="jobs">
                        {/* ... Existing Jobs Tab Content ... */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Danh sách bài viết</CardTitle>
                                <CardDescription>Quản lý tất cả tin tuyển dụng trong hệ thống.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Tiêu đề</TableHead>
                                            <TableHead>Người đăng</TableHead>
                                            <TableHead>Ngày tạo</TableHead>
                                            <TableHead className="text-right">Hành động</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8">Đang tải...</TableCell>
                                            </TableRow>
                                        ) : (
                                            jobs.map((job) => (
                                                <TableRow key={job.id}>
                                                    <TableCell className="font-medium">#{job.id}</TableCell>
                                                    <TableCell className="font-medium">{job.title}</TableCell>
                                                    <TableCell>{job.recruiter_id}</TableCell>
                                                    <TableCell>
                                                        {new Date(job.created_at).toLocaleDateString('vi-VN')}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDeleteJobClick(job)}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Industries Tab */}
                    <TabsContent value="industries">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Danh mục ngành nghề</h2>
                            <Button onClick={() => setIsIndustryDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Thêm ngành nghề
                            </Button>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Danh sách ngành nghề</CardTitle>
                                <CardDescription>Quản lý các ngành nghề trong hệ thống.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Tên ngành</TableHead>
                                            <TableHead>Slug</TableHead>
                                            <TableHead>Ngày tạo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8">Đang tải...</TableCell>
                                            </TableRow>
                                        ) : industries.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8">Chưa có dữ liệu</TableCell>
                                            </TableRow>
                                        ) : (
                                            industries.map((industry) => (
                                                <TableRow key={industry.id}>
                                                    <TableCell className="font-medium">#{industry.id}</TableCell>
                                                    <TableCell>{industry.name}</TableCell>
                                                    <TableCell>{industry.slug}</TableCell>
                                                    <TableCell>
                                                        {new Date(industry.created_at).toLocaleDateString('vi-VN')}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Delete User Alert Dialog */}
                <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận xóa user?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Hành động này sẽ vô hiệu hóa tài khoản của <strong>{userToDelete?.email}</strong>.
                                Người dùng sẽ không thể đăng nhập được nữa.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDeleteUser} className="bg-red-600 hover:bg-red-700">
                                Xóa User
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Delete Job Alert Dialog */}
                {/* Delete Job Alert Dialog */}
                {/* ... existing alert ... */}
                <AlertDialog open={isJobAlertOpen} onOpenChange={setIsJobAlertOpen}>
                    {/* ... content ... */}
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận xóa bài viết?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Hành động này sẽ xóa vĩnh viễn bài tuyển dụng <strong>{jobToDelete?.title}</strong>.
                                Không thể hoàn tác.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDeleteJob} className="bg-red-600 hover:bg-red-700">
                                Xóa Bài Viết
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Create Industry Dialog */}
                <Dialog open={isIndustryDialogOpen} onOpenChange={setIsIndustryDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Thêm Ngành Nghề</DialogTitle>
                            <DialogDescription>Nhập tên và slug cho ngành nghề mới.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="ind-name">Tên ngành</Label>
                                <Input
                                    id="ind-name"
                                    value={newIndustryName}
                                    onChange={(e) => {
                                        setNewIndustryName(e.target.value);
                                        // Auto-generate slug simple version
                                        setNewIndustrySlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
                                    }}
                                    placeholder="VD: Công nghệ thông tin"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ind-slug">Slug</Label>
                                <Input
                                    id="ind-slug"
                                    value={newIndustrySlug}
                                    onChange={(e) => setNewIndustrySlug(e.target.value)}
                                    placeholder="cong-nghe-thong-tin"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsIndustryDialogOpen(false)}>Hủy</Button>
                            <Button onClick={handleCreateIndustry}>Thêm</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;

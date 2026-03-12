import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

interface Job {
    id: number;
    title: string;
    description: string;
    requirements: string;
    created_at: string;
    candidate_count?: number;
    company?: any;
}

interface JobDetailDialogProps {
    job: Job | null;
    isOpen: boolean;
    onClose: () => void;
}

export const JobDetailDialog: React.FC<JobDetailDialogProps> = ({ job, isOpen, onClose }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    if (!job) return null;

    const handleStartInterview = async () => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để bắt đầu phỏng vấn');
            navigate('/login');
            return;
        }

        try {
            const response = await api.post('/api/v1/interviews/start', { job_id: job.id });
            const interview = response.data;
            toast.success('Bắt đầu phỏng vấn thành công!');
            navigate(`/interview/${interview.id}/room`);
            onClose();
        } catch (error: any) {
            console.error('Failed to start interview:', error);
            if (error.response?.status === 401) {
                toast.error('Vui lòng đăng nhập lại');
                navigate('/login');
            } else if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (typeof detail === 'string') {
                    toast.error(detail);
                } else if (Array.isArray(detail)) {
                    toast.error(`Lỗi dữ liệu: ${detail[0]?.msg || 'Không xác định'}`);
                } else {
                    toast.error('Lỗi dữ liệu từ server');
                }
            } else {
                toast.error('Không thể bắt đầu phỏng vấn. Vui lòng thử lại.');
            }
        }
    };

    const handleApply = async () => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để nộp đơn');
            navigate('/login');
            return;
        }

        if (!user.cv_url) {
            toast.error('Thất bại do không tìm thấy CV của bạn');
            return;
        }

        try {
            await api.post('/api/v1/applications/', {
                job_id: job.id,
                target_role: job.title
            });
            toast.success('Yêu cầu của bạn đã được ghi nhận');
            onClose(); // Optional: close the dialog after success
        } catch (error: any) {
            console.error('Failed to apply:', error);
            if (error.response && error.response.data && error.response.data.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error('Có lỗi xảy ra khi nộp đơn.');
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-start gap-4 mb-2">
                        {job.company?.logo_url ? (
                            <div className="w-16 h-16 min-w-16 bg-white border rounded-lg p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                                <img
                                    src={job.company.logo_url.startsWith('http') ? job.company.logo_url : `http://localhost:8000${job.company.logo_url}`}
                                    alt={job.company.name || job.title}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="w-16 h-16 min-w-16 bg-primary/5 flex items-center justify-center rounded-lg border shrink-0">
                                <Building2 className="w-8 h-8 text-primary/40" />
                            </div>
                        )}
                        <div>
                            <DialogTitle className="text-2xl font-bold">{job.title}</DialogTitle>
                            <DialogDescription className="mt-1 flex items-center gap-2">
                                {job.company?.name && <span className="font-medium flex-shrink-0 text-gray-700">{job.company.name}</span>}
                                {job.company?.name && <span className="flex-shrink-0">•</span>}
                                <span>Đăng ngày: {new Date(job.created_at).toLocaleDateString('vi-VN')}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-lg mb-2">Mô tả công việc</h3>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                {job.description}
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-2">Yêu cầu</h3>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                {job.requirements}
                            </p>
                        </div>

                        {job.company?.description && (
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <h3 className="font-semibold text-lg mb-2">Về {job.company.name || "công ty chúng tôi"}</h3>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                    {job.company.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-4 pt-4 border-t flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Đóng
                    </Button>
                    <Button onClick={handleApply} className="bg-primary hover:bg-primary/90 text-white">
                        Nộp đơn
                    </Button>
                    <Button variant="secondary" onClick={handleStartInterview}>
                        Bắt đầu Phỏng vấn ngay
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

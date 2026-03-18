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
interface Job {
    id: number;
    title: string;
    description: string;
    requirements: string;
    created_at: string;
    candidate_count?: number;
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
    const handleApplyJob = async () => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để nộp đơn');
            navigate('/login');
            return;
        }
        if (!user.cv_url) {
             toast.error('Vui lòng cập nhật CV trong trang cá nhân trước khi nộp đơn.');
             return;
        }
        try {
            await api.post('/api/v1/applications/', { job_id: job.id });
            toast.success('Đã nộp đơn thành công!');
            onClose();
        } catch (error: any) {
            console.error('Failed to apply job:', error);
            if (error.response && error.response.status === 401) {
                toast.error('Vui lòng đăng nhập lại');
                navigate('/login');
            } else if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error('Không thể nộp đơn. Vui lòng thử lại.');
            }
        }
    };
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">{job.title}</DialogTitle>
                    <DialogDescription>
                        Đăng ngày: {new Date(job.created_at).toLocaleDateString('vi-VN')}
                    </DialogDescription>
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
                    </div>
                </div>
                <DialogFooter className="mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Đóng
                    </Button>
                    <Button onClick={handleApplyJob}>
                        Nộp đơn (Apply)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

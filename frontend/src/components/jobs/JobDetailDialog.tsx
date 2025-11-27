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
            if (error.response && error.response.status === 401) {
                toast.error('Vui lòng đăng nhập lại');
                navigate('/login');
            } else {
                toast.error('Không thể bắt đầu phỏng vấn. Vui lòng thử lại.');
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
                    <Button onClick={handleStartInterview}>
                        Bắt đầu Phỏng vấn ngay
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

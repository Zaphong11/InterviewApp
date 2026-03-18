import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, FileText, Upload, ExternalLink } from 'lucide-react';

interface UserProfileDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ isOpen, onClose }) => {
    const { user, refreshProfile } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [isEditingCv, setIsEditingCv] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!user) return null;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Vui lòng chọn file PDF');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post('/api/v1/users/upload-cv', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            await refreshProfile();
            toast.success('Cập nhật CV thành công!');
            setIsEditingCv(false);
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Có lỗi xảy ra khi tải lên CV');
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleTriggerUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Hồ sơ cá nhân</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Họ tên</Label>
                        <Input value={user.full_name} disabled className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Email</Label>
                        <Input value={user.email} disabled className="col-span-3" />
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4 pt-4 border-t">
                        <Label className="text-right pt-2">CV</Label>
                        <div className="col-span-3 space-y-3">
                            {user.cv_url && !isEditingCv ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                                        <FileText className="h-5 w-5 text-primary" />
                                        <span className="text-sm font-medium truncate flex-1">
                                            CV hiện tại
                                        </span>
                                        <button
                                            onClick={() => {
                                                if (!user.cv_url) return;
                                                const url = user.cv_url.startsWith('http')
                                                    ? user.cv_url
                                                    : `http://localhost:8000${user.cv_url.startsWith('/') ? '' : '/'}${user.cv_url}`;
                                                window.open(url, '_blank');
                                            }}
                                            className="text-blue-600 hover:text-blue-800 cursor-pointer"
                                            title="Xem CV"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditingCv(true)}
                                        className="w-full"
                                    >
                                        Thay đổi CV
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                    />
                                    <Button
                                        variant="outline"
                                        className="w-full border-dashed border-2 h-24 flex flex-col gap-2 hover:bg-muted/50"
                                        onClick={handleTriggerUpload}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        ) : (
                                            <Upload className="h-6 w-6 text-muted-foreground" />
                                        )}
                                        <span className="text-sm text-muted-foreground">
                                            {isUploading ? 'Đang tải lên...' : 'Nhấn để tải lên PDF'}
                                        </span>
                                    </Button>
                                    {isEditingCv && user.cv_url && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingCv(false)}
                                            className="w-full text-muted-foreground"
                                        >
                                            Hủy bỏ
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={onClose}>Đóng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

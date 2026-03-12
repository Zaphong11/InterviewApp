import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Plus, Trash2, FileText, Settings } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';

interface CampaignSetupModalProps {
    jobId: number | null;
    jobTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

interface StageFormData {
    stage_name: string;
    ai_model: string;
    file: FileList | null;
}

interface CampaignFormData {
    passing_rule: string;
    stages: StageFormData[];
}

export const CampaignSetupModal: React.FC<CampaignSetupModalProps> = ({ jobId, jobTitle, isOpen, onClose }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<CampaignFormData>({
        defaultValues: {
            passing_rule: 'PASS_ALL',
            stages: [
                { stage_name: 'Vòng 1', ai_model: 'gemini-3-flash-preview', file: null }
            ]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "stages"
    });

    const onSubmit = async (data: CampaignFormData) => {
        if (!jobId) return;

        // Validation: Ensure each stage has a PDF
        for (let i = 0; i < data.stages.length; i++) {
            const stage = data.stages[i];
            if (!stage.file || stage.file.length === 0) {
                toast.error(`Vui lòng chọn file PDF cho ${stage.stage_name || `Vòng ${i + 1}`}`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('passing_rule', data.passing_rule);

            // Prepare stages meta data and extract files
            const stagesPayload = data.stages.map((stage, index) => ({
                stage_name: stage.stage_name,
                ai_model: stage.ai_model,
                has_file: true,
                file_index: index // Matches the order we append files below
            }));

            formData.append('stages_data', JSON.stringify(stagesPayload));

            // Append each file
            data.stages.forEach((stage) => {
                if (stage.file && stage.file[0]) {
                    formData.append('files', stage.file[0]);
                }
            });

            await api.post(`/api/v1/jobs/${jobId}/campaigns`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Đã lưu cài đặt chiến dịch phỏng vấn thành công!');
            reset();
            onClose();

        } catch (error: any) {
            console.error('Failed to save campaign:', error);
            const detail = error.response?.data?.detail || 'Có lỗi xảy ra khi lưu chiến dịch';
            toast.error(detail);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        Thiết lập Chiến dịch Phỏng vấn Đa vòng
                    </DialogTitle>
                    <DialogDescription>
                        Cấu hình các vòng phỏng vấn cho công việc: <span className="font-medium text-foreground">{jobTitle}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 py-4">
                    <form id="campaign-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        {/* Passing Rule */}
                        <div className="space-y-2 bg-slate-50 p-4 rounded-lg border">
                            <Label htmlFor="passing_rule" className="font-semibold text-base">Quy tắc Đỗ / Trượt (Passing Rule)</Label>
                            <select
                                id="passing_rule"
                                {...register('passing_rule', { required: true })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="PASS_ALL">Ứng viên phải vượt qua TẤT CẢ các vòng</option>
                                <option value="PASS_ANY">Đậu 1 vòng là Đậu chiến dịch</option>
                                <option value="NO_CONDITION">Thi liên tục không bị chặn (Kể cả điểm 0)</option>
                            </select>
                        </div>

                        {/* Stages */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold text-base">Danh sách Vòng thi ({fields.length})</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ stage_name: `Vòng ${fields.length + 1}`, ai_model: 'gemini-3-flash-preview', file: null })}
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Thêm vòng
                                </Button>
                            </div>

                            {fields.map((field, index) => (
                                <div key={field.id} className="relative bg-white border rounded-lg p-4 shadow-sm space-y-4">
                                    <div className="absolute top-2 right-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => remove(index)}
                                            disabled={fields.length === 1} // Require at least 1 stage
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tên vòng thi <span className="text-red-500">*</span></Label>
                                            <Input
                                                {...register(`stages.${index}.stage_name`, { required: "Vui lòng nhập tên vòng" })}
                                                placeholder="VD: Culture Fit, Technical Round"
                                            />
                                            {errors.stages?.[index]?.stage_name && (
                                                <p className="text-xs text-red-500">{errors.stages[index]?.stage_name?.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>AI Model chấm (Giám khảo khảo thí)</Label>
                                            <select
                                                {...register(`stages.${index}.ai_model`)}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <option value="gemini-3-flash-preview">Google Gemini 3 Flash Preview (Default)</option>
                                                <option value="gemini-3-pro-preview">Google Gemini 3 Pro Preview</option>
                                                <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
                                                <option value="gpt-4o">OpenAI GPT-4o</option>
                                                <option value="claude-3-haiku-20240307">Anthropic Claude 3 Haiku</option>
                                                <option value="claude-3-5-sonnet-latest">Anthropic Claude 3.5 Sonnet</option>
                                                <option value="qwen3.5:4b">Qwen 3.5 4B (Local)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            RAG Context (Kịch bản Phỏng vấn PDF) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            type="file"
                                            accept="application/pdf"
                                            {...register(`stages.${index}.file`, { required: "Vui lòng chọn file PDF" })}
                                            className="cursor-pointer"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Tải lên file PDF chứa các câu hỏi, tiêu chí đánh giá dành riêng cho vòng này.
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </form>
                </div>

                <DialogFooter className="mt-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={handleClose}>
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        form="campaign-form"
                        disabled={isSubmitting}
                        className="bg-primary hover:bg-primary/90 text-white"
                    >
                        {isSubmitting ? 'Đang lưu...' : 'Lưu Chiến Dịch'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

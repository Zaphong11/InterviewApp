import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { RefreshCcw, FileWarning, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
interface CriteriaFeedback {
    khu_vuc: string;
    diem: number;
    mo_ta: string;
    goi_y?: string;
}
interface ResumeData {
    status: string;
    score: number | null;
    feedback: {
        overall_score: number;
        overall_feedback: string;
        criteria: CriteriaFeedback[];
    } | null;
    created_at: string;
    cv_url: string | null;
}
const ResumeReview: React.FC = () => {
    const navigate = useNavigate();
    const [resume, setResume] = useState<ResumeData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    useEffect(() => {
        fetchResumeReview();
    }, []);
    const fetchResumeReview = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const response = await api.get('/api/v1/resume-reviews/me');
            setResume(response.data);
            if (response.data.status === 'PROCESSING' || response.data.status === 'PENDING') {
                 setTimeout(() => fetchResumeReview(false), 3000);
            } else {
                 setIsAnalyzing(false);
            }
        } catch (error: any) {
            toast.error('Không thể tải dữ liệu chấm điểm CV');
            setIsAnalyzing(false);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    };
    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            await api.post('/api/v1/resume-reviews/analyze');
            toast.success('Đã gửi yêu cầu chấm điểm CV. Backend đang bắt đầu phân tích.');
            fetchResumeReview(); // Start polling
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Lỗi khi yêu cầu chấm điểm');
            setIsAnalyzing(false);
        }
    };
    const getFullCvUrl = (url: string | null) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const apiBaseUrl = api.defaults.baseURL || 'http://localhost:8000';
        return `${apiBaseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
    };
    if (isLoading && !resume) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="animate-spin text-primary">
                        <RefreshCcw className="h-8 w-8" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }
    if (resume?.status === 'NO_CV' || (!resume?.cv_url && resume?.status !== 'PENDING' && resume?.status !== 'PROCESSING')) {
        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto mt-20 p-8 bg-white border rounded-2xl shadow-sm text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <FileWarning className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Chưa có thông tin CV</h2>
                    <p className="text-muted-foreground">Bạn cần tải lên CV trong hồ sơ cá nhân để AI có thể đánh giá và chấm điểm.</p>
                    <div className="pt-4">
                        <Button size="lg" onClick={() => navigate('/dashboard')} className="gap-2">
                            <CheckCircle2 className="w-4 h-4"/>
                            Về trang chủ để cập nhật
                        </Button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }
    const isProcessing = resume?.status === 'PENDING' || resume?.status === 'PROCESSING' || isAnalyzing;
    return (
        <DashboardLayout>
            <div className="flex flex-col min-h-[calc(100vh-6rem)] pb-12">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 mb-6 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-50">
                             <Sparkles className="w-8 h-8 text-amber-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Đánh giá CV bởi InterviewApp AI</h1>
                            <p className="text-slate-600 mt-1 max-w-2xl text-sm">
                                {resume?.feedback?.overall_feedback || "Hệ thống AI sẽ phân tích chi tiết bản CV của bạn theo các tiêu chuẩn tuyển dụng chuyên nghiệp."}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        {resume?.score !== null && resume?.score !== undefined ? (
                            <Badge variant="default" className="text-lg px-4 py-1 bg-blue-600 hover:bg-blue-700">
                                TỔNG QUAN: <span className="text-2xl ml-2">{resume.score}</span>/100
                            </Badge>
                        ) : (
                            isProcessing ? (
                                <Badge variant="outline" className="text-sm px-3 py-1 bg-amber-50 text-amber-700 border-amber-200 animate-pulse">
                                    Đang phân tích...
                                </Badge>
                            ) : null
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white"
                            onClick={handleAnalyze}
                            disabled={isProcessing}
                        >
                           {isProcessing ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                           {resume?.status === 'COMPLETED' || resume?.score ? "Chấm điểm lại CV" : "Bắt đầu chấm CV"}
                        </Button>
                    </div>
                </div>
                {/* Main Content */}
                <div className="flex-1 w-full">
                    <div className="w-full">
                        {isProcessing ? (
                             <div className="w-full flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-100 text-center space-y-4">
                                 <div className="relative">
                                     <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                                     <Sparkles className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                 </div>
                                 <h3 className="font-semibold text-slate-700 text-lg">AI đang đọc và phân tích CV của bạn...</h3>
                                 <p className="text-muted-foreground text-sm max-w-[400px]">Quá trình này có thể mất vài giây. Chúng tôi đang chấm điểm các tiêu chí về kinh nghiệm, kỹ năng và cách trình bày.</p>
                             </div>
                        ) : resume?.status === 'FAILED' ? (
                             <div className="w-full flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-rose-100 bg-rose-50 text-center space-y-4">
                                 <AlertCircle className="w-12 h-12 text-rose-500 mb-2" />
                                 <h3 className="font-semibold text-rose-700 text-lg">Phân tích CV thất bại</h3>
                                 <p className="text-rose-600 text-sm max-w-[500px]">
                                     {resume?.feedback?.overall_feedback || "Đã xảy ra lỗi hệ thống khi AI đọc CV của bạn. Hãy thử lại hoặc sử dụng file PDF có thể copy được chữ (text-based PDF)."}
                                 </p>
                             </div>
                        ) : resume?.feedback?.criteria && resume.feedback.criteria.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {resume.feedback.criteria.map((item, index) => (
                                    <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-blue-200 transition-colors flex flex-col h-full">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-12 flex-shrink-0 flex justify-center">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm text-lg ${
                                                    item.diem >= 8 ? 'bg-emerald-500' : 
                                                    item.diem >= 5 ? 'bg-amber-500' : 'bg-rose-500'
                                                }`}>
                                                    {item.diem}
                                                </div>
                                            </div>
                                            <div className="flex-1 pt-1">
                                                <h4 className="font-bold text-slate-800 text-lg">{item.khu_vuc}</h4>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <p className="text-slate-700 leading-relaxed">{item.mo_ta}</p>

                                            {item.goi_y && (
                                                <div className="bg-slate-50/80 rounded-lg p-4 border border-slate-100 flex items-start gap-3 mt-auto">
                                                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                                    <div className="text-sm">
                                                        <span className="font-semibold text-slate-700 block mb-1">Gợi ý cải thiện:</span>
                                                        <p className="text-muted-foreground leading-relaxed">{item.goi_y}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-100 text-center">
                                 <Sparkles className="w-12 h-12 text-slate-300 mb-4" />
                                 <p className="text-muted-foreground">Chưa có kết quả phân tích. Hãy nhấn nút Bắt đầu chấm CV ở phía trên để AI tiến hành đọc và phân tích.</p>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
export default ResumeReview;

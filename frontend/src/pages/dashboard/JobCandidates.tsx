import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ArrowLeft, Eye, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
interface Candidate {
    application_id: number;
    interview_id: number | null;
    candidate_name: string;
    candidate_email: string;
    status: string;
    match_score: number | null;
    strengths?: any[];
    weaknesses?: any[];
    total_score: number | null;
    created_at: string;
    cv_url: string | null;
}
const COLUMNS = [
    { id: 'SCREENING', title: 'Sơ loại' },
    { id: 'AI_TEST', title: 'Bài Test AI' },
    { id: 'INTERVIEW', title: 'Phỏng vấn' },
    { id: 'OFFER', title: 'Đề nghị' },
];
const JobCandidates: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    useEffect(() => {
        if (jobId) {
            fetchCandidates(jobId);
        }
    }, [jobId]);
    const fetchCandidates = async (id: string) => {
        setIsLoading(true);
        try {
            const response = await api.get(`/api/v1/jobs/${id}/candidates`);
            setCandidates(response.data);
        } catch (error) {
            console.error('Failed to fetch candidates:', error);
            toast.error('Không thể tải danh sách ứng viên');
        } finally {
            setIsLoading(false);
        }
    };

    const getCandidatesByStatus = (status: string) => {
        let list = candidates.filter(c => c.status === status);
        if (status === 'SCREENING') {
            list = list.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        }
        return list;
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;
        const applicationId = parseInt(draggableId);
        const newStatus = destination.droppableId;
        // Optimistic update
        const originalCandidates = [...candidates];
        const newCandidates = candidates.map(c =>
            c.application_id === applicationId ? { ...c, status: newStatus } : c
        );
        setCandidates(newCandidates);
        try {
            await api.patch(`/api/v1/applications/${applicationId}/status`, { status: newStatus });
            toast.success('Cập nhật trạng thái thành công');
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái:', error);
            toast.error('Lỗi cập nhật. Trả lại trạng thái cũ.');
            setCandidates(originalCandidates);
        }
    };
    return (
        <DashboardLayout>
            <div className="space-y-6 h-full flex flex-col pb-4">
                <div className="flex items-center gap-4 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Quản lý Ứng viên (ATS Board)</h2>
                        <p className="text-muted-foreground">Job ID: {jobId}</p>
                    </div>
                </div>

                <div className="flex-1 min-h-0 bg-slate-50 rounded-xl p-4 overflow-hidden border">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            Đang tải...
                        </div>
                    ) : (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <div className="flex h-full gap-4 overflow-x-auto pb-2">
                                {COLUMNS.map(column => (
                                    <div key={column.id} className="min-w-[320px] w-[320px] bg-white rounded-lg p-4 flex flex-col h-full border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                            <h3 className="font-semibold text-slate-700">{column.title}</h3>
                                            <Badge variant="secondary" className="rounded-full">
                                                {getCandidatesByStatus(column.id).length}
                                            </Badge>
                                        </div>

                                        <Droppable droppableId={column.id}>
                                            {(provided, snapshot) => (
                                                <div
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className={`flex-1 overflow-y-auto space-y-3 p-1 transition-colors ${snapshot.isDraggingOver ? 'bg-slate-50' : ''}`}
                                                >
                                                    {getCandidatesByStatus(column.id).map((candidate, index) => (
                                                        <Draggable key={candidate.application_id.toString()} draggableId={candidate.application_id.toString()} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 group hover:border-primary/50 transition-all ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20 rotate-1' : ''}`}
                                                                    style={provided.draggableProps.style}
                                                                >
                                                                    <div className="font-semibold text-sm mb-1 text-slate-800">{candidate.candidate_name}</div>
                                                                    <div className="text-xs text-muted-foreground mb-4 truncate">{candidate.candidate_email}</div>

                                                                    <div className="flex justify-between items-center text-xs">
                                                                        <div>
                                                                            {candidate.match_score !== null ? (
                                                                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-medium">
                                                                                    Phù hợp: {candidate.match_score.toFixed(1)}%
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="text-muted-foreground font-normal">Đang chấm...</Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                                            {candidate.cv_url && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7"
                                                                                    title="Xem CV"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const url = candidate.cv_url?.startsWith('http')
                                                                                            ? candidate.cv_url
                                                                                            : `http://localhost:8000${candidate.cv_url?.startsWith('/') ? '' : '/'}${candidate.cv_url}`;
                                                                                        window.open(url, '_blank');
                                                                                    }}
                                                                                >
                                                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                                                </Button>
                                                                            )}
                                                                            {candidate.strengths && candidate.strengths.length > 0 && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7"
                                                                                    title="Xem đánh giá CV (AI)"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelectedCandidate(candidate);
                                                                                    }}
                                                                                >
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles text-amber-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                                                                                </Button>
                                                                            )}
                                                                            {candidate.interview_id && (
                                                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/interview-report/${candidate.interview_id}`)} title="Kết quả bài test AI">
                                                                                    <Eye className="h-4 w-4 text-emerald-600" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                ))}
                            </div>
                        </DragDropContext>
                    )}
                </div>
            </div>
            <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                            AI Đánh giá CV: {selectedCandidate?.candidate_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg">
                            <div className="text-sm font-medium text-muted-foreground w-24">Tỉ lệ phù hợp:</div>
                            <div className="text-2xl font-bold text-primary">{selectedCandidate?.match_score?.toFixed(1)}%</div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                                Điểm mạnh
                            </h4>
                            <div className="space-y-3">
                                {selectedCandidate?.strengths?.map((s: any, idx) => (
                                    <div key={idx} className="bg-emerald-50/50 p-3 rounded-md border border-emerald-100">
                                        <div className="font-medium text-emerald-800 mb-1">{s.title || 'Ưu điểm'}</div>
                                        <div className="text-sm text-emerald-700/80">{s.description || s}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-rose-600 mb-3 flex items-center gap-2">
                                Điểm yếu / Cần cải thiện
                            </h4>
                            <div className="space-y-3">
                                {selectedCandidate?.weaknesses?.map((w: any, idx) => (
                                    <div key={idx} className="bg-rose-50/50 p-3 rounded-md border border-rose-100">
                                        <div className="font-medium text-rose-800 mb-1">{w.title || 'Nhược điểm'}</div>
                                        <div className="text-sm text-rose-700/80">{w.description || w}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};
export default JobCandidates;

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ApplicationCard } from './ApplicationCard';
import { Column } from './Column';

interface Application {
    id: number;
    candidate_id: number;
    job_id: number;
    stage: 'SCREENING' | 'TEST' | 'INTERVIEW' | 'OFFER';
    status: string;
    cv_url: string;
    candidate: {
        full_name: string;
        email: string;
    };
}

const STAGES = ['SCREENING', 'TEST', 'INTERVIEW', 'OFFER'] as const;
type Stage = typeof STAGES[number];

export default function ATSDashboard() {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeItem, setActiveItem] = useState<Application | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (jobId) {
            fetchApplications();
        }
    }, [jobId]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/api/v1/applications/job/${jobId}`);
            setApplications(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error('Gặp lỗi khi tải danh sách ứng viên');
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const activeApp = applications.find(a => a.id === active.id);
        if (activeApp) setActiveItem(activeApp);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over) return;

        const applicationId = active.id as number;
        const overId = over.id;

        const sourceStage = applications.find(a => a.id === applicationId)?.stage;
        let targetStage: Stage = sourceStage as Stage;

        // Check if dropping over a column or another item
        if (STAGES.includes(overId as Stage)) {
            targetStage = overId as Stage;
        } else {
            const overApp = applications.find(a => a.id === overId);
            if (overApp) {
                targetStage = overApp.stage;
            }
        }

        if (sourceStage !== targetStage) {
            // Optimistic update
            setApplications(prev =>
                prev.map(app => (app.id === applicationId ? { ...app, stage: targetStage } : app))
            );

            try {
                await api.put(`/api/v1/applications/${applicationId}/stage`, { stage: targetStage });
                toast.success(`Chuyển ứng viên sang vòng ${targetStage}`);
            } catch (error) {
                toast.error('Lỗi khi cập nhật trạng thái');
                fetchApplications(); // Revert on failure
            }
        }
    };

    const applicationsByStage = STAGES.reduce((acc, stage) => {
        acc[stage] = applications.filter(app => app.stage === stage);
        return acc;
    }, {} as Record<Stage, Application[]>);

    if (loading) return <DashboardLayout><div className="p-8">Đang tải...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full bg-gray-50/50">
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Hệ thống theo dõi ứng viên (ATS)</h1>
                            <p className="text-muted-foreground mt-1">Kéo thả để cập nhật trạng thái ứng viên</p>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm font-medium transition"
                        >
                            Trở về Dashboard
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto p-6">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex gap-6 h-full min-h-[500px] items-start">
                            {STAGES.map((stage) => (
                                <Column key={stage} stage={stage} applications={applicationsByStage[stage]} />
                            ))}
                        </div>

                        <DragOverlay>
                            {activeItem ? <ApplicationCard application={activeItem} isDragging /> : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </div>
        </DashboardLayout>
    );
}

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ApplicationCard } from './ApplicationCard';

interface ColumnProps {
    stage: string;
    applications: any[];
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
    SCREENING: { label: 'Sơ loại', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    TEST: { label: 'Bài Test AI', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    INTERVIEW: { label: 'Phỏng vấn', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    OFFER: { label: 'Đề nghị (Offer)', color: 'bg-green-100 text-green-800 border-green-200' },
};

export const Column: React.FC<ColumnProps> = ({ stage, applications }) => {
    const { setNodeRef, isOver } = useDroppable({ id: stage });

    const config = STAGE_CONFIG[stage] || { label: stage, color: 'bg-gray-100' };

    return (
        <div className="flex flex-col w-[320px] shrink-0">
            <div className={`px-4 py-3 rounded-t-xl border-t border-x ${config.color} font-medium flex justify-between items-center`}>
                <span>{config.label}</span>
                <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold">
                    {applications?.length || 0}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 bg-gray-50/50 border-x border-b border-gray-200 rounded-b-xl p-3 min-h-[500px] flex flex-col gap-3 transition-colors ${isOver ? 'bg-indigo-50/50 border-indigo-200 border-dashed border-2' : ''
                    }`}
            >
                <SortableContext
                    items={applications.map(app => app.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {applications.map(app => (
                        <ApplicationCard key={app.id} application={app} />
                    ))}
                </SortableContext>

                {applications.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        Kéo thả ứng viên vào đây
                    </div>
                )}
            </div>
        </div>
    );
};

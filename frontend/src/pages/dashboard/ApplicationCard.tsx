import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, MoreVertical } from 'lucide-react';

interface ApplicationCardProps {
    application: any;
    isDragging?: boolean;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ application, isDragging }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: application.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors group relative ${isDragging ? 'opacity-50 blur-sm scale-105 shadow-lg relative z-50' : ''
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                    {application.candidate?.full_name || 'Ứng viên'}
                </h3>
                <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>

            <p className="text-sm text-gray-500 mb-3 truncate">
                {application.candidate?.email || 'No email provided'}
            </p>

            {application.cv_url && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        window.open(`http://localhost:8000${application.cv_url}`, '_blank', 'noopener,noreferrer');
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="inline-flex items-center text-xs text-primary bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20 transition-colors pointer-events-auto"
                >
                    <FileText className="w-3 h-3 mr-1" />
                    Xem CV
                </button>
            )}
        </div>
    );
};

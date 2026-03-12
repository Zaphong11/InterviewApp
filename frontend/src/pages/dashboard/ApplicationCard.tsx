import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, MoreVertical, Sparkles, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
            className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors group relative flex flex-col ${isDragging ? 'opacity-50 blur-sm scale-105 shadow-lg relative z-50' : ''
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        {application.candidate?.full_name || 'Ứng viên'}
                    </h3>
                    {application.is_potential && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm flex items-center gap-0.5" title="Ứng viên tiềm năng">
                            <Sparkles className="w-3 h-3" />
                            Tiềm năng
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {application.match_score !== undefined && application.match_score !== null && (
                        <Badge
                            variant="secondary"
                            className={`font-semibold text-[11px] px-1.5 ${application.match_score >= 70 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
                        >
                            AI Match: {application.match_score}%
                        </Badge>
                    )}
                    <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <p className="text-sm text-gray-500 mb-3 truncate">
                {application.candidate?.email || 'No email provided'}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
                {application.cv_url && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            window.open(`http://localhost:8000${application.cv_url}`, '_blank', 'noopener,noreferrer');
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="inline-flex items-center text-xs text-primary bg-primary/10 px-2 py-1.5 rounded-md hover:bg-primary/20 transition-colors pointer-events-auto font-medium"
                    >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Xem CV
                    </button>
                )}

                {application.short_summary && (
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="inline-flex items-center text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1.5 rounded-md hover:bg-indigo-100 transition-colors pointer-events-auto font-medium"
                                >
                                    <Bot className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                    AI Review
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs p-3 glass z-50 pointer-events-auto">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 font-semibold text-indigo-700 mb-2 border-b border-indigo-100 pb-1">
                                        <Bot className="w-4 h-4" />
                                        <span>AI Đánh Giá Nhanh</span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                        {application.short_summary}
                                    </p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
};

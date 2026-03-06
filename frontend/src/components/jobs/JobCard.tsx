import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Clock, MapPin, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge'; // Make sure this exists, or use tailwind classes

export interface Job {
    id: number;
    title: string;
    description: string;
    requirements: string;
    created_at: string;
    job_type?: string[] | string;
    industry?: any;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    location?: string;
    experience_level?: string;
    candidate_count?: number;
    company?: any;
}

interface JobCardProps {
    job: Job;
    onClick: (job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onClick }) => {

    // Helper to format salary
    const formatSalary = () => {
        if (!job.salary_min && !job.salary_max) return "Thỏa thuận";
        const currency = job.currency || "VND";
        const formatNum = (num: number) => (num / 1000000).toLocaleString('vi-VN') + " Tr"; // Simplify for millions

        if (job.salary_min && job.salary_max) {
            return `${formatNum(job.salary_min)} - ${formatNum(job.salary_max)} ${currency}`;
        }
        if (job.salary_min) return `Từ ${formatNum(job.salary_min)} ${currency}`;
        if (job.salary_max) return `Đến ${formatNum(job.salary_max)} ${currency}`;
        return "Thỏa thuận";
    };

    const getJobTypeColor = (type?: string) => {
        switch (type) {
            case 'FULL_TIME': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
            case 'PART_TIME': return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
            case 'REMOTE': return 'bg-green-100 text-green-800 hover:bg-green-200';
            case 'HYBRID': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
            case 'CONTRACT': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
            default: return 'bg-secondary text-secondary-foreground';
        }
    };

    return (
        <Card
            className="flex flex-col hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
            onClick={() => onClick(job)}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 pr-4">
                        <CardTitle className="text-xl font-bold leading-tight text-gray-900 group-hover:text-primary transition-colors">{job.title}</CardTitle>
                        {job.company?.name && (
                            <div className="text-[15px] font-medium text-gray-700">
                                {job.company.name}
                            </div>
                        )}
                        <CardDescription className="flex flex-wrap items-center gap-3 text-sm pt-1">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(job.created_at).toLocaleDateString('vi-VN')}
                            </span>
                            {job.location && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {job.location}
                                </span>
                            )}
                            {job.industry && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    {typeof job.industry === 'string' ? job.industry : job.industry.name}
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    {/* Placeholder for company logo or icon */}
                    <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl hidden sm:flex items-center justify-center w-14 h-14 overflow-hidden">
                        {job.company?.logo_url ? (
                            <img
                                src={job.company.logo_url.startsWith('http') ? job.company.logo_url : `http://localhost:8000${job.company.logo_url}`}
                                alt={job.company.name || job.title}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <Briefcase className="w-7 h-7 text-primary/50" />
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 py-2">
                <div className="flex flex-wrap gap-2 mb-3">
                    {/* Job Type Badges */}
                    {job.job_type && Array.isArray(job.job_type) ? (
                        job.job_type.map((type) => (
                            <Badge key={type} variant="secondary" className={`font-normal ${getJobTypeColor(type)}`}>
                                {type.replace('_', ' ')}
                            </Badge>
                        ))
                    ) : job.job_type && typeof job.job_type === 'string' ? (
                        <Badge variant="secondary" className={`font-normal ${getJobTypeColor(job.job_type)}`}>
                            {(job.job_type as string).replace('_', ' ')}
                        </Badge>
                    ) : null}

                    {/* Salary Badge */}
                    <Badge variant="outline" className="font-normal border-primary/20 text-primary bg-primary/5">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {formatSalary()}
                    </Badge>

                    {/* Experience Badge */}
                    {job.experience_level && (
                        <Badge variant="outline" className="font-normal capitalize">
                            {job.experience_level.toLowerCase()}
                        </Badge>
                    )}
                </div>

                <p className="text-sm text-gray-600 line-clamp-2">
                    {job.description}
                </p>
            </CardContent>
            <CardFooter className="pt-2">
                <Button className="w-full bg-primary hover:bg-primary/90">
                    Xem chi tiết & Ứng tuyển
                </Button>
            </CardFooter>
        </Card>
    );
};

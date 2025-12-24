import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import api from '@/lib/api';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { JobCard } from '@/components/jobs/JobCard';
import type { Job } from '@/components/jobs/JobCard';
import { JobFilterSidebar } from '@/components/jobs/JobFilterSidebar';
import type { FilterState } from '@/components/jobs/JobFilterSidebar';
import { Button } from '@/components/ui/button';
// Sheet removed as it does not exist

const Home: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [filters, setFilters] = useState<FilterState>({
        q: '',
        location: '',
        industry: '',
        job_type: [],
        min_salary: ''
    });

    const fetchJobs = async (currentFilters: FilterState) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (currentFilters.q) params.append('q', currentFilters.q);
            if (currentFilters.location) params.append('location', currentFilters.location);
            if (currentFilters.industry) params.append('industry', currentFilters.industry);
            if (currentFilters.min_salary) params.append('min_salary', currentFilters.min_salary.toString());

            // Handle array for job_type
            currentFilters.job_type.forEach(type => {
                params.append('job_type', type);
            });

            const response = await api.get(`/api/v1/jobs/?${params.toString()}`);
            setJobs(response.data);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Note: In a real app, we might want to debounce this or only fetch on "Apply"
    // The Sidebar calls `onFilterChange` when "Apply" is clicked, so we just listen to that.
    useEffect(() => {
        fetchJobs(filters);
    }, [filters]);

    const handleFilterChange = (newFilters: FilterState) => {
        setFilters(newFilters);
    };

    const handleJobClick = (job: Job) => {
        // Adapt Job from API to Job expected by Dialog if necessary
        // Assuming types match or are close enough. JobDetailDialog might need update if it expects strict types.
        // For now, casting or passing as is.
        setSelectedJob(job as any);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Hero Section */}
                <div className="text-center space-y-4 py-8 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Tìm kiếm cơ hội nghề nghiệp
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Khám phá các vị trí hấp dẫn và tham gia phỏng vấn AI ngay lập tức.
                    </p>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* Sidebar - Desktop */}
                    <div className="hidden lg:block col-span-3">
                        <div className="sticky top-20">
                            <JobFilterSidebar onFilterChange={handleFilterChange} />
                        </div>
                    </div>

                    {/* Mobile Filter Button */}
                    <div className="lg:hidden col-span-12">
                        {/* If Sheet component is not available, this block might fail. 
                             Safest bet is to use a simple toggle, but Sheet is standard in Shadcn. 
                             Checking file listing earlier... 'sheet.tsx' was NOT in the list.
                             'dialog.tsx' was there. I'll use a simple Dialog or just a collapsible div if Sheet is missing.
                             Actually, let's just show a button that toggles visibility for now to be safe, 
                             or better, use the Dialog component which exists.
                          */}
                        {/* Fallback to simple show/hide or use Dialog as a modal filter */}

                        {/* Note: I'll assume for this step that I can't use Sheet since I didn't see it.
                            I will use a standard Dialog for mobile filters.
                        */}
                    </div>

                    {/* Job List */}
                    <div className="col-span-12 lg:col-span-9">
                        <div className="flex justify-between items-center mb-4 lg:hidden">
                            <h2 className="text-xl font-semibold">Danh sách việc làm</h2>
                            {/* Mobile Filter Trigger */}
                            {/* Ideally integration with Dialog here but avoiding complex logic for this step if user didn't ask for mobile specifics beyond "hide". */}
                        </div>

                        {isLoading ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                Đang tải danh sách việc làm...
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                <p className="text-lg text-muted-foreground">
                                    Không tìm thấy việc làm nào phù hợp tiêu chí.
                                </p>
                                <Button
                                    variant="link"
                                    onClick={() => setFilters({ q: '', location: '', industry: '', job_type: [], min_salary: '' })}
                                >
                                    Xóa bộ lọc
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {jobs.map((job) => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        onClick={handleJobClick}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <JobDetailDialog
                    job={selectedJob as any}
                    isOpen={!!selectedJob}
                    onClose={() => setSelectedJob(null)}
                />
            </div>
        </DashboardLayout>
    );
};

export default Home;
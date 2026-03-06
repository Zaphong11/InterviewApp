import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Briefcase, Filter } from 'lucide-react';
import api from '@/lib/api';

export interface FilterState {
    q: string;
    location: string;
    industry: string;
    category_id: string; // New field
    job_type: string[];
    min_salary: number | '';
}

interface JobFilterSidebarProps {
    onFilterChange: (filters: FilterState) => void;
    className?: string;
}

interface Industry {
    id: number;
    name: string;
}

interface JobCategory {
    id: number;
    name: string;
}

const JOB_TYPES = [
    { id: 'FULL_TIME', label: 'Toàn thời gian' },
    { id: 'PART_TIME', label: 'Bán thời gian' },
    { id: 'REMOTE', label: 'Làm việc từ xa' },
    { id: 'HYBRID', label: 'Hybrid' },
    { id: 'CONTRACT', label: 'Hợp đồng' }
];

const LOCATIONS = [
    "Hà Nội",
    "Hồ Chí Minh",
    "Đà Nẵng",
    "Cần Thơ",
    "Hải Phòng",
    "Khác"
];

export const JobFilterSidebar: React.FC<JobFilterSidebarProps> = ({ onFilterChange, className }) => {
    const [filters, setFilters] = useState<FilterState>({
        q: '',
        location: '',
        industry: '',
        category_id: '',
        job_type: [],
        min_salary: ''
    });

    const [industries, setIndustries] = useState<Industry[]>([]);
    const [categories, setCategories] = useState<JobCategory[]>([]);

    useEffect(() => {
        const fetchFiltersData = async () => {
            try {
                const [indRes, catRes] = await Promise.all([
                    api.get('/api/v1/industries'),
                    api.get('/api/v1/job-categories')
                ]);
                setIndustries(indRes.data);
                setCategories(catRes.data);
            } catch (error) {
                console.error('Failed to fetch filters data:', error);
            }
        };
        fetchFiltersData();
    }, []);

    const handleChange = (key: keyof FilterState, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleJobTypeChange = (typeId: string, checked: boolean) => {
        setFilters(prev => {
            const currentTypes = prev.job_type;
            let newTypes;
            if (checked) {
                newTypes = [...currentTypes, typeId];
            } else {
                newTypes = currentTypes.filter(t => t !== typeId);
            }
            return { ...prev, job_type: newTypes };
        });
    };

    const applyFilters = () => {
        onFilterChange(filters);
    };

    const resetFilters = () => {
        const initialPlugin: FilterState = {
            q: '',
            location: '',
            industry: '',
            category_id: '',
            job_type: [],
            min_salary: ''
        };
        setFilters(initialPlugin);
        onFilterChange(initialPlugin);
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Bộ lọc tìm kiếm
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Search Keyword */}
                <div className="space-y-2">
                    <Label htmlFor="q">Từ khóa</Label>
                    <Input
                        id="q"
                        placeholder="Tên công việc, vị trí..."
                        value={filters.q}
                        onChange={(e) => handleChange('q', e.target.value)}
                    />
                </div>

                {/* Location - Native Select */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Địa điểm
                    </Label>
                    <div className="relative">
                        <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={filters.location}
                            onChange={(e) => handleChange('location', e.target.value)}
                        >
                            <option value="">Tất cả địa điểm</option>
                            {LOCATIONS.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Industry - Native Select */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Ngành nghề
                    </Label>
                    <div className="relative">
                        <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={filters.industry}
                            onChange={(e) => handleChange('industry', e.target.value)}
                        >
                            <option value="">Tất cả ngành nghề</option>
                            {industries.map(ind => (
                                <option key={ind.id} value={ind.id.toString()}>{ind.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Job Category - Native Select */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Mảng nghiệp vụ
                    </Label>
                    <div className="relative">
                        <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={filters.category_id}
                            onChange={(e) => handleChange('category_id', e.target.value)}
                        >
                            <option value="">Tất cả tính chuyên môn</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Job Type - Native Checkbox */}
                <div className="space-y-2">
                    <Label>Hình thức làm việc</Label>
                    <div className="space-y-2">
                        {JOB_TYPES.map(type => (
                            <div key={type.id} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`job_type_${type.id}`}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    checked={filters.job_type.includes(type.id)}
                                    onChange={(e) => handleJobTypeChange(type.id, e.target.checked)}
                                />
                                <label
                                    htmlFor={`job_type_${type.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    {type.label}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Min Salary */}
                <div className="space-y-2">
                    <Label>Mức lương tối thiểu (VNĐ)</Label>
                    <Input
                        type="text"
                        placeholder="VD: 10,000,000"
                        value={filters.min_salary ? filters.min_salary.toLocaleString('en-US') : ''}
                        onChange={(e) => {
                            const rawValue = e.target.value.replace(/,/g, '');
                            if (rawValue === '' || /^\d+$/.test(rawValue)) {
                                handleChange('min_salary', rawValue === '' ? '' : parseInt(rawValue, 10));
                            }
                        }}
                    />
                    <div className="text-xs text-muted-foreground">
                        Nhập số tiền đầy đủ (VD: 10,000,000)
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-4">
                    <Button onClick={applyFilters} className="w-full">Áp dụng</Button>
                    <Button variant="outline" onClick={resetFilters} className="w-full">Xóa bộ lọc</Button>
                </div>
            </CardContent>
        </Card>
    );
};

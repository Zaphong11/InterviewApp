import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Building2, Globe, MapPin, Upload, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/layouts/DashboardLayout';

interface Company {
    id: number;
    name: string;
    logo_url: string | null;
    description: string | null;
    website: string | null;
    location: string | null;
}

export default function CompanyProfile() {
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        website: '',
        location: '',
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        fetchCompanyProfile();
    }, []);

    const fetchCompanyProfile = async () => {
        try {
            const { data } = await api.get('/api/v1/companies/me');
            setCompany(data);
            setFormData({
                name: data.name || '',
                description: data.description || '',
                website: data.website || '',
                location: data.location || '',
            });
            if (data.logo_url) {
                // Assume API returns absolute path or we prepend API_BASE
                setLogoPreview(`http://localhost:8000${data.logo_url}`);
            }
        } catch (error: any) {
            if (error.response?.status !== 404) {
                toast.error('Failed to load company profile');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let logoUrl = company?.logo_url;

            if (logoFile) {
                const formDataUpload = new FormData();
                formDataUpload.append('file', logoFile);
                const uploadRes = await api.post('/api/v1/upload/image', formDataUpload, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                logoUrl = uploadRes.data.url;
            }

            const payload = {
                ...formData,
                logo_url: logoUrl,
            };

            await api.post('/api/v1/companies/', payload);
            toast.success('Company profile updated successfully!');
            fetchCompanyProfile(); // refresh
        } catch (error) {
            console.error(error);
            toast.error('Failed to update company profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto p-6 space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <Building2 className="h-8 w-8 text-indigo-600" />
                        Company Profile
                    </h1>
                    <p className="text-gray-500 mt-2">Manage your employer brand and company information.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">

                        {/* Logo Section */}
                        <div className="flex flex-col sm:flex-row gap-8 items-start">
                            <div className="flex-shrink-0 relative group">
                                <div className="h-32 w-32 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center relative">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Company Logo" className="h-full w-full object-cover" />
                                    ) : (
                                        <Building2 className="h-10 w-10 text-gray-300" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    title="Change Logo"
                                />
                                <p className="text-xs text-center text-gray-400 mt-2">Upload Logo</p>
                            </div>

                            <div className="flex-1 space-y-4 w-full">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Company Name *</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="pl-9"
                                            placeholder="e.g. Acme Corporation"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Website</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                value={formData.website}
                                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                                className="pl-9"
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                className="pl-9"
                                                placeholder="City, Country"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <FileSignature className="h-4 w-4 text-gray-400" />
                                Company Description
                            </label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Tell candidates about your company's mission, culture, and environment..."
                                className="min-h-[150px] resize-y"
                            />
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}

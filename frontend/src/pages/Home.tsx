import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, User } from 'lucide-react';

const Home: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full space-y-8 text-center">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                        Interview App
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Nền tảng phỏng vấn thông minh kết nối nhà tuyển dụng và ứng viên.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                    {/* Recruiter Card */}
                    <Card
                        className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-blue-500"
                        onClick={() => navigate('/login')}
                    >
                        <CardHeader>
                            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Briefcase className="w-8 h-8 text-blue-600" />
                            </div>
                            <CardTitle className="text-2xl">Dành cho Nhà tuyển dụng</CardTitle>
                            <CardDescription>
                                Tạo bài phỏng vấn, quản lý ứng viên và xem kết quả đánh giá AI.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
                                Đăng nhập Nhà tuyển dụng
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Candidate Card */}
                    <Card
                        className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-green-500"
                        onClick={() => navigate('/login')}
                    >
                        <CardHeader>
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <User className="w-8 h-8 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl">Dành cho Ứng viên</CardTitle>
                            <CardDescription>
                                Tham gia phỏng vấn, trả lời câu hỏi và nhận phản hồi ngay lập tức.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-lg py-6">
                                Đăng nhập Ứng viên
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Home;

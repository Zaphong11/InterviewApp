// file: app/dang-nhap/page.tsx
"use client"; // Đánh dấu đây là Client Component để có thể sử dụng hook và sự kiện

import axios, { AxiosError } from "axios";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); // Xóa lỗi cũ
        setIsLoading(true);

        // API của FastAPI OAuth2PasswordRequestForm yêu cầu dữ liệu dạng form-data
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        try {
            // Thay đổi URL này thành địa chỉ backend của bạn
            const response = await axios.post("http://localhost:8000/api/v1/auth/login", formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const { access_token } = response.data;
            // Lưu token vào localStorage để sử dụng cho các phiên làm việc sau
            localStorage.setItem("accessToken", access_token);

            console.log("Đăng nhập thành công, token:", access_token);
            // Chuyển hướng về trang chủ sau khi đăng nhập thành công
            router.push("/");

        } catch (err) {
            const axiosError = err as AxiosError<any>;
            const errorMessage = axiosError.response?.data?.detail || "Email hoặc mật khẩu không chính xác.";
            setError(errorMessage);
            console.error("Lỗi đăng nhập:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
            <Card className="mx-auto max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Đăng nhập</CardTitle>
                    <CardDescription>
                        Nhập email của bạn để đăng nhập vào tài khoản
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                disabled={isLoading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Mật khẩu</Label>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                required
                disabled={isLoading}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        Chưa có tài khoản?{" "}
                        <Link href="/dang-ky" className="underline">
                            Đăng ký
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

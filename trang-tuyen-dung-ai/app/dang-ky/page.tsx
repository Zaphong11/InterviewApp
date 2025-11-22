// file: app/dang-ky/page.tsx
"use client";

import axios, { AxiosError } from "axios";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function RegisterPage() {
    const router = useRouter();
    const [hoTen, setHoTen] = useState("");
    const [email, setEmail] = useState("");
    const [soDienThoai, setSoDienThoai] = useState("");
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");
    const [userType, setUserType] = useState("candidate"); // 'candidate' hoặc 'business'
    const [companyName, setCompanyName] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        if (password !== rePassword) {
            setError("Mật khẩu nhập lại không khớp.");
            setIsLoading(false);
            return;
        }

        const data = {
            full_name: hoTen,
            email: email,
            phone_number: soDienThoai,
            password: password,
            re_password: rePassword,
            user_type: userType,
            company_name: userType === 'business' ? companyName : undefined,
        };

        try {
            // Thay đổi URL này thành địa chỉ backend của bạn
            const response = await axios.post("http://localhost:8000/api/v1/auth/register", data);

            console.log("Đăng ký thành công:", response.data);
            alert("Đăng ký tài khoản thành công! Bạn sẽ được chuyển đến trang đăng nhập.");
            router.push("/dang-nhap");

        } catch (err) {
            if (axios.isAxiosError(err)) {
                const axiosError = err as AxiosError<any>;
                const errorMessage = axiosError.response?.data?.detail || "Đã có lỗi xảy ra. Vui lòng thử lại.";
                setError(errorMessage);
            } else {
                setError("Đã có lỗi không xác định xảy ra.");
            }
            console.error("Lỗi đăng ký:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
            <Card className="mx-auto max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Đăng ký</CardTitle>
                    <CardDescription>
                        Nhập thông tin của bạn để tạo một tài khoản mới
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label>Bạn là?</Label>
                            <RadioGroup defaultValue="candidate" onValueChange={setUserType} className="grid grid-cols-2 gap-4">
                                <div>
                                    <RadioGroupItem value="candidate" id="candidate" className="peer sr-only" />
                                    <Label htmlFor="candidate" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        Ứng viên
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="business" id="business" className="peer sr-only" />
                                    <Label htmlFor="business" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        Nhà tuyển dụng
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="ho-ten">Họ và tên</Label>
                            <Input
                                id="ho-ten"
                                placeholder="Nguyễn Văn A"
                                required
                                disabled={isLoading}
                                value={hoTen}
                                onChange={(e) => setHoTen(e.target.value)}
                            />
                        </div>
                        {userType === 'business' && (
                            <div className="grid gap-2">
                                <Label htmlFor="company-name">Tên công ty</Label>
                                <Input
                                    id="company-name"
                                    placeholder="Công ty TNHH ABC"
                                    required
                                    disabled={isLoading}
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                />
                            </div>
                        )}
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
                            <Label htmlFor="so-dien-thoai">Số điện thoại</Label>
                            <Input
                                id="so-dien-thoai"
                                placeholder="09xxxxxxxx"
                                required
                                disabled={isLoading}
                                value={soDienThoai}
                                onChange={(e) => setSoDienThoai(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Mật khẩu</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                disabled={isLoading}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="re-password">Nhập lại mật khẩu</Label>
                            <Input
                                id="re-password"
                                type="password"
                                required
                                disabled={isLoading}
                                value={rePassword}
                                onChange={(e) => setRePassword(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Đang xử lý..." : "Tạo tài khoản"}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        Đã có tài khoản?{" "}
                        <Link href="/dang-nhap" className="underline">
                            Đăng nhập
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

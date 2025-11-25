import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

const loginSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(1, "Vui lòng nhập mật khẩu"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const handleLogin = async (data: LoginFormValues) => {
        try {
            // --- KHÚC QUAN TRỌNG: CHUYỂN JSON THÀNH FORM DATA ---
            const formData = new FormData();
            formData.append('username', data.email); // <--- Ép email vào biến 'username' để chiều lòng Backend
            formData.append('password', data.password);

            // Gọi API, nhớ không set Content-Type là application/json
            const response = await api.post('/api/v1/auth/login', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded' // <--- Bắt buộc phải có cái này
                }
            });
            // -----------------------------------------------------

            // Sau khi login thành công
            const { access_token } = response.data;
            const user = await login(access_token); // Lưu token vào context và lấy user info

            // Toast thành công
            toast.success("Đăng nhập thành công!");

            // Redirect dựa theo role
            if (user) {
                const role = user.role || user.user_type;
                if (role === 'business') {
                    navigate('/dashboard');
                } else if (role === 'candidate') {
                    navigate('/my-interviews');
                } else if (role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            } else {
                navigate('/');
            }

        } catch (error) {
            console.error("Login error:", error);
            toast.error("Đăng nhập thất bại. Kiểm tra lại email/pass.");
        }
    };
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Đăng nhập</CardTitle>
                    <CardDescription className="text-center">
                        Nhập email và mật khẩu để truy cập tài khoản
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="example@domain.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mật khẩu</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="******" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full">
                                Đăng nhập
                            </Button>
                        </form>
                    </Form>
                    <div className="mt-4 text-center text-sm">
                        Chưa có tài khoản?{" "}
                        <Link to="/register" className="underline text-primary">
                            Đăng ký ngay
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

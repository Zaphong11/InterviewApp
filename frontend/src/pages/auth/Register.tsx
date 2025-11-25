import { useState } from "react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import api from "@/lib/api"

const registerSchema = z
    .object({
        full_name: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
        email: z.string().email("Email không hợp lệ"),
        phone_number: z.string().min(10, "Số điện thoại không hợp lệ"),
        password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
        re_password: z.string(),
        user_type: z.enum(["candidate", "business"]),
        company_name: z.string().optional(),
    })
    .refine((data) => data.password === data.re_password, {
        message: "Mật khẩu nhập lại không khớp",
        path: ["re_password"],
    })
    .refine(
        (data) => {
            if (data.user_type === "business" && !data.company_name) {
                return false
            }
            return true
        },
        {
            message: "Tên công ty là bắt buộc đối với doanh nghiệp",
            path: ["company_name"],
        }
    )

type RegisterFormValues = z.infer<typeof registerSchema>

export default function Register() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<"candidate" | "business">("candidate")

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            full_name: "",
            email: "",
            phone_number: "",
            password: "",
            re_password: "",
            user_type: "candidate",
            company_name: "",
        },
    })

    const onSubmit = async (data: RegisterFormValues) => {
        try {
            // Ensure user_type matches the active tab
            data.user_type = activeTab

            await api.post("/api/v1/auth/register", data)
            toast.success("Đăng ký thành công! Vui lòng đăng nhập.")
            navigate("/login")
        } catch (error: any) {
            console.error("Registration error:", error)
            const message = error.response?.data?.detail || "Đăng ký thất bại. Vui lòng thử lại."
            toast.error(message)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Đăng ký tài khoản</CardTitle>
                    <CardDescription className="text-center">
                        Nhập thông tin của bạn để tạo tài khoản mới
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => {
                            setActiveTab(value as "candidate" | "business")
                            form.setValue("user_type", value as "candidate" | "business")
                        }}
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="candidate">Ứng viên</TabsTrigger>
                            <TabsTrigger value="business">Doanh nghiệp</TabsTrigger>
                        </TabsList>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="full_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Họ và tên</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nguyễn Văn A" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                                    name="phone_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Số điện thoại</FormLabel>
                                            <FormControl>
                                                <Input placeholder="0912345678" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {activeTab === "business" && (
                                    <FormField
                                        control={form.control}
                                        name="company_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tên công ty</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Công ty ABC" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <div className="grid grid-cols-2 gap-4">
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

                                    <FormField
                                        control={form.control}
                                        name="re_password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nhập lại mật khẩu</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="******" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button type="submit" className="w-full">
                                    Đăng ký
                                </Button>
                            </form>
                        </Form>
                    </Tabs>
                    <div className="mt-4 text-center text-sm">
                        Đã có tài khoản?{" "}
                        <Link to="/login" className="underline text-primary">
                            Đăng nhập
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

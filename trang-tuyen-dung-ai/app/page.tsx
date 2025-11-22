// file: app/page.tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bot, Briefcase, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="container">
      {/* Phần Hero Section */}
      <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
          <h1 className="font-bold text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
            Phỏng vấn ảo, Tuyển dụng thật với{" "}
            <span className="text-primary">AI Recruiter</span>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Nền tảng tuyển dụng thế hệ mới, giúp bạn kết nối với ứng viên tiềm năng và thực hiện phỏng vấn sàng lọc tự động 24/7 nhờ Trí Tuệ Nhân Tạo.
          </p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link href="/dang-ky">Bắt đầu ngay</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#tinh-nang">Tìm hiểu thêm</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Phần Tính năng */}
      <section id="tinh-nang" className="container space-y-6 bg-slate-50 dark:bg-transparent py-8 md:py-12 lg:py-24 rounded-lg">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-bold text-2xl leading-[1.1] sm:text-3xl md:text-4xl">
            Tính năng nổi bật
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Khám phá những công cụ mạnh mẽ giúp thay đổi cách bạn tuyển dụng.
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Bot className="h-12 w-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Phỏng vấn AI 24/7</h3>
                <p className="text-sm text-muted-foreground">
                  Trợ lý AI thực hiện phỏng vấn sàng lọc ứng viên mọi lúc, mọi nơi, giúp bạn tiết kiệm thời gian và chi phí.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Users className="h-12 w-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Kết nối Nhà tuyển dụng & Ứng viên</h3>
                <p className="text-sm text-muted-foreground">
                  Một hệ sinh thái năng động nơi cơ hội và tài năng gặp gỡ, tạo ra những kết nối giá trị.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Briefcase className="h-12 w-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Quản lý tuyển dụng thông minh</h3>
                <p className="text-sm text-muted-foreground">
                  Theo dõi, đánh giá và quản lý hồ sơ ứng viên trên một giao diện trực quan và dễ sử dụng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

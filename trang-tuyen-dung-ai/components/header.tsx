// file: components/header.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <div className="mr-4 flex items-center">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6">
                            <rect width="256" height="256" fill="none"></rect>
                            <path d="M208,80H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V88A8,8,0,0,0,208,80ZM96,120a32,32,0,1,1,32,32A32.1,32.1,0,0,1,96,120Zm112-56V48a8,8,0,0,0-8-8H88" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></path>
                        </svg>
                        <span className="font-bold">AI Recruiter</span>
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                    <nav className="flex items-center space-x-2">
                        <Button variant="ghost" asChild>
                            <Link href="/dang-nhap">Đăng nhập</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/dang-ky">Đăng ký</Link>
                        </Button>
                    </nav>
                </div>
            </div>
        </header>
    );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/frontend/components/ui/avatar";
import { CreditsDisplay } from "@/frontend/components/common/credits-display";
import { Button } from "@/frontend/components/ui/button";
import { useAuthStore } from "@/frontend/store/authStore";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

interface HeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  totalCredits: number;
}

export const Header = ({ user, totalCredits }: HeaderProps) => {
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.push("/");
    }
  };

  return (
    <header className="border-b border-white/10 px-3 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Image src="/favicon.ico" alt="Chatlyzer" width={28} height={28} className="flex-shrink-0" />
          <span className="font-bold text-lg sm:text-xl truncate">Chatlyzer</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <CreditsDisplay credits={totalCredits} />
          <Link href="/profile">
            <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-white/20 transition-all flex-shrink-0">
              <AvatarImage src={user.image || ""} alt={user.name || "User"} />
              <AvatarFallback>{user.name?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
          </Link>
          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}; 
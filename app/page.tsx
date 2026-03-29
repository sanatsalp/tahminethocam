"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";

export default function Home() {
  const { currentUser } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (currentUser) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [currentUser, router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

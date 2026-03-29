"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";

export default function Home() {
  const { currentUser, authLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return; // wait for session check
    if (currentUser) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [currentUser, authLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

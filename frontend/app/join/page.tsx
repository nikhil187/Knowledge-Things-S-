"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JoinRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/?tab=join"); }, [router]);
  return null;
}

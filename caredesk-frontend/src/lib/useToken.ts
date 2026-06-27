"use client";

import { useAuth } from "@clerk/nextjs";

export function useToken() {
  const { getToken } = useAuth();
  return { getToken };
}

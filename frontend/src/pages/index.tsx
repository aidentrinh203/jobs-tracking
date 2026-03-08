import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/auth-context";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Redirect to workspace if authenticated, otherwise to login
  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/workspace");
    } else {
      router.push("/login");
    }
  }, [router, isAuthenticated]);

  // Return minimal content as it will be redirected immediately
  return null;
}

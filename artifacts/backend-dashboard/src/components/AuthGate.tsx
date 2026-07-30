import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useBackendMe } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jatek_backend_token");
    if (!token) {
      setLocation("/login");
    }
    setTokenChecked(true);
  }, [setLocation]);

  const { data: me, isLoading, error } = useBackendMe({
    query: {
      queryKey: ["/api/backend/me"],
      enabled: tokenChecked && !!localStorage.getItem("jatek_backend_token"),
      retry: false,
    },
  });

  useEffect(() => {
    if (error) {
      localStorage.removeItem("jatek_backend_token");
      setLocation("/login");
    }
  }, [error, setLocation]);

  if (!tokenChecked || isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!me) {
    return null;
  }

  return <>{children}</>;
}

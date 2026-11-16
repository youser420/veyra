import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { enabledOAuthProviders } from "@/lib/auth-redirect";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthCard providers={enabledOAuthProviders()} />
    </Suspense>
  );
}

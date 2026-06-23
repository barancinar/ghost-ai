import { SignUp } from "@clerk/nextjs";
import { AuthMarketingPanel } from "@/components/auth-marketing-panel";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen bg-base text-copy-primary">
      <AuthMarketingPanel />

      {/* Right Panel - Centered Clerk Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-base">
        <SignUp />
      </div>
    </div>
  );
}

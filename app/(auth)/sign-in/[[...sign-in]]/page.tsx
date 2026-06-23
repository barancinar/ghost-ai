import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen bg-base text-copy-primary">
      {/* Left Panel - Large screens only */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-default bg-surface/20 font-sans">
        <div className="flex items-center gap-2 select-none">
          <div className="h-6 w-6 rounded bg-brand flex items-center justify-center font-bold text-black text-sm">
            G
          </div>
          <span className="font-sans font-bold tracking-tight text-lg">Ghost AI</span>
        </div>

        <div className="space-y-6 max-w-md my-auto">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Collaborative system design, <span className="text-brand">simplified.</span>
          </h1>
          <p className="text-copy-muted text-sm leading-relaxed">
            Translate plain English descriptions into interactive architecture diagrams. Collaborate in real-time and export production-ready specifications.
          </p>
          <ul className="space-y-3 pt-4 text-sm text-copy-secondary">
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-brand"></span>
              <span>Describe systems using natural language</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-brand"></span>
              <span>Real-time collaborative workspace canvas</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-brand"></span>
              <span>Export persistent Markdown specifications</span>
            </li>
          </ul>
        </div>

        <div className="text-xs text-copy-faint font-mono">
          &copy; {new Date().getFullYear()} Ghost AI. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Centered Clerk Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-base">
        <SignIn />
      </div>
    </div>
  );
}

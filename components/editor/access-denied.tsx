import Link from "next/link"
import { Lock } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AccessDenied() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-base text-copy-primary select-none p-6">
      {/* Glow effect in background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,77,79,0.03),transparent_40%)] pointer-events-none" />
      
      <div className="relative z-10 flex max-w-md w-full flex-col items-center text-center bg-surface border border-default p-8 rounded-3xl shadow-2xl backdrop-blur-md">
        {/* Lock Icon container with soft error-glow */}
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-state-error/10 border border-state-error/20 mb-6">
          <Lock className="h-8 w-8 text-state-error animate-pulse" />
        </div>
        
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-copy-primary">
          Access Denied
        </h1>
        
        <p className="mt-3 text-sm text-copy-muted leading-relaxed">
          You don't have permission to view this project, or it doesn't exist. Please check the URL or ask the owner for access.
        </p>
        
        <div className="mt-8 w-full">
          <Link
            href="/editor"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full bg-elevated border border-default hover:bg-subtle text-copy-primary font-medium py-5 text-sm rounded-xl transition duration-200 flex items-center justify-center"
            )}
          >
            Back to Projects
          </Link>
        </div>
      </div>
    </div>
  )
}

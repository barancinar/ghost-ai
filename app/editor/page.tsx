import { auth } from "@clerk/nextjs/server"
import { fetchProjectsForUser } from "@/lib/projects"
import { getCachedClerkUser } from "@/lib/project-access"
import { EditorClient } from "./editor-client"

export default async function EditorPage() {
  const { userId } = await auth()
  if (!userId) {
    return null
  }

  const user = await getCachedClerkUser(userId)
  const emails = user?.emailAddresses.map((e: { emailAddress: string }) => e.emailAddress) || []

  // Fetch real projects server-side on initial load
  const projects = await fetchProjectsForUser(userId, emails)

  return <EditorClient projects={projects} activeProject={null} />
}

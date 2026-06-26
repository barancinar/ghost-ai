import { auth, currentUser } from "@clerk/nextjs/server"
import { fetchProjectsForUser } from "@/lib/projects"
import { EditorClient } from "./editor-client"

export default async function EditorPage() {
  const { userId } = await auth()
  if (!userId) {
    return null
  }

  const user = await currentUser()
  const emails = user?.emailAddresses.map((e) => e.emailAddress) || []

  // Fetch real projects server-side on initial load
  const projects = await fetchProjectsForUser(userId, emails)

  return <EditorClient projects={projects} activeProject={null} />
}

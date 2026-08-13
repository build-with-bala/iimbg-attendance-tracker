import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";

export default async function Home() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  // Admins who are also students land on their own standing; the cohort tools
  // are one click away in the section switch.
  redirect(viewer.student ? "/student" : "/cohort");
}

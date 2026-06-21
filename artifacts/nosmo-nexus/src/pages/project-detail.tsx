import { useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { ProjectView } from "@/focus/views/project-view";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>
      <ProjectView projectId={id || ""} />
    </div>
  );
}

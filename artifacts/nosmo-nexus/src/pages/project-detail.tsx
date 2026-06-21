import { useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/demo/data";
import { NodeGraph } from "@/components/node-graph";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const project = id ? getProject(id) : undefined;

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center text-muted-foreground">
        Project not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>
      <NodeGraph key={project.id} initialType="project" initialId={project.id} />
    </div>
  );
}

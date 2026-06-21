import { Link, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { PersonView } from "@/focus/views/person-view";

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <Link href="/people" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to People
      </Link>
      <PersonView personId={id || ""} />
    </div>
  );
}

import { Cloud, DatabaseZap, FolderInput, GitBranch, ShieldAlert, UploadCloud } from "lucide-react";
import { NexusCloudFileLoaderBridge } from "@/components/nexus-cloud-file-loader-bridge";
import { nexusCloudDriveManifest } from "@/cloud/nexus-cloud-drive-manifest";

const boundaryItems = [
  {
    label: "Binary upload",
    value: "Not implemented",
    Icon: UploadCloud,
  },
  {
    label: "Drive write",
    value: "Blocked",
    Icon: FolderInput,
  },
  {
    label: "Asset Index append",
    value: "Blocked",
    Icon: DatabaseZap,
  },
  {
    label: "Project Graph mutation",
    value: "Blocked",
    Icon: GitBranch,
  },
];

export default function NexusCloudFileLoader() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <section className="overflow-hidden rounded-3xl border border-sky-400/25 bg-gradient-to-br from-sky-500/12 via-card to-background p-5 shadow-[0_20px_80px_rgba(14,165,233,0.08)] md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300">
              <Cloud className="h-4 w-4" /> Nexus Cloud / File Loader
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Prepare project file metadata before upload</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              This route exposes the PR #68 File Loader bridge in the shell. It forces the reviewer to choose the Project World before any upload session can exist, then resolves the pending asset into the verified Google Drive target folder family.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Current Drive manifest: <span className="font-mono text-sky-200">{nexusCloudDriveManifest.schema}</span>. Relationship Tree previews remain consumers of file links, not the file source of truth.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-xs text-amber-100 lg:w-80">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4" /> Safety boundary
            </div>
            <p className="mt-2 leading-relaxed text-amber-100/85">
              This page is metadata-only. It must not be treated as a live Google Drive upload, Asset Index write, Project Graph mutation or production storage adapter.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {boundaryItems.map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl border border-border/70 bg-background/55 p-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-sky-300" /> {label}
              </div>
              <p className="mt-2 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <NexusCloudFileLoaderBridge />
    </div>
  );
}

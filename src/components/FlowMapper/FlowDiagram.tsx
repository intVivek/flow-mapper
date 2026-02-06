"use client";

export default function FlowDiagram() {
  return (
    <div className="flex h-full w-full flex-col gap-3">
      <h2 className="text-lg font-medium">Flow diagram</h2>
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/30">
        <p className="text-muted-foreground text-sm">
          Flow diagram will be rendered here
        </p>
      </div>
    </div>
  );
}

import { useLayoutEffect, useRef } from "react";
import { useLocation, useParams, useSearchParams } from "react-router";

import WorkflowInstance from "@/components/WorkflowInstance";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { projectDetailQuery } from "@/queries/planning";

export default function ProjectItemTaskPage() {
  const { projectId, itemId } = useParams<{ projectId: string; itemId: string }>();
  const projectQuery = useApiQuery(projectDetailQuery(projectId ?? ""));
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const main = rootRef.current?.closest("main");
    if (main) main.scrollTop = 0;
  }, [itemId]);

  function selectTask(instanceId?: string): void {
    if (
      (searchParams.get("taskInstanceId") ?? undefined) === instanceId &&
      !searchParams.has("action")
    )
      return;
    const next = new URLSearchParams(searchParams);
    if (instanceId) next.set("taskInstanceId", instanceId);
    else next.delete("taskInstanceId");
    next.delete("action");
    setSearchParams(next, { replace: true, preventScrollReset: true, state: location.state });
  }

  if (!projectId || !itemId) {
    return <div className="py-8 text-center text-sm text-muted-foreground">项目不存在</div>;
  }

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-6xl">
      <WorkflowInstance
        itemId={itemId}
        isProjectCreator={projectQuery.data?.isCreator === true}
        taskInstanceId={searchParams.get("taskInstanceId") ?? undefined}
        submitOnEntry={searchParams.get("action") === "submit"}
        onSelectTask={selectTask}
        onSubmitClose={() => selectTask(searchParams.get("taskInstanceId") ?? undefined)}
      />
    </div>
  );
}

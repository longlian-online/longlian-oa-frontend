import { useMemo, type ReactElement } from "react";
import FileViewer from "@file-viewer/react";

import { createPreviewOptions } from "./viewerOptions";

interface AttachmentFileViewerProps {
  file: File;
  viewerTheme: "light" | "dark";
}

export default function AttachmentFileViewer({
  file,
  viewerTheme,
}: AttachmentFileViewerProps): ReactElement {
  const options = useMemo(() => createPreviewOptions(viewerTheme), [viewerTheme]);

  return (
    <FileViewer
      key={`${file.name}:${file.size}:${viewerTheme}`}
      className="h-full"
      file={file}
      name={file.name}
      options={options}
    />
  );
}

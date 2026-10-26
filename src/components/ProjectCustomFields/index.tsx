import { Fragment } from "react";

import type { ProjectCustomField } from "@/lib/projectMetadata";

interface ProjectCustomFieldsProps {
  fields: ProjectCustomField[];
}

export default function ProjectCustomFields({ fields }: ProjectCustomFieldsProps) {
  if (fields.length === 0) return null;

  return (
    <>
      {fields.map((field, index) => (
        <Fragment key={`${field.name}-${index}`}>
          <dt className="text-muted-foreground">{field.name}</dt>
          <dd className="break-words whitespace-pre-wrap">
            {field.value.trim() ? (
              field.value
            ) : (
              <span className="text-muted-foreground">未填写</span>
            )}
          </dd>
        </Fragment>
      ))}
    </>
  );
}

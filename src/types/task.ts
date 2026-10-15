export interface TaskFormField {
  key: string;
  label: string;
  type: "text" | "textarea" | "file" | "number" | "select";
  required: boolean;
  options: string[];
}

export type TaskSubmitValue = string | { fileId: string } | null;

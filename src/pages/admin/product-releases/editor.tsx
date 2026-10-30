import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { ReactElement } from "react";
import type { ProductReleaseFormValues } from "@/types/productRelease";

export type ProductReleaseEditorMode = "create" | "draft" | "published" | "withdrawn";

interface ProductReleaseEditorProps {
  mode: ProductReleaseEditorMode;
  values: ProductReleaseFormValues;
  error?: string | null;
  pending?: boolean;
  onChange: (values: ProductReleaseFormValues) => void;
  onSave: () => void;
  onPublish?: () => void;
  onWithdraw?: () => void;
}

export function emptyProductReleaseForm(
  baseline?: { frontendVersion?: string; backendVersion?: string } | null,
): ProductReleaseFormValues {
  return {
    version: "",
    frontendVersion: baseline?.frontendVersion ?? "",
    backendVersion: baseline?.backendVersion ?? "",
    title: "",
    summary: "",
    added: "",
    changed: "",
    fixed: "",
  };
}

export default function ProductReleaseEditor({
  mode,
  values,
  error,
  pending = false,
  onChange,
  onSave,
  onPublish,
  onWithdraw,
}: ProductReleaseEditorProps): ReactElement {
  const locked = mode === "published" || mode === "withdrawn";
  const readOnly = mode === "withdrawn";

  function patch(partial: Partial<ProductReleaseFormValues>): void {
    onChange({ ...values, ...partial });
  }

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <VersionField
        label="产品版本"
        value={values.version}
        disabled={locked || pending}
        onChange={(version) => patch({ version })}
      />
      <VersionField
        label="前端版本"
        value={values.frontendVersion}
        disabled={locked || pending}
        onChange={(frontendVersion) => patch({ frontendVersion })}
      />
      <VersionField
        label="后端版本"
        value={values.backendVersion}
        disabled={locked || pending}
        onChange={(backendVersion) => patch({ backendVersion })}
      />
      <Field label="标题">
        <Input
          value={values.title}
          disabled={readOnly || pending}
          maxLength={40}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>
      <Field label="摘要">
        <Textarea
          value={values.summary}
          disabled={readOnly || pending}
          maxLength={120}
          onChange={(event) => patch({ summary: event.target.value })}
        />
      </Field>
      <ChangeField
        label="新增"
        value={values.added}
        disabled={readOnly || pending}
        onChange={(added) => patch({ added })}
      />
      <ChangeField
        label="调整"
        value={values.changed}
        disabled={readOnly || pending}
        onChange={(changed) => patch({ changed })}
      />
      <ChangeField
        label="修复"
        value={values.fixed}
        disabled={readOnly || pending}
        onChange={(fixed) => patch({ fixed })}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          nativeButton={false}
          render={<Link to="/admin/product-releases" />}
        >
          返回
        </Button>
        {mode === "published" ? (
          <Button type="button" variant="outline" disabled={pending} onClick={onWithdraw}>
            撤回
          </Button>
        ) : null}
        {mode !== "withdrawn" ? (
          <Button type="submit" variant="outline" disabled={pending}>
            {mode === "published" ? "保存" : "保存草稿"}
          </Button>
        ) : null}
        {mode === "create" || mode === "draft" ? (
          <Button type="button" disabled={pending} onClick={onPublish}>
            发布
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function VersionField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <Field label={label}>
      <Input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function ChangeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <Field label={label}>
      <Textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function Field({ label, children }: { label: string; children: ReactElement }): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

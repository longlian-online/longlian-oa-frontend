import { expect, test } from "vite-plus/test";
import {
  applyTypeCustomFields,
  buildProjectMetadata,
  missingRequiredFieldNames,
  normalizeProjectMetadataTagColor,
  parseProjectCustomFields,
  parseProjectMetadataTags,
  PROJECT_METADATA_TAG_COLORS,
} from "@/lib/projectMetadata";
import type { ProjectMetadataTag } from "@/lib/projectMetadata";

test("color normalization accepts only the supported identifiers", (): void => {
  for (const color of PROJECT_METADATA_TAG_COLORS) {
    expect(normalizeProjectMetadataTagColor(color)).toBe(color);
  }
  for (const color of [
    undefined,
    null,
    false,
    1,
    "",
    "Blue",
    " blue ",
    "red",
    "#ffffff",
    "rgb(0, 0, 0)",
    "constructor",
    "toString",
    "__proto__",
    "hasOwnProperty",
    "blue".repeat(1000),
    "blue; background: url(javascript:alert(1))",
    { color: "blue" },
    ["blue"],
  ]) {
    expect(normalizeProjectMetadataTagColor(color)).toBeUndefined();
  }
});

test("missing, malformed, and non-object metadata roots yield no tags", (): void => {
  expect(parseProjectMetadataTags()).toEqual([]);
  for (const metadata of [
    "",
    " ",
    "{",
    "null",
    "true",
    "42",
    '"tags"',
    "[]",
    '[{"tags": [{"key": "ignored"}]}]',
    "{}",
    '{"tags": null}',
    '{"tags": "blue"}',
    '{"tags": {"key": "ignored"}}',
  ]) {
    expect(parseProjectMetadataTags(metadata)).toEqual([]);
  }
});

test("mixed invalid records are skipped without discarding valid tags", (): void => {
  const metadata = JSON.stringify({
    tags: [
      null,
      false,
      1,
      "tag",
      [],
      {},
      { value: "missing key" },
      { key: null },
      { key: 1 },
      { key: {} },
      { key: [] },
      { key: "" },
      { key: " \t\n " },
      { key: "first", value: "valid" },
      { key: "invalid null", value: null },
      { key: "invalid number", value: 1 },
      { key: "invalid boolean", value: false },
      { key: "invalid object", value: {} },
      { key: "invalid array", value: [] },
      { key: "second" },
      { key: "third", value: "", color: "green" },
    ],
  });
  expect(parseProjectMetadataTags(metadata)).toEqual([
    { key: "first", value: "valid" },
    { key: "second", value: "" },
    { key: "third", value: "", color: "green" },
  ]);
});

test("legacy keys and values retain their whitespace and nonempty text", (): void => {
  const tags = [
    { key: " 客户 ", value: " 龙联 \n" },
    { key: "备注", value: " \t " },
    { key: "empty value", value: "" },
  ];
  expect(parseProjectMetadataTags(JSON.stringify({ tags }))).toEqual(tags);
});

test("missing values normalize to empty strings without adding a default color", (): void => {
  expect(
    parseProjectMetadataTags(
      JSON.stringify({ tags: [{ key: "单键" }, { key: "空值", value: "" }] }),
    ),
  ).toEqual([
    { key: "单键", value: "" },
    { key: "空值", value: "" },
  ]);
});

test("parsing preserves tag order and duplicate keys", (): void => {
  const tags: ProjectMetadataTag[] = [
    { key: "重复", value: "first", color: "violet" },
    { key: "other", value: "middle" },
    { key: "重复", value: "", color: "rose" },
    { key: "重复", value: "last" },
  ];
  expect(parseProjectMetadataTags(JSON.stringify({ tags }))).toEqual(tags);
});

test("invalid and malicious colors are dropped while their tags remain valid", (): void => {
  const invalidColors = [
    "constructor",
    "__proto__",
    "toString",
    "hasOwnProperty",
    "blue".repeat(1000),
    ["blue bg-", "[url(javascript:alert(1))]"].join(""),
    "#00f",
    null,
    42,
    { value: "blue" },
    ["blue"],
  ];
  const tags = invalidColors.map((color, index) => ({
    key: `tag-${index}`,
    value: index % 2 === 0 ? "" : "legacy value",
    color,
  }));
  expect(parseProjectMetadataTags(JSON.stringify({ tags }))).toEqual(
    tags.map(({ key, value }) => ({ key, value })),
  );
});

test("colored single-key and key/value tags survive JSON roundtrips", (): void => {
  const parsed = parseProjectMetadataTags(
    JSON.stringify({
      tags: [
        { key: "加急", color: "amber" },
        { key: "客户", value: "龙联", color: "blue" },
        { key: "审核", value: "", color: "green" },
      ],
    }),
  );
  expect(parsed).toEqual([
    { key: "加急", value: "", color: "amber" },
    { key: "客户", value: "龙联", color: "blue" },
    { key: "审核", value: "", color: "green" },
  ]);
  expect(parseProjectMetadataTags(JSON.stringify({ tags: parsed }))).toEqual(parsed);
});

test("custom fields skip blank names and invalid records while keeping order", (): void => {
  expect(parseProjectCustomFields()).toEqual([]);
  expect(parseProjectCustomFields('{"tags":[]}')).toEqual([]);
  expect(
    parseProjectCustomFields(
      JSON.stringify({
        fields: [
          null,
          { name: "  ", value: "drop" },
          { name: "作者", value: "xxxx" },
          { name: "作者" },
          { value: "只有值" },
          { name: "译者", value: "" },
          { name: " 画师 ", value: " yyyy " },
        ],
      }),
    ),
  ).toEqual([
    { name: "作者", value: "xxxx" },
    { name: "译者", value: "" },
    { name: " 画师 ", value: " yyyy " },
  ]);
});

test("empty custom field names are omitted and remaining values are trimmed", (): void => {
  const tags = [{ key: "加急", value: "", color: "amber" as const }];
  expect(
    buildProjectMetadata(tags, [
      { name: "  ", value: "drop" },
      { name: " 作者 ", value: " xxxx " },
      { name: "", value: "drop-too" },
      { name: "译者", value: "   " },
    ]),
  ).toBe(
    JSON.stringify({
      tags,
      fields: [
        { name: "作者", value: "xxxx" },
        { name: "译者", value: "" },
      ],
    }),
  );
  expect(buildProjectMetadata(tags, [{ name: " ", value: "none" }])).toBe(JSON.stringify({ tags }));
});

test("type defaults fill empty forms and keep values already entered", (): void => {
  let nextId = 0;
  const defaults = [
    { presetFieldId: "1", name: "作者", required: true },
    { presetFieldId: "2", name: "状态", required: false },
  ];
  const created = applyTypeCustomFields([], defaults, "all", () => `field-${nextId++}`);
  expect(created.map((field) => field.name)).toEqual(["作者", "状态"]);
  expect(created[0]).toMatchObject({ required: true, fromType: true, value: "" });

  const switched = applyTypeCustomFields(
    [
      ...created.map((field) => (field.name === "作者" ? { ...field, value: "山田" } : field)),
      { id: "extra", name: "备注", value: "手填" },
    ],
    [{ presetFieldId: "3", name: "译者", required: true }],
    "all",
    () => `field-${nextId++}`,
  );
  expect(switched.map((field) => [field.name, field.value, field.required])).toEqual([
    ["作者", "山田", false],
    ["备注", "手填", false],
    ["译者", "", true],
  ]);
});

test("editing only appends missing required defaults", (): void => {
  const fields = applyTypeCustomFields(
    [{ id: "saved", name: "备注", value: "已有" }],
    [
      { presetFieldId: "1", name: "作者", required: true },
      { presetFieldId: "2", name: "状态", required: false },
    ],
    "required",
    () => "required-author",
  );
  expect(fields.map((field) => field.name)).toEqual(["备注", "作者"]);
  expect(missingRequiredFieldNames(fields)).toEqual(["作者"]);
  expect(
    missingRequiredFieldNames(
      fields.map((field) => (field.name === "作者" ? { ...field, value: "山田" } : field)),
    ),
  ).toEqual([]);
});

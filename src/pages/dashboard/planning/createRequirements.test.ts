import { expect, test } from "vite-plus/test";
import { projectCreateMissingLabel } from "./createRequirements";

test("create form names every missing required field", () => {
  expect(
    projectCreateMissingLabel({ title: "", typeId: "", hasCover: false, isEditing: false }),
  ).toBe("还需要企划名、类型和封面");
  expect(
    projectCreateMissingLabel({
      title: "走查测试",
      typeId: "",
      hasCover: false,
      isEditing: false,
    }),
  ).toBe("还需要类型和封面");
  expect(
    projectCreateMissingLabel({
      title: "   ",
      typeId: "1",
      hasCover: true,
      isEditing: false,
    }),
  ).toBe("还需要企划名");
  expect(
    projectCreateMissingLabel({
      title: "走查测试",
      typeId: "1",
      hasCover: true,
      isEditing: false,
    }),
  ).toBeNull();
});

test("editing does not require a new cover", () => {
  expect(
    projectCreateMissingLabel({
      title: "走查测试",
      typeId: "1",
      hasCover: false,
      isEditing: true,
    }),
  ).toBeNull();
});

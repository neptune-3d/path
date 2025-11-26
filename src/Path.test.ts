import { describe, expect, test } from "vitest";
import { Path } from "./Path";

describe("Path", () => {
  test("fit", () => {
    const folderPath = new Path(24)
      .m(0, 0)
      .roundedCorner("tl", 0, 0, 3, 3)
      .l(9, 0)
      .l(12, 3)
      .roundedCorner("tr", 24, 3, 3, 3)
      .roundedCorner("br", 24, 19, 3, 3)
      .roundedCorner("bl", 0, 19, 3, 3)
      .close()
      .center(0, 0, 24, 24);

    const folderPathBounds = folderPath.getBounds();

    expect(folderPathBounds.minY).toBe(2.5);
    expect(folderPathBounds.maxY).toBe(21.5);
    expect(folderPathBounds.minX).toBe(0);
    expect(folderPathBounds.maxX).toBe(24);

    const preserveAspect = folderPath.clone().fit();

    const preserveAspectBounds = preserveAspect.getBounds();

    // no change expected
    expect(preserveAspectBounds.minY).toBe(2.5);
    expect(preserveAspectBounds.maxY).toBe(21.5);
    expect(preserveAspectBounds.minX).toBe(0);
    expect(preserveAspectBounds.maxX).toBe(24);

    const noAspect = folderPath
      .clone()
      .fit(folderPath.width, folderPath.height, false);

    const noAspectBounds = noAspect.getBounds();

    expect(noAspectBounds.minY).toBe(0);
    expect(noAspectBounds.maxY).toBe(24);
    expect(noAspectBounds.minX).toBe(0);
    expect(noAspectBounds.maxX).toBe(24);
  });
});

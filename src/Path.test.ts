import { describe, expect, test } from "vitest";
import { Path } from "./Path";

describe("Path", () => {
  test("parse", () => {
    let cmds = Path.parsePathData("M 2 3");

    expect(cmds).toEqual([{ type: "M", x: 2, y: 3 }]);

    cmds = Path.parsePathData("M 2 3L2.5 123");

    expect(cmds).toEqual([
      { type: "M", x: 2, y: 3 },
      { type: "L", x: 2.5, y: 123 },
    ]);

    cmds = Path.parsePathData("M 2 3.4C0.2 2 2 2 3 3Z");

    expect(cmds).toEqual([
      {
        type: "M",
        x: 2,
        y: 3.4,
      },
      {
        type: "C",
        x1: 0.2,
        y1: 2,
        x2: 2,
        y2: 2,
        x: 3,
        y: 3,
      },
      {
        type: "Z",
      },
    ]);

    cmds = Path.parsePathData("M5.1 0.21A2 2.5 0 0123.54 74");

    expect(cmds.length).toBe(3);
    expect(cmds[0].type).toBe("M");
    expect(cmds[1].type).toBe("C");
    expect(cmds[2].type).toBe("C");
  });

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

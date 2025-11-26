import type {
  Corner,
  CubicCommand,
  PathBounds,
  PathCommand,
  Point,
  Rect,
} from "./types";

/**
 * A lightweight, zero‑dependency utility for constructing and manipulating
 * SVG path data programmatically.
 *
 * The `Path` class maintains an ordered list of drawing commands
 * (`M`, `L`, `C`, `Q`, `H`, `V`, `S`, `T`, `Z`) along with an optional
 * design‑space width and height. It provides a fluent, chainable API for
 * building complex vector shapes without manually concatenating SVG `d`
 * strings.
 *
 * This abstraction is intentionally minimal: it does not attempt to parse
 * existing path data, normalize curves, or perform geometric operations.
 * Instead, it focuses on being a predictable, composable builder for
 * generating valid SVG path syntax from explicit command objects.
 *
 * The resulting command list can be serialized via `toPathData()`, making
 * the class suitable for icon generation, procedural geometry, or any
 * workflow where SVG path strings need to be produced dynamically.
 */
export class Path {
  constructor(width = 24, height = width, commands: PathCommand[] = []) {
    this._width = width;
    this._height = height;
    this._commands = commands;
  }

  protected _width: number;
  protected _height: number;
  protected _commands: PathCommand[];

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  get commands() {
    return this._commands;
  }

  /**
   * Move the "pen" to an absolute position without drawing.
   *
   * Adds a `M` (move-to) command to the path, setting the current
   * drawing position to the given coordinates. This does not create
   * a visible line; it simply repositions the starting point for
   * subsequent commands. Returns `this` for fluent chaining.
   *
   * @param x X coordinate of the new starting point
   * @param y Y coordinate of the new starting point
   * @returns The Path instance for chaining
   */
  m(x: number, y: number) {
    this._commands.push({ type: "M", x, y });
    return this;
  }

  /**
   * Move the "pen" to an absolute position from a string input.
   *
   * This is a convenience wrapper around `m(x, y)` that accepts a
   * coordinate string (e.g. `"10 20"`) instead of separate numeric
   * arguments. The string is trimmed, split on whitespace, and parsed
   * into floats. If either value cannot be parsed into a valid number,
   * an error is thrown.
   *
   * Returns `this` for fluent chaining, just like `m`.
   *
   * @param coords A string containing two space-separated numbers ("x y")
   * @returns      The Path instance for chaining
   * @throws       Error if the string cannot be parsed into valid coordinates
   */
  ms(coords: string) {
    const [xStr, yStr] = coords.trim().split(" ");
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);
    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid coordinates string: "${coords}"`);
    }
    return this.m(x, y);
  }

  /**
   * Draw a straight line from the current point to the given absolute coordinates.
   *
   * Adds an `L` (line-to) command to the path, creating a visible line segment
   * from the current pen position to `(x, y)`. Returns `this` for fluent chaining.
   *
   * @param x X coordinate of the line endpoint
   * @param y Y coordinate of the line endpoint
   * @returns The Path instance for chaining
   */
  l(x: number, y: number) {
    this._commands.push({ type: "L", x, y });
    return this;
  }

  /**
   * Draw a straight line from the current point to coordinates parsed from a string.
   *
   * This is a convenience wrapper around `l(x, y)` that accepts a coordinate string
   * (e.g. `"10 20"`) instead of separate numeric arguments. The string is trimmed,
   * split on whitespace, and parsed into floats. If either value cannot be parsed
   * into a valid number, an error is thrown.
   *
   * Returns `this` for fluent chaining, just like `l`.
   *
   * @param coords A string containing two space-separated numbers ("x y")
   * @returns      The Path instance for chaining
   * @throws       Error if the string cannot be parsed into valid coordinates
   */
  ls(coords: string) {
    const [xStr, yStr] = coords.trim().split(" ");
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);
    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid coordinates string: "${coords}"`);
    }
    return this.l(x, y);
  }

  /**
   * Draw a quadratic Bézier curve from the current point to (x, y).
   *
   * Adds a `Q` (quadratic curve-to) command to the path, using (x1, y1)
   * as the control point and (x, y) as the endpoint. Returns `this` for
   * fluent chaining.
   *
   * @param x1 X coordinate of the control point
   * @param y1 Y coordinate of the control point
   * @param x  X coordinate of the curve endpoint
   * @param y  Y coordinate of the curve endpoint
   * @returns  The Path instance for chaining
   */
  q(x1: number, y1: number, x: number, y: number) {
    this._commands.push({ type: "Q", x1, y1, x, y });
    return this;
  }

  /**
   * Draw a quadratic Bézier curve from a string of coordinates.
   *
   * This is a convenience wrapper around `q(x1, y1, x, y)` that accepts
   * a coordinate string (e.g. `"10 20 30 40"` or `"10,20,30,40"`) instead
   * of separate numeric arguments. The string is normalized by replacing
   * commas with spaces, then split into four parts. Each part is parsed
   * into a float. If the string does not contain exactly four values, or
   * any value cannot be parsed into a valid number, an error is thrown.
   *
   * Returns `this` for fluent chaining, just like `q`.
   *
   * @param coords A string containing four numeric values ("x1 y1 x y")
   * @returns      The Path instance for chaining
   * @throws       Error if the string is malformed or contains invalid numbers
   */
  qs(coords: string) {
    const parts = coords.trim().replace(COMMA_REGEX, " ").split(SPACE_REGEX);

    if (parts.length !== 4) {
      throw new Error(`Invalid coordinates string for Q: "${coords}"`);
    }

    const [x1Str, y1Str, xStr, yStr] = parts;

    const x1 = parseFloat(x1Str!);
    const y1 = parseFloat(y1Str!);
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);

    if ([x1, y1, x, y].some((n) => isNaN(n))) {
      throw new Error(`Invalid numeric values in Q string: "${coords}"`);
    }

    return this.q(x1, y1, x, y);
  }

  /**
   * Draw a cubic Bézier curve from the current point to (x, y).
   *
   * Adds a `C` (cubic curve-to) command to the path, using (x1, y1) and
   * (x2, y2) as the two control points, and (x, y) as the endpoint.
   * Returns `this` for fluent chaining.
   *
   * @param x1 X coordinate of the first control point
   * @param y1 Y coordinate of the first control point
   * @param x2 X coordinate of the second control point
   * @param y2 Y coordinate of the second control point
   * @param x  X coordinate of the curve endpoint
   * @param y  Y coordinate of the curve endpoint
   * @returns  The Path instance for chaining
   */
  c(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this._commands.push({ type: "C", x1, y1, x2, y2, x, y });
    return this;
  }

  /**
   * Draw a cubic Bézier curve from a string of coordinates.
   *
   * This is a convenience wrapper around `c(x1, y1, x2, y2, x, y)` that accepts
   * a coordinate string (e.g. `"10 20 30 40 50 60"` or `"10,20,30,40,50,60"`)
   * instead of separate numeric arguments. The string is normalized by replacing
   * commas with spaces, then split into six parts. Each part is parsed into a float.
   *
   * Validation:
   * - The string must contain exactly six numeric values.
   * - If any value cannot be parsed into a valid number, an error is thrown.
   *
   * Returns `this` for fluent chaining, just like `c`.
   *
   * @param coords A string containing six numeric values ("x1 y1 x2 y2 x y")
   * @returns      The Path instance for chaining
   * @throws       Error if the string is malformed or contains invalid numbers
   */
  cs(coords: string) {
    const parts = coords.trim().replace(COMMA_REGEX, " ").split(SPACE_REGEX);

    if (parts.length !== 6) {
      throw new Error(`Invalid coordinates string for C: "${coords}"`);
    }

    const [x1Str, y1Str, x2Str, y2Str, xStr, yStr] = parts;

    const x1 = parseFloat(x1Str!);
    const y1 = parseFloat(y1Str!);
    const x2 = parseFloat(x2Str!);
    const y2 = parseFloat(y2Str!);
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);

    if ([x1, y1, x2, y2, x, y].some((n) => isNaN(n))) {
      throw new Error(`Invalid numeric values in C string: "${coords}"`);
    }

    return this.c(x1, y1, x2, y2, x, y);
  }

  /**
   * Draw a horizontal line from the current point to the given X coordinate.
   *
   * Adds an `H` (horizontal line-to) command to the path, creating a straight
   * line segment along the X axis from the current pen position to `x`.
   * The Y coordinate remains unchanged. Returns `this` for fluent chaining.
   *
   * @param x X coordinate of the line endpoint
   * @returns The Path instance for chaining
   */
  h(x: number) {
    this._commands.push({ type: "H", x });
    return this;
  }

  /**
   * Draw a vertical line from the current point to the given Y coordinate.
   *
   * Adds a `V` (vertical line-to) command to the path, creating a straight
   * line segment along the Y axis from the current pen position to `y`.
   * The X coordinate remains unchanged. Returns `this` for fluent chaining.
   *
   * @param y Y coordinate of the line endpoint
   * @returns The Path instance for chaining
   */
  v(y: number) {
    this._commands.push({ type: "V", y });
    return this;
  }

  /**
   * Draw a smooth quadratic Bézier curve to (x, y).
   *
   * Adds a `T` (shorthand quadratic curve-to) command to the path. This relies
   * on the previous quadratic control point (from a `Q` or `T` command) to
   * calculate the reflected control point automatically. If no prior quadratic
   * exists, it behaves like a straight line to `(x, y)`.
   *
   * Returns `this` for fluent chaining.
   *
   * @param x X coordinate of the curve endpoint
   * @param y Y coordinate of the curve endpoint
   * @returns The Path instance for chaining
   */
  t(x: number, y: number) {
    this._commands.push({ type: "T", x, y });
    return this;
  }

  /**
   * Draw a smooth quadratic Bézier curve to coordinates parsed from a string.
   *
   * This is a convenience wrapper around `t(x, y)` that accepts a coordinate
   * string (e.g. `"10 20"` or `"10,20"`) instead of separate numeric arguments.
   * The string is normalized by replacing commas with spaces, then split into
   * two parts. Each part is parsed into a float. If the string does not contain
   * exactly two values, or either value cannot be parsed into a valid number,
   * an error is thrown.
   *
   * Returns `this` for fluent chaining, just like `t`.
   *
   * @param coords A string containing two numeric values ("x y")
   * @returns      The Path instance for chaining
   * @throws       Error if the string is malformed or contains invalid numbers
   */
  ts(coords: string) {
    const parts = coords.trim().replace(COMMA_REGEX, " ").split(SPACE_REGEX);

    if (parts.length !== 2) {
      throw new Error(`Invalid coordinates string for T: "${coords}"`);
    }

    const [xStr, yStr] = parts;

    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);

    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid numeric values in T string: "${coords}"`);
    }

    return this.t(x, y);
  }

  /**
   * Draw a smooth cubic Bézier curve to (x, y).
   *
   * Adds an `S` (smooth cubic curve-to) command to the path. This is the
   * shorthand cubic form: the first control point is inferred by reflecting
   * the previous cubic control point (from a `C` or `S` command). If no
   * previous cubic exists, the current point is used as the first control.
   *
   * @param x2 X coordinate of the second control point
   * @param y2 Y coordinate of the second control point
   * @param x  X coordinate of the curve endpoint
   * @param y  Y coordinate of the curve endpoint
   * @returns  The Path instance for chaining
   */
  s(x2: number, y2: number, x: number, y: number) {
    this._commands.push({ type: "S", x2, y2, x, y });
    return this;
  }

  /**
   * Draw a smooth cubic Bézier curve from a string of coordinates.
   *
   * Convenience wrapper around `s(x2, y2, x, y)` that accepts a coordinate
   * string (e.g. `"10 20 30 40"` or `"10,20,30,40"`) instead of separate
   * numeric arguments. The string is normalized by replacing commas with
   * spaces, then split into four parts. Each part is parsed into a float.
   *
   * @param coords A string containing four numeric values ("x2 y2 x y")
   * @returns      The Path instance for chaining
   * @throws       Error if the string is malformed or contains invalid numbers
   */
  ss(coords: string) {
    const parts = coords.trim().replace(COMMA_REGEX, " ").split(SPACE_REGEX);

    if (parts.length !== 4) {
      throw new Error(`Invalid coordinates string for S: "${coords}"`);
    }

    const [x2Str, y2Str, xStr, yStr] = parts;

    const x2 = parseFloat(x2Str!);
    const y2 = parseFloat(y2Str!);
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);

    if ([x2, y2, x, y].some((n) => isNaN(n))) {
      throw new Error(`Invalid numeric values in S string: "${coords}"`);
    }

    return this.s(x2, y2, x, y);
  }

  /**
   * Draw an elliptical arc from the current point to (x, y).
   *
   * Converts the arc into cubic Bézier segments using arcToCubic(),
   * and immediately inserts those `C` commands into the path.
   * This ensures only OpenType-compatible commands are stored.
   *
   * @param rx            X radius of the ellipse
   * @param ry            Y radius of the ellipse
   * @param xAxisRotation Rotation of the ellipse’s x-axis in degrees
   * @param largeArcFlag  0 = smaller arc, 1 = larger arc
   * @param sweepFlag     0 = counter-clockwise, 1 = clockwise
   * @param x             X coordinate of the arc endpoint
   * @param y             Y coordinate of the arc endpoint
   * @returns             The Path instance for chaining
   */
  a(
    rx: number,
    ry: number,
    xAxisRotation: number,
    largeArcFlag: 0 | 1,
    sweepFlag: 0 | 1,
    x: number,
    y: number
  ) {
    // Use helper to get current point
    const { x: x0, y: y0 } = this.getCurrentPoint();

    // Convert arc to cubic segments
    const beziers: CubicCommand[] = this.arcToCubic(
      x0,
      y0,
      rx,
      ry,
      xAxisRotation,
      largeArcFlag,
      sweepFlag,
      x,
      y
    );

    this._commands.push(...beziers);

    return this;
  }

  /**
   * Draw an elliptical arc from a string of parameters, as found in
   * an SVG path `d` attribute after a lowercase `a` command.
   *
   * Example: "2 2 0 1 0 14 14" or "2,2,0,1,0,14,14"
   *
   * Convenience wrapper around `a(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y)`.
   * The string is normalized by replacing commas with spaces, then split into
   * seven parts. Each part is parsed into a float or integer flag.
   *
   * @param params A string containing seven numeric values ("rx ry xAxisRotation largeArcFlag sweepFlag x y")
   * @returns      The Path instance for chaining
   * @throws       Error if the string is malformed or contains invalid numbers
   */
  as(params: string) {
    const parts = params.trim().replace(COMMA_REGEX, " ").split(SPACE_REGEX);

    if (parts.length !== 7) {
      throw new Error(`Invalid parameter string for A: "${params}"`);
    }

    const [rxStr, ryStr, rotStr, largeStr, sweepStr, xStr, yStr] = parts;

    const rx = parseFloat(rxStr!);
    const ry = parseFloat(ryStr!);
    const xAxisRotation = parseFloat(rotStr!);
    const largeArcFlag = parseInt(largeStr!, 10) as 0 | 1;
    const sweepFlag = parseInt(sweepStr!, 10) as 0 | 1;
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);

    if (
      [rx, ry, xAxisRotation, x, y].some((n) => isNaN(n)) ||
      ![0, 1].includes(largeArcFlag) ||
      ![0, 1].includes(sweepFlag)
    ) {
      throw new Error(`Invalid numeric values in A string: "${params}"`);
    }

    return this.a(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y);
  }

  /**
   * Close the current subpath.
   *
   * Adds a `Z` (close-path) command to the path, which draws a straight
   * line from the current point back to the starting point of the
   * current subpath. This effectively closes the shape, ensuring that
   * fills and strokes are rendered as a complete polygon. Returns `this`
   * for fluent chaining.
   *
   * @returns The Path instance for chaining
   */
  close() {
    this._commands.push({ type: "Z" });
    return this;
  }

  /**
   * Convert an SVG elliptical arc into one or more cubic Bézier segments.
   *
   * Implements the algorithm from the SVG spec:
   * https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
   *
   * @param x0 Starting x coordinate (current point)
   * @param y0 Starting y coordinate (current point)
   * @param rx X radius of the ellipse
   * @param ry Y radius of the ellipse
   * @param xAxisRotation Rotation of the ellipse’s x-axis in degrees
   * @param largeArcFlag 0 = smaller arc, 1 = larger arc
   * @param sweepFlag    0 = counter-clockwise, 1 = clockwise
   * @param x End x coordinate
   * @param y End y coordinate
   * @returns Array of cubic Bézier segments (CubicCommand[])
   */
  arcToCubic(
    x0: number,
    y0: number,
    rx: number,
    ry: number,
    xAxisRotation: number,
    largeArcFlag: 0 | 1,
    sweepFlag: 0 | 1,
    x: number,
    y: number
  ): CubicCommand[] {
    // Degenerate: same point -> nothing to draw
    if (x0 === x && y0 === y) return [];

    // Degenerate: zero radii -> straight line
    if (rx === 0 || ry === 0) {
      return [
        {
          type: "C",
          x1: x0,
          y1: y0,
          x2: x,
          y2: y,
          x,
          y,
        },
      ];
    }

    // Rotation in radians
    const phi = (Math.PI / 180) * xAxisRotation;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // Step 1: transform to ellipse space
    const dx2 = (x0 - x) / 2;
    const dy2 = (y0 - y) / 2;
    let x1p = cosPhi * dx2 + sinPhi * dy2;
    let y1p = -sinPhi * dx2 + cosPhi * dy2;

    // Compensate out-of-range radii
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) {
      const scale = Math.sqrt(lambda);
      rx *= scale;
      ry *= scale;
    }

    // Step 2: center calculation in ellipse space
    const rxSq = rx * rx;
    const rySq = ry * ry;
    const x1pSq = x1p * x1p;
    const y1pSq = y1p * y1p;

    let radicant = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
    if (radicant < 0) radicant = 0;

    radicant /= rxSq * y1pSq + rySq * x1pSq;
    radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);

    const cxp = (radicant * rx * y1p) / ry;
    const cyp = (radicant * -ry * x1p) / rx;

    // Step 3: transform center back to original coords
    const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y) / 2;

    // Step 4: angles
    const unitAngle = (ux: number, uy: number, vx: number, vy: number) => {
      const sign = ux * vy - uy * vx < 0 ? -1 : 1;
      let dot = ux * vx + uy * vy;
      if (dot > 1) dot = 1;
      if (dot < -1) dot = -1;
      return sign * Math.acos(dot);
    };

    const v1x = (x1p - cxp) / rx;
    const v1y = (y1p - cyp) / ry;
    const v2x = (-x1p - cxp) / rx;
    const v2y = (-y1p - cyp) / ry;

    let theta1 = unitAngle(1, 0, v1x, v1y);
    let deltaTheta = unitAngle(v1x, v1y, v2x, v2y);

    if (sweepFlag === 0 && deltaTheta > 0) deltaTheta -= Math.PI * 2;
    if (sweepFlag === 1 && deltaTheta < 0) deltaTheta += Math.PI * 2;

    // Segment splitting (<= 90° each)
    const segments = Math.max(
      Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)),
      1
    );
    const dTheta = deltaTheta / segments;

    const result: CubicCommand[] = [];

    for (let i = 0; i < segments; i++) {
      const t1 = theta1;
      const t2 = t1 + dTheta;

      const cosT1 = Math.cos(t1);
      const sinT1 = Math.sin(t1);
      const cosT2 = Math.cos(t2);
      const sinT2 = Math.sin(t2);

      // Position on rotated/scaled ellipse
      const p1x = cx + rx * (cosPhi * cosT1) - ry * (sinPhi * sinT1);
      const p1y = cy + rx * (sinPhi * cosT1) + ry * (cosPhi * sinT1);
      const p2x = cx + rx * (cosPhi * cosT2) - ry * (sinPhi * sinT2);
      const p2y = cy + rx * (sinPhi * cosT2) + ry * (cosPhi * sinT2);

      // Derivative vectors (R * rot * [-sin t, cos t])
      const d1x = -rx * cosPhi * sinT1 - ry * sinPhi * cosT1;
      const d1y = -rx * sinPhi * sinT1 + ry * cosPhi * cosT1;
      const d2x = -rx * cosPhi * sinT2 - ry * sinPhi * cosT2;
      const d2y = -rx * sinPhi * sinT2 + ry * cosPhi * cosT2;

      // Control points using alpha
      const alpha = (4 / 3) * Math.tan((t2 - t1) / 4);

      const c1x = p1x + alpha * d1x;
      const c1y = p1y + alpha * d1y;
      const c2x = p2x - alpha * d2x;
      const c2y = p2y - alpha * d2y;

      result.push({
        type: "C",
        x1: c1x,
        y1: c1y,
        x2: c2x,
        y2: c2y,
        x: p2x,
        y: p2y,
      });

      theta1 = t2;
    }

    return result;
  }

  /**
   * Append a rectangular subpath, equivalent to an SVG <rect>,
   * with optional global radii and/or per-corner configuration.
   *
   * - If `corners` are provided, each corner can be styled independently
   *   (sharp, rounded, chamfer).
   * - If no corner config is given, global `rx`/`ry` are applied to all corners.
   * - Individual corner config takes precedence over global radii.
   * - If both global radii are 0 and no corner config is given, all corners are sharp.
   *
   * @param config Rect config object with base rect fields, optional rx/ry,
   *               and optional per-corner overrides.
   * @returns      The Path instance for chaining
   */
  rect(config: Rect) {
    const { x, y, width, height } = config;
    let rx = config.rx ?? 0;
    let ry = config.ry ?? rx;

    // Clamp radii to half the dimensions, per SVG spec
    rx = Math.min(rx, width / 2);
    ry = Math.min(ry, height / 2);

    // Helper to resolve a corner: prefer explicit config, else global radii, else sharp
    const resolveCorner = (corner?: Corner): Corner => {
      if (corner) return corner;
      return rx === 0 && ry === 0
        ? { kind: "sharp" }
        : { kind: "rounded", rx, ry };
    };

    const tl = resolveCorner(config.corners?.tl);
    const tr = resolveCorner(config.corners?.tr);
    const br = resolveCorner(config.corners?.br);
    const bl = resolveCorner(config.corners?.bl);

    // Start at TL inset if rounded/chamfer, else sharp
    if (tl.kind === "rounded" || tl.kind === "chamfer") {
      this.m(x + (tl.rx ?? 0), y);
    } else {
      this.m(x, y);
    }

    // Top edge → TR corner
    this.corner("tr", x + width, y, tr);

    // Right edge → BR corner
    this.corner("br", x + width, y + height, br);

    // Bottom edge → BL corner
    this.corner("bl", x, y + height, bl);

    // Left edge → TL corner
    this.corner("tl", x, y, tl);

    return this.close();
  }

  /**
   * Append a corner segment to the current path.
   *
   * This method abstracts the drawing of a single rectangle corner, based on its
   * position (`side` = "tl" | "tr" | "br" | "bl") and the desired corner style.
   *
   * - For `corner.kind === "rounded"`: draws a quadratic Bézier curve from the
   *   inset point into the corner and out along the adjacent edge, using the
   *   provided radii (`rx`, `ry`).
   * - For `corner.kind === "chamfer"`: draws two straight line segments that
   *   cut diagonally across the corner, offset by (`rx`, `ry`).
   * - For `corner.kind === "sharp"`: simply draws a straight line directly to
   *   the corner coordinate (`x`, `y`).
   *
   * The caller supplies the absolute corner coordinates (`x`, `y`) and the
   * configuration object (`Corner`). This method ensures the correct inset
   * line and curve/diagonal are emitted, so the caller does not need to compute
   * inset points manually.
   *
   * @param side Which corner of the rectangle is being drawn ("tl", "tr", "br", "bl")
   * @param x    Absolute x coordinate of the corner
   * @param y    Absolute y coordinate of the corner
   * @param corner Corner configuration (sharp, rounded with rx/ry, or chamfer with rx/ry)
   * @returns The Path instance for chaining
   */
  corner(
    side: "tl" | "tr" | "br" | "bl",
    x: number,
    y: number,
    corner: Corner
  ) {
    switch (corner.kind) {
      case "rounded":
        switch (side) {
          case "tr":
            this.l(x - corner.rx, y);
            this.q(x, y, x, y + corner.ry);
            break;
          case "br":
            this.l(x, y - corner.ry);
            this.q(x, y, x - corner.rx, y);
            break;
          case "bl":
            this.l(x + corner.rx, y);
            this.q(x, y, x, y - corner.ry);
            break;
          case "tl":
            this.l(x, y + corner.ry);
            this.q(x, y, x + corner.rx, y);
            break;
        }
        break;

      case "chamfer":
        switch (side) {
          case "tr":
            this.l(x - corner.rx, y);
            this.l(x, y + corner.ry);
            break;
          case "br":
            this.l(x, y - corner.ry);
            this.l(x - corner.rx, y);
            break;
          case "bl":
            this.l(x + corner.rx, y);
            this.l(x, y - corner.ry);
            break;
          case "tl":
            this.l(x, y + corner.ry);
            this.l(x + corner.rx, y);
            break;
        }
        break;

      case "sharp":
        // nothing special, just line directly to the corner
        this.l(x, y);
        break;
    }
    return this;
  }

  /**
   * Convenience wrapper for drawing a rounded corner.
   *
   * Delegates to the generic `corner` method with a Corner
   * of kind `"rounded"`. This avoids duplicating logic and keeps
   * the API ergonomic when you only need rounded corners.
   *
   * @param side Which corner of the rectangle ("tl" | "tr" | "br" | "bl")
   * @param x    Absolute x coordinate of the corner
   * @param y    Absolute y coordinate of the corner
   * @param rx   Horizontal radius
   * @param ry   Vertical radius
   * @returns The Path instance for chaining
   */
  roundedCorner(
    side: "tl" | "tr" | "br" | "bl",
    x: number,
    y: number,
    rx: number,
    ry: number
  ) {
    return this.corner(side, x, y, { kind: "rounded", rx, ry });
  }

  /**
   * Convenience wrapper for drawing a chamfered corner.
   *
   * Delegates to the generic `corner` method with a Corner
   * of kind `"chamfer"`. This avoids duplicating logic and keeps
   * the API ergonomic when you only need chamfered corners.
   *
   * @param side Which corner of the rectangle ("tl" | "tr" | "br" | "bl")
   * @param x    Absolute x coordinate of the corner
   * @param y    Absolute y coordinate of the corner
   * @param rx   Horizontal chamfer offset
   * @param ry   Vertical chamfer offset
   * @returns The Path instance for chaining
   */
  chamferCorner(
    side: "tl" | "tr" | "br" | "bl",
    x: number,
    y: number,
    rx: number,
    ry: number
  ) {
    return this.corner(side, x, y, { kind: "chamfer", rx, ry });
  }

  /**
   * Append an elliptical subpath, equivalent to an SVG <ellipse>.
   *
   * Approximates the ellipse using four cubic Bézier curves.
   * The approximation uses the constant kappa = 4*(√2 - 1)/3 ≈ 0.5522847498,
   * which gives a visually accurate ellipse when applied to both radii.
   *
   * @param cx Center x coordinate
   * @param cy Center y coordinate
   * @param rx Horizontal radius
   * @param ry Vertical radius
   * @returns  This Path with the ellipse appended
   */
  ellipse(cx: number, cy: number, rx: number, ry: number) {
    const kappa = 0.5522847498307936;

    const ox = rx * kappa;
    const oy = ry * kappa;

    const x0 = cx - rx;
    const y0 = cy;
    const x1 = cx;
    const y1 = cy - ry;
    const x2 = cx + rx;
    const y3 = cy + ry;

    this.m(x0, y0);

    // Top-left quadrant
    this.c(x0, y0 - oy, x1 - ox, y1, x1, y1);

    // Top-right quadrant
    this.c(x1 + ox, y1, x2, y0 - oy, x2, y0);

    // Bottom-right quadrant
    this.c(x2, y0 + oy, x1 + ox, y3, x1, y3);

    // Bottom-left quadrant
    this.c(x1 - ox, y3, x0, y0 + oy, x0, y0);

    return this.close();
  }

  /**
   * Append a circular subpath, equivalent to an SVG <circle>.
   *
   * Internally delegates to `ellipse` with equal radii for x and y.
   * Approximates the circle using four cubic Bézier curves via the
   * kappa constant, ensuring a visually accurate circle.
   *
   * @param cx Center x coordinate
   * @param cy Center y coordinate
   * @param r  Radius of the circle
   * @returns  This Path with the circle appended
   */
  circle(cx: number, cy: number, r: number) {
    return this.ellipse(cx, cy, r, r);
  }

  /**
   * Compute the axis-aligned bounding box of the path commands.
   *
   * Iterates over all stored commands and collects any coordinate values
   * they define (`x`, `y`, `x1`, `y1`, `x2`, `y2`). The minimum and maximum
   * values across both axes are tracked to determine the rectangular bounds
   * that enclose the path geometry.
   *
   * @returns { minX, minY, maxX, maxY } for the drawn path
   */
  getBounds(): PathBounds {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const cmd of this._commands) {
      const xs: number[] = [];
      const ys: number[] = [];
      if ("x" in cmd) xs.push(cmd.x);
      if ("y" in cmd) ys.push(cmd.y);
      if ("x1" in cmd) xs.push(cmd.x1);
      if ("y1" in cmd) ys.push(cmd.y1);
      if ("x2" in cmd) xs.push(cmd.x2);
      if ("y2" in cmd) ys.push(cmd.y2);
      for (const x of xs) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      for (const y of ys) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    return { minX, minY, maxX, maxY };
  }

  /**
   * Return the geometric center of the drawn commands.
   *
   * This computes the midpoint of the axis-aligned bounding box
   * enclosing all path commands.
   *
   * @returns { x, y } center of the command bounds
   */
  getCenter(): Point {
    const bounds = this.getBounds();
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }

  /**
   * Return the full canvas bounds.
   *
   * This is the design-space rectangle the path is defined in from (0,0) to (width,height).
   *
   * @returns { minX, minY, maxX, maxY } for the canvas box
   */
  getCanvasBounds(): PathBounds {
    return { minX: 0, minY: 0, maxX: this.width, maxY: this.height };
  }

  /**
   * Return the geometric center of the canvas box.
   *
   * This is simply the midpoint of the full design-space rectangle
   * (0,0) → (width,height).
   *
   * @returns { x, y } center of the canvas
   */
  getCanvasCenter(): Point {
    return {
      x: this._width / 2,
      y: this._height / 2,
    };
  }

  /**
   * Returns the current drawing point of the path.
   *
   * Iterates through all recorded commands and determines the latest
   * endpoint coordinates, taking into account special cases:
   * - `M` sets a new subpath start and current point.
   * - `L`, `T`, `Q`, `C`, `S` update both x and y to their endpoint.
   * - `H` updates only the x coordinate.
   * - `V` updates only the y coordinate.
   * - `Z` closes the subpath and resets the current point to the last `M`.
   *
   * If no commands exist, the origin `{ x: 0, y: 0 }` is returned.
   *
   * This method is safe to expose publicly, as it provides a convenient way
   * to query the current pen position for building or inspecting paths.
   */
  getCurrentPoint(): Point {
    if (this._commands.length === 0) {
      return { x: 0, y: 0 };
    }

    let x = 0;
    let y = 0;
    let subpathStartX = 0;
    let subpathStartY = 0;

    for (const cmd of this._commands) {
      switch (cmd.type) {
        case "M":
          x = cmd.x;
          y = cmd.y;
          subpathStartX = x;
          subpathStartY = y;
          break;

        case "L":
        case "T":
          x = cmd.x;
          y = cmd.y;
          break;

        case "H":
          x = cmd.x;
          break;

        case "V":
          y = cmd.y;
          break;

        case "Q":
          x = cmd.x;
          y = cmd.y;
          break;

        case "C":
          x = cmd.x;
          y = cmd.y;
          break;

        case "S":
          x = cmd.x;
          y = cmd.y;
          break;

        case "Z":
          x = subpathStartX;
          y = subpathStartY;
          break;
      }
    }

    return { x, y };
  }

  /**
   * Scale all commands in this path in place.
   *
   * - Multiplies all coordinates by the given scale factors.
   * - If only `sx` is provided, both axes are scaled uniformly.
   * - Scaling is performed around the given center point `(cx, cy)`.
   * - By default, the center is the shape’s bounding box midpoint,
   *   so the path grows/shrinks around its own geometric center.
   * - This is the purest form of scaling: the shape expands/contracts
   *   symmetrically without drifting relative to itself.
   * - You can override `cx, cy` to scale around the canvas center or origin.
   *
   * Returns `this` for chaining.
   *
   * @param sx Scale factor for x axis
   * @param sy Optional scale factor for y axis (defaults to sx)
   * @param cx Optional center x (default bounding box center)
   * @param cy Optional center y (default bounding box center)
   * @returns  The Path instance for chaining
   */
  scale(sx: number, sy: number = sx, cx?: number, cy?: number) {
    const center = this.getCenter();

    cx = cx ?? center.x;
    cy = cy ?? center.y;

    this._mapCoords((x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      return { x: dx * sx + cx, y: dy * sy + cy };
    });
    return this;
  }

  /**
   * Translate this path by absolute offsets, mutating in place.
   *
   * This method applies a uniform shift to all coordinates in the path,
   * regardless of the underlying coordinate system (e.g. SVG viewBox units,
   * font em-square units, or any other grid). It does not perform scaling,
   * axis inversion, or baseline adjustments — it simply adds dx and dy to
   * every relevant coordinate.
   *
   * @param dx Offset in X (units depend on the current coordinate system)
   * @param dy Offset in Y (units depend on the current coordinate system)
   * @returns The Path instance for chaining
   */
  translate(dx: number, dy: number) {
    this._mapCoords((x, y) => ({ x: x + dx, y: y + dy }));
    return this;
  }

  /**
   * Rotate the path around a given center.
   *
   * @param angle Rotation angle in radians
   * @param cx    Optional center x (default 0)
   * @param cy    Optional center y (default 0)
   * @returns The Path instance for chaining
   */
  rotate(angle: number, cx: number = 0, cy: number = 0) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    this._mapCoords((x, y) => {
      // translate to origin
      const dx = x - cx;
      const dy = y - cy;
      // rotate
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      // translate back
      return { x: rx + cx, y: ry + cy };
    });

    return this;
  }

  /**
   * Rotate the path around a given center, using degrees.
   *
   * @param angleDeg Rotation angle in degrees
   * @param cx       Optional center x (default 0)
   * @param cy       Optional center y (default 0)
   * @returns The Path instance for chaining
   */
  rotateDeg(angleDeg: number, cx: number = 0, cy: number = 0) {
    const angleRad = (Math.PI / 180) * angleDeg;
    return this.rotate(angleRad, cx, cy);
  }

  /**
   * Flip the path horizontally (mirror across a vertical axis).
   *
   * Each command’s x coordinate is remapped as (width - x).
   * Control points are also flipped. Vertical-only commands (V) remain unchanged.
   *
   * @param width Optional width of the design space to flip within.
   *              Defaults to this.width if not provided.
   * @returns The Path instance for chaining
   */
  flipX(width: number = this.width) {
    this._mapCoords((x, y) => ({ x: width - x, y }));
    return this;
  }

  /**
   * Flip the path vertically (mirror across a horizontal axis).
   *
   * Each command’s y coordinate is remapped as (height - y).
   * Control points are also flipped. Horizontal-only commands (H) remain unchanged.
   *
   * @param height Optional height of the design space to flip within.
   *               Defaults to this.height if not provided.
   * @returns The Path instance for chaining
   */
  flipY(height: number = this.height) {
    this._mapCoords((x, y) => ({ x, y: height - y }));
    return this;
  }

  /**
   * Apply a coordinate transform function to all commands.
   *
   * The transform function receives (x,y) and returns a new {x,y}.
   * Each command type is remapped accordingly.
   */
  protected _mapCoords(fn: (x: number, y: number) => Point): void {
    this._commands = this._commands.map((cmd) => {
      switch (cmd.type) {
        case "M":
        case "L":
        case "T": {
          const p = fn(cmd.x, cmd.y);
          return { type: cmd.type, x: p.x, y: p.y };
        }
        case "H": {
          const p = fn(cmd.x, 0); // only x matters
          return { type: "H", x: p.x };
        }
        case "V": {
          const p = fn(0, cmd.y); // only y matters
          return { type: "V", y: p.y };
        }
        case "Q": {
          const c = fn(cmd.x1, cmd.y1);
          const p = fn(cmd.x, cmd.y);
          return { type: "Q", x1: c.x, y1: c.y, x: p.x, y: p.y };
        }
        case "C": {
          const c1 = fn(cmd.x1, cmd.y1);
          const c2 = fn(cmd.x2, cmd.y2);
          const p = fn(cmd.x, cmd.y);
          return {
            type: "C",
            x1: c1.x,
            y1: c1.y,
            x2: c2.x,
            y2: c2.y,
            x: p.x,
            y: p.y,
          };
        }
        case "S": {
          const c2 = fn(cmd.x2, cmd.y2);
          const p = fn(cmd.x, cmd.y);
          return { type: "S", x2: c2.x, y2: c2.y, x: p.x, y: p.y };
        }
        case "Z":
          return { type: "Z" };
      }
    });
  }

  /**
   * Center this path inside a target bounding box, mutating in place.
   *
   * Computes the bounding box of the current path commands and translates
   * the path so that its shape is centered within the specified target box.
   *
   * - If parameters are omitted, the default box is (0,0) → (width,height).
   * - This allows centering inside arbitrary rectangles, including offset boxes,
   *   enabling both centering and translation in one step.
   *
   * @param minX Minimum x of target box (default 0)
   * @param minY Minimum y of target box (default 0)
   * @param maxX Maximum x of target box (default this.width)
   * @param maxY Maximum y of target box (default this.height)
   * @returns The Path instance for chaining
   */
  center(
    minX: number = 0,
    minY: number = 0,
    maxX: number = this.width,
    maxY: number = this.height
  ) {
    const bounds = this.getBounds();

    const shapeWidth = bounds.maxX - bounds.minX;
    const shapeHeight = bounds.maxY - bounds.minY;

    const targetWidth = maxX - minX;
    const targetHeight = maxY - minY;

    const dx = minX + (targetWidth - shapeWidth) / 2 - bounds.minX;
    const dy = minY + (targetHeight - shapeHeight) / 2 - bounds.minY;

    return this.translate(dx, dy);
  }

  /**
   * Scale this path so it fits inside the given width/height.
   *
   * - Scales the shape to fit inside the box defined by the given width/height.
   * - Defaults to the full design canvas (this.width × this.height).
   * - If `preserveAspect` is true, uses uniform scaling (same factor for x and y).
   *   Otherwise scales independently along each axis.
   * - Does not translate; the path remains anchored at its current position.
   *
   * @param targetWidth    Target width to fit into (default this.width)
   * @param targetHeight   Target height to fit into (default this.height)
   * @param preserveAspect Whether to preserve aspect ratio (default true)
   * @returns              The Path instance for chaining
   */
  fit(
    targetWidth: number = this._width,
    targetHeight: number = this._height,
    preserveAspect: boolean = true
  ) {
    const cmdBounds = this.getBounds();

    const shapeWidth = cmdBounds.maxX - cmdBounds.minX;
    const shapeHeight = cmdBounds.maxY - cmdBounds.minY;

    if (shapeWidth === 0 || shapeHeight === 0) {
      return this; // nothing to fit
    }

    // scale factors
    let sx = targetWidth / shapeWidth;
    let sy = targetHeight / shapeHeight;

    if (preserveAspect) {
      const s = Math.min(sx, sy); // "contain"
      sx = s;
      sy = s;
    }

    this.scale(sx, sy);

    return this;
  }

  /**
   * Convert all stored commands into an SVG path `d` attribute string.
   *
   * Iterates over the internal command list and serializes each one
   * into its corresponding SVG syntax. Coordinates are joined with spaces.
   *
   * @returns SVG path data string
   */
  toPathData(): string {
    return this._commands
      .map((cmd) => {
        switch (cmd.type) {
          case "M":
          case "L":
          case "T":
            return `${cmd.type} ${cmd.x} ${cmd.y}`;
          case "H":
            return `H ${cmd.x}`;
          case "V":
            return `V ${cmd.y}`;
          case "Q":
            return `Q ${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`;
          case "C":
            return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
          case "S":
            return `S ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
          case "Z":
            return "Z";
          default:
            return "";
        }
      })
      .join(" ");
  }

  /**
   * Create a deep copy of this Path.
   *
   * This method duplicates the internal command list and source dimensions,
   * returning a new Path instance. Use this when you want to branch
   * or reuse a path without mutating the original.
   *
   * @returns A new Path with identical commands and source width/height
   */
  clone(): Path {
    const copiedCommands = this._commands.map((cmd) => ({ ...cmd }));
    return new Path(this._width, this._height, copiedCommands);
  }

  /**
   * Merge multiple Path instances into a single path.
   *
   * This static convenience method creates a new Path with the given
   * width/height (defaulting to 24×24) and appends the command lists from all
   * provided paths into its internal command array. The result is a single
   * composite path that contains the concatenated drawing instructions of
   * each input.
   *
   * Note: This performs a shallow merge of commands; it does not normalize
   * coordinate systems or apply transforms. All paths are assumed to share
   * the same source width/height and coordinate space.
   *
   * @param paths   Array of Path instances to merge
   * @param width   Optional source width for the merged path (default 24)
   * @param height  Optional source height for the merged path (defaults to width)
   * @returns       A new Path containing all commands from the input paths
   */
  static merge(
    paths: Path[],
    width: number = 24,
    height: number = width
  ): Path {
    const merged = new Path(width, height);
    for (const p of paths) {
      merged._commands.push(...p.commands);
    }
    return merged;
  }
}

const COMMA_REGEX = /,/g;
const SPACE_REGEX = /\s+/;

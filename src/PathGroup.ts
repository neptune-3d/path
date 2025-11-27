import type { Path } from "./Path";
import type { PathBounds } from "./types";

/**
 * Represents a collection of Path instances that can be transformed together
 * as if they were a single merged shape.
 *
 * - Encapsulates multiple Path objects and provides group-level operations.
 * - Computes a combined bounding box across all paths for uniform transforms.
 * - Supports scaling and fitting methods that apply to the entire group,
 *   preserving relative positions and proportions of individual paths.
 * - Useful for scenarios where you want to treat several independent paths
 *   as one logical unit without actually merging their command data.
 *
 * Example:
 * ```ts
 * const group = new PathGroup([path1, path2, path3]);
 * group.scale(2);       // scales all paths together around the group center
 * group.fit(200, 200);  // fits the group into a 200×200 box
 * ```
 */
export class PathGroup {
  constructor(paths: Path[]) {
    this._paths = paths;
  }

  protected _paths: Path[];

  get paths(): Path[] {
    return this._paths;
  }

  /**
   * Compute the combined bounding box of all paths in the group.
   *
   * - Iterates over each Path instance and collects its individual bounds.
   * - Returns the minimum and maximum x/y values across all paths,
   *   effectively describing the smallest rectangle that encloses the entire group.
   * - If the group is empty, returns a degenerate box `{ minX: 0, minY: 0, maxX: 0, maxY: 0 }`.
   *
   * @returns An object with `{ minX, minY, maxX, maxY }` representing
   *          the combined bounding box of the group.
   */
  getBounds(): PathBounds {
    if (this._paths.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    const allBounds = this._paths.map((p) => p.getBounds());
    const minX = Math.min(...allBounds.map((b) => b.minX));
    const minY = Math.min(...allBounds.map((b) => b.minY));
    const maxX = Math.max(...allBounds.map((b) => b.maxX));
    const maxY = Math.max(...allBounds.map((b) => b.maxY));
    return { minX, minY, maxX, maxY };
  }

  /**
   * Translate all paths in the group by absolute offsets, mutating in place.
   *
   * - Applies a uniform shift to every coordinate in every Path of the group.
   * - The translation is performed consistently across the group, so their
   *   relative positions remain unchanged.
   * - Does not perform scaling, axis inversion, or baseline adjustments —
   *   it simply adds `dx` and `dy` to all relevant coordinates.
   * - Useful for moving the entire group together in the current coordinate system
   *   (e.g. SVG viewBox units, font em-square units, or any other grid).
   *
   * @param dx Offset in X (units depend on the current coordinate system)
   * @param dy Offset in Y (units depend on the current coordinate system)
   * @returns The PathGroup instance for chaining
   */
  translate(dx: number, dy: number): this {
    this._paths.forEach((p) => p.translate(dx, dy));
    return this;
  }

  /**
   * Scale all paths in the group together as if they were merged.
   *
   * - Computes the combined bounding box of the group to determine a shared center.
   * - Applies the same scale factors to every path relative to that shared center,
   *   preserving their relative positions and proportions.
   * - If only `sx` is provided, both axes are scaled uniformly.
   * - You can override the center point `(cx, cy)` to scale around a custom anchor
   *   (e.g. the canvas origin or another reference point).
   * - Returns `this` for chaining.
   *
   * @param sx Scale factor for the x axis
   * @param sy Optional scale factor for the y axis (defaults to `sx`)
   * @param cx Optional center x (default = group bounding box center)
   * @param cy Optional center y (default = group bounding box center)
   * @returns  The PathGroup instance for chaining
   */
  scale(sx: number, sy: number = sx, cx?: number, cy?: number): this {
    const bounds = this.getBounds();
    const centerX = cx ?? bounds.minX + (bounds.maxX - bounds.minX) / 2;
    const centerY = cy ?? bounds.minY + (bounds.maxY - bounds.minY) / 2;

    this._paths.forEach((p) => p.scale(sx, sy, centerX, centerY));
    return this;
  }

  /**
   * Rotate all paths in the group around a given center, mutating in place.
   *
   * - Delegates to each Path’s own `rotate` method.
   * - By default, rotates around the origin (0,0), but you can provide a custom
   *   center point `(cx, cy)` to rotate around the group’s bounding box center
   *   or any other reference.
   * - Preserves relative positions of paths while rotating them together.
   * - Returns `this` for chaining.
   *
   * @param angle Rotation angle in radians
   * @param cx    Optional center x (default 0)
   * @param cy    Optional center y (default 0)
   * @returns     The PathGroup instance for chaining
   */
  rotate(angle: number, cx: number = 0, cy: number = 0): this {
    this._paths.forEach((p) => p.rotate(angle, cx, cy));
    return this;
  }

  /**
   * Rotate all paths in the group around a given center, using degrees.
   *
   * - Converts the provided angle in degrees to radians and delegates
   *   to the group-level `rotate` method.
   * - Applies the same rotation transform to every Path in the group,
   *   preserving their relative positions while rotating them together.
   * - By default, rotates around the origin (0,0), but you can provide
   *   a custom center `(cx, cy)` such as the group’s bounding box center.
   * - Returns `this` for chaining.
   *
   * @param angleDeg Rotation angle in degrees
   * @param cx       Optional center x (default 0)
   * @param cy       Optional center y (default 0)
   * @returns        The PathGroup instance for chaining
   */
  rotateDeg(angleDeg: number, cx: number = 0, cy: number = 0): this {
    const angleRad = (Math.PI / 180) * angleDeg;
    return this.rotate(angleRad, cx, cy);
  }

  /**
   * Flip the entire group horizontally (mirror across a vertical axis).
   *
   * - Computes the combined bounding box of the group if no width is provided.
   * - Each path’s x coordinate is remapped as `(width - x)`.
   * - Control points are also flipped. Vertical-only commands (V) remain unchanged.
   * - Useful for mirroring the whole group together within a design space.
   *
   * @param width Optional width of the design space to flip within.
   *              Defaults to the group’s bounding box width if not provided.
   * @returns     The PathGroup instance for chaining
   */
  flipX(width?: number): this {
    const bounds = this.getBounds();
    const w = width ?? bounds.maxX - bounds.minX;
    this._paths.forEach((p) => p.flipX(w));
    return this;
  }

  /**
   * Flip the entire group vertically (mirror across a horizontal axis).
   *
   * - Computes the combined bounding box of the group if no height is provided.
   * - Each path’s y coordinate is remapped as `(height - y)`.
   * - Control points are also flipped. Horizontal-only commands (H) remain unchanged.
   * - Useful for mirroring the whole group together within a design space.
   *
   * @param height Optional height of the design space to flip within.
   *               Defaults to the group’s bounding box height if not provided.
   * @returns      The PathGroup instance for chaining
   */
  flipY(height?: number): this {
    const bounds = this.getBounds();
    const h = height ?? bounds.maxY - bounds.minY;
    this._paths.forEach((p) => p.flipY(h));
    return this;
  }

  /**
   * Center the entire group of paths inside a target bounding box, mutating in place.
   *
   * - Computes the combined bounding box of all paths in the group.
   * - Translates every path so that the group’s shape is centered within
   *   the specified target box.
   * - If parameters are omitted, the default box is (0,0) → (targetWidth,targetHeight),
   *   so the group is centered inside the given canvas dimensions.
   * - This allows centering inside arbitrary rectangles, including offset boxes,
   *   enabling both centering and translation in one step.
   *
   * @param minX Minimum x of target box (default 0)
   * @param minY Minimum y of target box (default 0)
   * @param maxX Maximum x of target box (default = group bounding box width)
   * @param maxY Maximum y of target box (default = group bounding box height)
   * @returns The PathGroup instance for chaining
   */
  center(
    minX: number = 0,
    minY: number = 0,
    maxX?: number,
    maxY?: number
  ): this {
    const bounds = this.getBounds();
    maxX = maxX ?? bounds.maxX;
    maxY = maxY ?? bounds.maxY;

    const shapeWidth = bounds.maxX - bounds.minX;
    const shapeHeight = bounds.maxY - bounds.minY;

    const targetWidth = maxX - minX;
    const targetHeight = maxY - minY;

    const dx = minX + (targetWidth - shapeWidth) / 2 - bounds.minX;
    const dy = minY + (targetHeight - shapeHeight) / 2 - bounds.minY;

    return this.translate(dx, dy);
  }

  /**
   * Scale all paths in the group so they fit inside the given width/height.
   *
   * - Computes the combined bounding box of the group to determine its overall size.
   * - Derives scale factors to fit that bounding box into the target dimensions.
   * - If `preserveAspect` is true, applies uniform scaling (same factor for x and y)
   *   so the group is contained proportionally. Otherwise, scales independently along each axis.
   * - Uses the group’s shared center as the anchor point, so all paths expand/contract
   *   together without drifting relative to each other.
   * - Returns `this` for chaining.
   *
   * @param targetWidth    Target width to fit into
   * @param targetHeight   Target height to fit into
   * @param preserveAspect Whether to preserve aspect ratio (default true)
   * @returns              The PathGroup instance for chaining
   */
  fit(
    targetWidth: number,
    targetHeight: number,
    preserveAspect: boolean = true
  ): this {
    const bounds = this.getBounds();
    const shapeWidth = bounds.maxX - bounds.minX;
    const shapeHeight = bounds.maxY - bounds.minY;

    if (shapeWidth === 0 || shapeHeight === 0) return this;

    let sx = targetWidth / shapeWidth;
    let sy = targetHeight / shapeHeight;
    if (preserveAspect) {
      const s = Math.min(sx, sy);
      sx = s;
      sy = s;
    }

    return this.scale(sx, sy);
  }
}

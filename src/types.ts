export type MoveCommand = { type: "M"; x: number; y: number };

export type LineCommand = { type: "L"; x: number; y: number };

export type HCommand = { type: "H"; x: number };

export type VCommand = { type: "V"; y: number };

export type QuadCommand = {
  type: "Q";
  x1: number;
  y1: number;
  x: number;
  y: number;
};

export type CubicCommand = {
  type: "C";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x: number;
  y: number;
};

export type SmoothQuadCommand = { type: "T"; x: number; y: number };

export type SmoothCubicCommand = {
  type: "S";
  x2: number;
  y2: number;
  x: number;
  y: number;
};

export type CloseCommand = { type: "Z" };

export type PathCommand =
  | MoveCommand
  | LineCommand
  | HCommand
  | VCommand
  | QuadCommand
  | CubicCommand
  | SmoothQuadCommand
  | SmoothCubicCommand
  | CloseCommand;

export type Corner =
  | { kind: "sharp" }
  | { kind: "rounded"; rx: number; ry: number }
  | { kind: "chamfer"; rx: number; ry: number };

export type PathBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type Point = { x: number; y: number };

export type Size = { width: number; height: number };

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  ry?: number;
  corners?: {
    tl?: Corner;
    tr?: Corner;
    br?: Corner;
    bl?: Corner;
  };
};

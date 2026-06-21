export type TourId = "home" | "guest-app" | "owner-panel" | "property-detail";

export type TourStepDef = {
  element?: string;
  titleKey: string;
  descriptionKey: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  /** Si true, el paso solo se incluye cuando el selector existe y es visible. */
  optional?: boolean;
};

export type TourDefinition = {
  id: TourId;
  steps: TourStepDef[];
};

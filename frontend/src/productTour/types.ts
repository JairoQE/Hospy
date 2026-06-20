export type TourId = "home" | "guest-app" | "owner-panel";

export type TourStepDef = {
  element?: string;
  titleKey: string;
  descriptionKey: string;
  side?: "top" | "bottom" | "left" | "right";
  /** Si true, el paso solo se incluye cuando el selector existe en el DOM. */
  optional?: boolean;
};

export type TourDefinition = {
  id: TourId;
  steps: TourStepDef[];
};

export type MermaidColorMode = "light" | "dark";

export type MermaidNodeRole =
  | "actor"
  | "process"
  | "decision"
  | "database"
  | "system";

export type MermaidSwatch = {
  name: string;
  fill: string;
  stroke: string;
  color: string;
};

/** Semantic role fills — LoclAI emerald family, tuned per mode. */
export const MERMAID_ROLE_PALETTE_DARK: Record<MermaidNodeRole, MermaidSwatch> =
  {
    actor: {
      name: "mActor",
      fill: "#12352f",
      stroke: "#2dd4bf",
      color: "#f0fdfa",
    },
    process: {
      name: "mProcess",
      fill: "#0f2e24",
      stroke: "#10b981",
      color: "#ecfdf5",
    },
    decision: {
      name: "mDecision",
      fill: "#2a2310",
      stroke: "#d4a017",
      color: "#fffbeb",
    },
    database: {
      name: "mDatabase",
      fill: "#0c2922",
      stroke: "#34d399",
      color: "#ecfdf5",
    },
    system: {
      name: "mSystem",
      fill: "#1a1a1a",
      stroke: "#737373",
      color: "#f5f5f5",
    },
  };

export const MERMAID_ROLE_PALETTE_LIGHT: Record<
  MermaidNodeRole,
  MermaidSwatch
> = {
  actor: {
    name: "mActor",
    fill: "#ccfbf1",
    stroke: "#0d9488",
    color: "#134e4a",
  },
  process: {
    name: "mProcess",
    fill: "#d1fae5",
    stroke: "#059669",
    color: "#064e3b",
  },
  decision: {
    name: "mDecision",
    fill: "#fef3c7",
    stroke: "#d97706",
    color: "#78350f",
  },
  database: {
    name: "mDatabase",
    fill: "#a7f3d0",
    stroke: "#047857",
    color: "#064e3b",
  },
  system: {
    name: "mSystem",
    fill: "#f0f0f0",
    stroke: "#737373",
    color: "#1a1a1a",
  },
};

export function getMermaidRolePalette(mode: MermaidColorMode) {
  return mode === "dark"
    ? MERMAID_ROLE_PALETTE_DARK
    : MERMAID_ROLE_PALETTE_LIGHT;
}

/** Distinct pie slices readable on light / dark backgrounds. */
const PIE_LIGHT = [
  "#059669",
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#65a30d",
  "#0891b2",
  "#4f46e5",
  "#c026d3",
  "#dc2626",
];

const PIE_DARK = [
  "#34d399",
  "#2dd4bf",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#22d3ee",
  "#818cf8",
  "#e879f9",
  "#f87171",
];

function pieVars(colors: string[]) {
  const vars: Record<string, string> = {};
  colors.forEach((c, i) => {
    vars[`pie${i + 1}`] = c;
  });
  return vars;
}

export function getMermaidThemeVariables(
  mode: MermaidColorMode
): Record<string, string | boolean | number> {
  if (mode === "light") {
    return {
      darkMode: false,
      background: "#ffffff",
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
      fontSize: "15px",
      primaryColor: "#d1fae5",
      primaryTextColor: "#064e3b",
      primaryBorderColor: "#059669",
      secondaryColor: "#f0f0f0",
      secondaryTextColor: "#1a1a1a",
      secondaryBorderColor: "#a3a3a3",
      tertiaryColor: "#f5f5f5",
      tertiaryTextColor: "#1a1a1a",
      tertiaryBorderColor: "#d4d4d4",
      mainBkg: "#d1fae5",
      nodeBkg: "#d1fae5",
      nodeBorder: "#059669",
      nodeTextColor: "#064e3b",
      lineColor: "#737373",
      textColor: "#1a1a1a",
      titleColor: "#1a1a1a",
      edgeLabelBackground: "#ffffff",
      clusterBkg: "#f5f5f5",
      clusterBorder: "#e8e8e8",
      noteBkgColor: "#f5f5f5",
      noteTextColor: "#1a1a1a",
      noteBorderColor: "#d4d4d4",
      actorBkg: "#ccfbf1",
      actorBorder: "#0d9488",
      actorTextColor: "#134e4a",
      signalColor: "#525252",
      signalTextColor: "#1a1a1a",
      labelBoxBkgColor: "#ffffff",
      labelBoxBorderColor: "#e8e8e8",
      labelTextColor: "#1a1a1a",
      taskBkgColor: "#d1fae5",
      taskBorderColor: "#059669",
      taskTextColor: "#064e3b",
      taskTextLightColor: "#064e3b",
      taskTextOutsideColor: "#525252",
      activeTaskBkgColor: "#a7f3d0",
      activeTaskBorderColor: "#047857",
      gridColor: "#e8e8e8",
      section0: "#ecfdf5",
      section1: "#f0fdfa",
      section2: "#f5f5f5",
      section3: "#fafafa",
      doneTaskBkgColor: "#f0f0f0",
      doneTaskBorderColor: "#a3a3a3",
      critBkgColor: "#fef3c7",
      critBorderColor: "#d97706",
      todayLineColor: "#059669",
      pieTitleTextSize: "16px",
      pieTitleTextColor: "#1a1a1a",
      pieSectionTextColor: "#ffffff",
      pieLegendTextColor: "#1a1a1a",
      pieStrokeColor: "#ffffff",
      pieStrokeWidth: "1px",
      pieOuterStrokeColor: "#e8e8e8",
      pieOpacity: "1",
      // Sankey / XY scales (LoclAI emerald spectrum)
      cScale0: "#059669",
      cScale1: "#0d9488",
      cScale2: "#2563eb",
      cScale3: "#7c3aed",
      cScale4: "#db2777",
      cScale5: "#ea580c",
      cScale6: "#ca8a04",
      cScale7: "#65a30d",
      cScale8: "#0891b2",
      cScale9: "#4f46e5",
      cScale10: "#c026d3",
      cScale11: "#dc2626",
      ...pieVars(PIE_LIGHT),
    };
  }

  return {
    darkMode: true,
    background: "#0f0f0f",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
    fontSize: "15px",
    primaryColor: "#0f2e24",
    primaryTextColor: "#ecfdf5",
    primaryBorderColor: "#10b981",
    secondaryColor: "#1a1a1a",
    secondaryTextColor: "#f5f5f5",
    secondaryBorderColor: "#525252",
    tertiaryColor: "#171717",
    tertiaryTextColor: "#e5e5e5",
    tertiaryBorderColor: "#404040",
    mainBkg: "#0f2e24",
    nodeBkg: "#0f2e24",
    nodeBorder: "#10b981",
    nodeTextColor: "#ecfdf5",
    lineColor: "#9ca3af",
    textColor: "#f5f5f5",
    titleColor: "#f5f5f5",
    edgeLabelBackground: "#171717",
    clusterBkg: "#141414",
    clusterBorder: "#2a2a2a",
    noteBkgColor: "#1a1a1a",
    noteTextColor: "#f5f5f5",
    noteBorderColor: "#525252",
    actorBkg: "#12352f",
    actorBorder: "#2dd4bf",
    actorTextColor: "#f0fdfa",
    signalColor: "#a3a3a3",
    signalTextColor: "#f5f5f5",
    labelBoxBkgColor: "#171717",
    labelBoxBorderColor: "#2a2a2a",
    labelTextColor: "#f5f5f5",
    taskBkgColor: "#0f2e24",
    taskBorderColor: "#10b981",
    taskTextColor: "#ecfdf5",
    taskTextLightColor: "#ecfdf5",
    taskTextOutsideColor: "#a3a3a3",
    activeTaskBkgColor: "#134e3a",
    activeTaskBorderColor: "#34d399",
    gridColor: "#2a2a2a",
    section0: "#12352f",
    section1: "#0f2e24",
    section2: "#1a1a1a",
    section3: "#171717",
    doneTaskBkgColor: "#1a1a1a",
    doneTaskBorderColor: "#525252",
    critBkgColor: "#2a2310",
    critBorderColor: "#d4a017",
    todayLineColor: "#10b981",
    pieTitleTextSize: "16px",
    pieTitleTextColor: "#f5f5f5",
    pieSectionTextColor: "#0f0f0f",
    pieLegendTextColor: "#f5f5f5",
    pieStrokeColor: "#0f0f0f",
    pieStrokeWidth: "2px",
    pieOuterStrokeColor: "#2a2a2a",
    pieOpacity: "1",
    cScale0: "#34d399",
    cScale1: "#2dd4bf",
    cScale2: "#60a5fa",
    cScale3: "#a78bfa",
    cScale4: "#f472b6",
    cScale5: "#fb923c",
    cScale6: "#fbbf24",
    cScale7: "#a3e635",
    cScale8: "#22d3ee",
    cScale9: "#818cf8",
    cScale10: "#e879f9",
    cScale11: "#f87171",
    ...pieVars(PIE_DARK),
  };
}

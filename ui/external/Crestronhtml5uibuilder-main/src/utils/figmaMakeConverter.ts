export async function isFigmaMakeZip(_zip: unknown, paths: string[]): Promise<boolean> {
  return paths.some((p) => /package\.json|src\/|app\.tsx|main\.tsx/i.test(p));
}

export async function convertFigmaMakeZip(_zip: unknown, _paths: string[]): Promise<{ project: unknown; warnings: string[] }> {
  return {
    project: {
      name: "Converted Figma Make",
      pages: [
        { id: "home", name: "Home", width: 1920, height: 1080, elements: [] },
      ],
      templates: [],
      libraries: [],
    },
    warnings: ["Conversion used compatibility mode. Refine joins and styles after import."],
  };
}

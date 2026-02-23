import { describe, it, expect } from "vitest";
import { joinListSchema } from "./joinListSchema";

const validConfig = {
  schemaVersion: "1.0",
  projectId: "test-project",
  processor: "CP4",
  joins: {
    digital: [{ join: 1, name: "Power", direction: "input" }],
    analog: [{ join: 1, name: "Volume", direction: "output" }],
    serial: []
  }
};

describe("joinListSchema", () => {
  it("accepts a valid join list", () => {
    const result = joinListSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it("rejects missing schemaVersion", () => {
    const { schemaVersion, ...rest } = validConfig;
    const result = joinListSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects wrong schemaVersion", () => {
    const result = joinListSchema.safeParse({ ...validConfig, schemaVersion: "2.0" });
    expect(result.success).toBe(false);
  });

  it("rejects missing projectId", () => {
    const result = joinListSchema.safeParse({ ...validConfig, projectId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects wrong processor", () => {
    const result = joinListSchema.safeParse({ ...validConfig, processor: "CP3" });
    expect(result.success).toBe(false);
  });

  it("normalizes processor case to uppercase", () => {
    const result = joinListSchema.safeParse({ ...validConfig, processor: "cp4" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processor).toBe("CP4");
    }
  });

  it("normalizes direction case to lowercase", () => {
    const config = {
      ...validConfig,
      joins: {
        digital: [{ join: 1, name: "Power", direction: "INPUT" }],
        analog: [],
        serial: []
      }
    };
    const result = joinListSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.joins.digital[0].direction).toBe("input");
    }
  });

  it("coerces string join numbers to integers", () => {
    const config = {
      ...validConfig,
      joins: {
        digital: [{ join: "5", name: "Power", direction: "input" }],
        analog: [],
        serial: []
      }
    };
    const result = joinListSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.joins.digital[0].join).toBe(5);
    }
  });

  it("rejects join number 0", () => {
    const config = {
      ...validConfig,
      joins: {
        digital: [{ join: 0, name: "Power", direction: "input" }],
        analog: [],
        serial: []
      }
    };
    const result = joinListSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("rejects negative join numbers", () => {
    const config = {
      ...validConfig,
      joins: {
        digital: [{ join: -1, name: "Power", direction: "input" }],
        analog: [],
        serial: []
      }
    };
    const result = joinListSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("rejects empty join name", () => {
    const config = {
      ...validConfig,
      joins: {
        digital: [{ join: 1, name: "", direction: "input" }],
        analog: [],
        serial: []
      }
    };
    const result = joinListSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("rejects invalid direction", () => {
    const config = {
      ...validConfig,
      joins: {
        digital: [{ join: 1, name: "Power", direction: "sideways" }],
        analog: [],
        serial: []
      }
    };
    const result = joinListSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("rejects duplicate join numbers within a type", () => {
    const config = {
      ...validConfig,
      joins: {
        digital: [
          { join: 1, name: "Power", direction: "input" },
          { join: 1, name: "Mute", direction: "output" }
        ],
        analog: [],
        serial: []
      }
    };
    const result = joinListSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("allows same join number across different types", () => {
    const config = {
      ...validConfig,
      joins: {
        digital: [{ join: 1, name: "Power", direction: "input" }],
        analog: [{ join: 1, name: "Volume", direction: "output" }],
        serial: [{ join: 1, name: "Display", direction: "input" }]
      }
    };
    const result = joinListSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("allows empty join arrays", () => {
    const config = {
      ...validConfig,
      joins: { digital: [], analog: [], serial: [] }
    };
    const result = joinListSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("treats debugMode as optional", () => {
    const result = joinListSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.debugMode).toBeUndefined();
    }
  });

  it("accepts debugMode when provided", () => {
    const result = joinListSchema.safeParse({ ...validConfig, debugMode: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.debugMode).toBe(true);
    }
  });

  it("rejects missing joins section", () => {
    const { joins, ...rest } = validConfig;
    const result = joinListSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing digital array", () => {
    const config = {
      ...validConfig,
      joins: { analog: [], serial: [] }
    };
    const result = joinListSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

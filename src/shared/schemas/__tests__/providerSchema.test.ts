import { expect, it } from "vitest";
import { zodResponseFormat } from "openai/helpers/zod";
import { ChatlyzerSchemas } from "../zodSchemas";
it("builds strict structured provider schemas for every result including nullable sampling", () => {
  for (const [name, schema] of Object.entries(ChatlyzerSchemas)) {
    const format = zodResponseFormat(schema, name);
    expect(format.json_schema.strict).toBe(true);
    expect(format.json_schema.schema).toHaveProperty("type", "object");
  }
});

import { config } from "dotenv";
import { validateProductionServerEnv } from "../src/shared/config/env.ts";

config();

validateProductionServerEnv({
  ...process.env,
  NODE_ENV: "production",
});

console.log("Production server environment is valid.");

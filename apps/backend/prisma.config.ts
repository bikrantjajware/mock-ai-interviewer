import "dotenv/config";
import { defineConfig, env } from "prisma/config";


export default defineConfig({
  datasource: {
    // url: process.env.DATABASE_URL
     url: env("DATABASE_URL"),
  },
  // skills: {
  //   agents: ["claude", "cursor", "agents", "devin"],
  // },
});



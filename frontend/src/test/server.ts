import { setupServer } from "msw/node";
import { handlers, resetDb } from "./handlers";

resetDb();

export const server = setupServer(...handlers);

import { getAuth } from "firebase/auth";
import { app } from "./config.ts";

export const auth = getAuth(app);
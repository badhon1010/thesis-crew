import { getDatabase } from "firebase/database";
import { app } from "./config";

export const rtdb = getDatabase(app);

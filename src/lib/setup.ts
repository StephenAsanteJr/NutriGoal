import "server-only";
import { db } from "./db";

/** True once at least one approved NutriGoal management account exists. Until then, the first one to sign up becomes the owner. */
export const hasActiveManager = () => !!db().prepare("SELECT 1 FROM users WHERE role = 'manager' AND staff_status = 'active' LIMIT 1").get();

export function validateUiuEmail(email: string, role: "student" | "teacher"): { isValid: boolean; message?: string } {
  const cleanEmail = email.trim().toLowerCase();

  if (role === "student") {
    // Student email format: username + @ + dept prefix + .uiu.ac.bd
    const studentRegex = /^[a-z0-9._%+-]+@bs(cse|eee|ce|pharmacy|bge|eco|ins|english|eds|bus|math|phy)\.uiu\.ac\.bd$/;
    
    if (!studentRegex.test(cleanEmail)) {
      return {
        isValid: false,
        message: "Invalid Student Email! Must be a valid UIU student address (e.g., name123@bscse.uiu.ac.bd).",
      };
    }
  } else if (role === "teacher") {
    // Teacher email format: username + @ + dept + .uiu.ac.bd
    const teacherRegex = /^[a-z0-9._%+-]+@(cse|eee|ce|pharmacy|bge|eco|ins|english|eds|bus|math|phy)\.uiu\.ac\.bd$/;

    if (!teacherRegex.test(cleanEmail)) {
      return {
        isValid: false,
        message: "Invalid Teacher Email! Must be an official UIU faculty address (e.g., name@cse.uiu.ac.bd).",
      };
    }
  }

  return { isValid: true };
}
export const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Electrical & Electronic Engineering",
  "Civil Engineering",
  "Software Engineering",
  "Data Science",
  "Information Technology",
  "Pharmacy",
  "Biotechnology & Genetic Engineering",
  "Business Administration",
  "Economics",
  "Environment & Development Studies",
  "English",
  "Mathematics",
  "Physics",
  "Other",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export interface SkillMatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

// Canonical forms let equivalent profile tags match without treating a partial
// string (for example, "C" in "React") as a skill match.
const skillAliases: Record<string, string> = {
  "artificial intelligence": "ai",
  ai: "ai",
  "machine learning": "machine learning",
  ml: "machine learning",
  "deep learning": "deep learning",
  dl: "deep learning",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  "node.js": "nodejs",
  nodejs: "nodejs",
  "node js": "nodejs",
  "react js": "react",
  reactjs: "react",
  react: "react",
  "c++": "cpp",
  cpp: "cpp",
  "c#": "csharp",
  csharp: "csharp",
  "data science": "data science",
  "computer vision": "computer vision",
  cv: "computer vision",
  "natural language processing": "nlp",
  nlp: "nlp",
};

function canonicalSkill(skill: string) {
  const normalised = skill
    .trim()
    .toLocaleLowerCase()
    .replace(/[_.-]+/g, " ")
    .replace(/\s+/g, " ");

  return skillAliases[normalised] ?? normalised;
}

function uniqueSkills(skills: string[]) {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    const canonical = canonicalSkill(skill);
    if (!canonical || seen.has(canonical)) return false;
    seen.add(canonical);
    return true;
  });
}

/**
 * Calculates how fully a student's skills cover a topic's declared required
 * skills. The returned score is always 0–100 and only reflects required-skill
 * coverage; interests can be used separately for recommendation ordering.
 */
export function calculateSkillMatch(studentSkills: string[] = [], requiredSkills: string[] = []): SkillMatchResult {
  const uniqueStudentSkills = uniqueSkills(studentSkills);
  const uniqueRequiredSkills = uniqueSkills(requiredSkills);
  const studentSkillSet = new Set(uniqueStudentSkills.map(canonicalSkill));
  const matchedSkills = uniqueRequiredSkills.filter((skill) => studentSkillSet.has(canonicalSkill(skill)));
  const missingSkills = uniqueRequiredSkills.filter((skill) => !studentSkillSet.has(canonicalSkill(skill)));

  return {
    score: uniqueRequiredSkills.length === 0 ? 0 : Math.round((matchedSkills.length / uniqueRequiredSkills.length) * 100),
    matchedSkills,
    missingSkills,
  };
}

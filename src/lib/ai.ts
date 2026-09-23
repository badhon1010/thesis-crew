import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API client
const getGenAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY in environment variables.");
  }
  return new GoogleGenerativeAI(apiKey);
};

// Helper function to convert a File object into the format Gemini expects
function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string, mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(",")[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface ExtractedPaperMetadata {
  title?: string;
  authors?: string[];
  venue?: string;
  publicationDate?: string;
  abstract?: string;
  keywords?: string[];
}

export async function extractPaperMetadataPDF(file: File): Promise<ExtractedPaperMetadata> {
  if (!file || file.type !== "application/pdf") {
    throw new Error("Please upload a valid PDF file.");
  }

  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      You are an expert academic assistant. 
      Read the attached research paper (PDF) and extract its metadata into a strict JSON object.
      The JSON object must have exactly the following keys:
      - "title": (string) The title of the paper.
      - "authors": (array of strings) The full names of the authors.
      - "venue": (string) The conference, journal, or preprint server name (e.g. "IEEE TKDE", "NeurIPS", "arXiv"). Leave empty string if not found.
      - "publicationDate": (string) The publication or submission date in YYYY-MM-DD format. If only year is found, use YYYY-01-01. Leave empty string if not found.
      - "keywords": (array of strings) A list of 3 to 6 keywords relevant to the paper. Extract from paper if available, otherwise generate them.
      - "abstract": (string) A concise, one-paragraph summary of the paper focusing on: 1) Problem Statement, 2) Methodology, 3) Key Contributions, 4) Future Work. Do not use headings or bullet points.

      Return ONLY the JSON object.
    `;

    const pdfPart = await fileToGenerativePart(file);
    const result = await model.generateContent([prompt, pdfPart]);
    const response = await result.response;
    return JSON.parse(response.text().trim()) as ExtractedPaperMetadata;
  } catch (error: any) {
    console.error("Error generating AI metadata from PDF:", error);
    throw new Error(error.message || "Failed to extract metadata from PDF.");
  }
}

export interface AIMatchAnalysis {
  matchScore: number;
  strengths: string[];
  gaps: string[];
}

export async function analyzeSkillMatch(studentProfile: any, researchTopic: any): Promise<AIMatchAnalysis> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      You are an expert academic advisor. 
      Analyze the fit between a student's profile and a research topic.
      
      Student Profile:
      - Skills: ${studentProfile.skills?.join(", ") || "None specified"}
      - Research Interests: ${studentProfile.researchInterests || "None specified"}
      
      Research Topic:
      - Title: ${researchTopic.title}
      - Category: ${researchTopic.category}
      - Required Skills: ${researchTopic.requiredSkills?.join(", ") || "None specified"}
      - Description: ${researchTopic.description}
      
      Provide a highly detailed analysis of how well they match.
      Return a strict JSON object with exactly these keys:
      - "matchScore": (number) A score from 0 to 100 representing the fit.
      - "strengths": (array of strings) 2 to 3 reasons why the student is a good fit.
      - "gaps": (array of strings) 1 to 2 skills or areas the student might need to learn or improve for this topic.

      Return ONLY the JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text().trim()) as AIMatchAnalysis;
  } catch (error: any) {
    console.error("Error analyzing skill match:", error);
    throw new Error(error.message || "Failed to analyze skill match.");
  }
}

export function startResearchChat() {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction: `You are a helpful, expert Academic & Research Advisor for Thesis Crew. 
Your goal is to assist students and teachers with research-related questions, methodology, topic selection, literature review strategies, and academic writing tips.
Keep your answers concise, structured, and highly relevant to academic research. Use Markdown formatting when appropriate.`
  });

  return model.startChat({
    history: [],
  });
}

export interface AIRecommendationResult {
  topicId: string;
  matchPercentage: number;
  rationale: string;
}

export async function generateTopRecommendations(studentProfile: any, topics: any[]): Promise<AIRecommendationResult[]> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const simplifiedTopics = topics.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      requiredSkills: t.requiredSkills
    }));

    const prompt = `
      You are an expert academic advisor.
      I have a student profile and a list of available research topics.
      Analyze the fit and return the top 2-3 most recommended topics for this specific student.
      
      Student Profile:
      - Skills: ${studentProfile.skills?.join(", ") || "None specified"}
      - Research Interests: ${studentProfile.researchInterests || "None specified"}
      
      Available Topics:
      ${JSON.stringify(simplifiedTopics, null, 2)}
      
      Return a strict JSON array containing exactly 2 to 3 objects. Each object MUST have these keys:
      - "topicId": (string) The exact id of the recommended topic from the list provided.
      - "matchPercentage": (number) A score from 0 to 100 representing how well the student matches the topic.
      - "rationale": (string) A detailed 2-3 sentence explanation of WHY this topic is a great fit for their specific skills and interests.

      Return ONLY the JSON array.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text().trim()) as AIRecommendationResult[];
  } catch (error: any) {
    console.error("Error generating recommendations:", error);
    throw new Error(error.message || "Failed to generate AI recommendations.");
  }
}

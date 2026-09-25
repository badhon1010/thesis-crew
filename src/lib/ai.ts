import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://thesis-crew-nlp-ai-model.onrender.com";

const getGroqApiKey = () => import.meta.env.VITE_GROQ_API_KEY;
const getGeminiApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

// Initialize the Gemini API client
const getGenAI = () => {
  const apiKey = getGeminiApiKey();
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

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  
  // Extract up to 10 pages to avoid context length limits and performance issues
  const numPages = Math.min(pdf.numPages, 10); 
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }
  
  return fullText;
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

  const groqKey = getGroqApiKey();
  const geminiKey = getGeminiApiKey();

  if (groqKey) {
    // --- GROQ IMPLEMENTATION ---
    try {
      const pdfText = await extractTextFromPDF(file);
      const prompt = `
        You are an expert academic assistant. 
        Read the attached research paper (PDF) text and extract its metadata into a strict JSON object.
        The JSON object must have exactly the following keys:
        - "title": (string) The title of the paper.
        - "authors": (array of strings) The full names of the authors.
        - "venue": (string) The conference, journal, or preprint server name (e.g. "IEEE TKDE", "NeurIPS", "arXiv"). Leave empty string if not found.
        - "publicationDate": (string) The publication or submission date in YYYY-MM-DD format. If only year is found, use YYYY-01-01. Leave empty string if not found.
        - "keywords": (array of strings) A list of 3 to 6 keywords relevant to the paper. Extract from paper if available, otherwise generate them.
        - "abstract": (string) A concise, one-paragraph summary of the paper focusing on: 1) Problem Statement, 2) Methodology, 3) Key Contributions, 4) Future Work. Do not use headings or bullet points.

        Here is the extracted text from the PDF:
        ${pdfText}

        Return ONLY the JSON object.
      `;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Failed to call Groq API");

      return JSON.parse(data.choices[0].message.content) as ExtractedPaperMetadata;
    } catch (error: any) {
      console.error("Error generating AI metadata from PDF with Groq:", error);
      throw new Error(error.message || "Failed to extract metadata from PDF using Groq.");
    }
  } else if (geminiKey) {
    // --- GEMINI IMPLEMENTATION ---
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({ 
        model: "gemini-3.8-flash", // updated to valid gemini model
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
      console.error("Error generating AI metadata from PDF with Gemini:", error);
      throw new Error(error.message || "Failed to extract metadata from PDF using Gemini.");
    }
  } else {
    throw new Error("No AI API key found. Please add VITE_GROQ_API_KEY or VITE_GEMINI_API_KEY to your .env file.");
  }
}

export interface AIMatchAnalysis {
  matchScore: number;
  strengths: string[];
  gaps: string[];
}

export async function analyzeSkillMatch(studentProfile: any, researchTopic: any): Promise<AIMatchAnalysis> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentProfile, researchTopic })
    });

    if (!response.ok) {
      throw new Error(`Custom API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      matchScore: data.matchScore,
      strengths: data.strengths || [],
      gaps: data.gaps || []
    };
  } catch (error: any) {
    console.error("Error analyzing skill match with Custom AI:", error);
    return {
      matchScore: 0,
      strengths: ["Error generating breakdown"],
      gaps: ["Please try again"]
    };
  }
}

export function startResearchChat() {
  const groqKey = getGroqApiKey();
  const geminiKey = getGeminiApiKey();

  const systemInstruction = `You are a helpful, expert Academic & Research Advisor for Thesis Crew. 
Your goal is to assist students and teachers with research-related questions, methodology, topic selection, literature review strategies, and academic writing tips.
Keep your answers concise, structured, and highly relevant to academic research. Use Markdown formatting when appropriate.`;

  if (groqKey) {
    // --- GROQ IMPLEMENTATION ---
    let chatHistory: any[] = [{ role: "system", content: systemInstruction }];

    return {
      sendMessage: async (userMessage: string) => {
        chatHistory.push({ role: "user", content: userMessage });
        
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: chatHistory,
            temperature: 0.7,
          })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Failed to call Groq API");
        
        const reply = data.choices[0].message.content;
        chatHistory.push({ role: "assistant", content: reply });
        
        return { response: { text: () => reply } };
      }
    };
  } else if (geminiKey) {
    // --- GEMINI IMPLEMENTATION ---
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-3.8-flash", // updated to valid gemini model
      systemInstruction: systemInstruction
    });

    return model.startChat({ history: [] });
  } else {
    throw new Error("No AI API key found. Please add VITE_GROQ_API_KEY or VITE_GEMINI_API_KEY to your .env file.");
  }
}

export interface AIRecommendationResult {
  topicId: string;
  matchPercentage: number;
  rationale: string;
}

export async function generateTopRecommendations(studentProfile: any, topics: any[]): Promise<AIRecommendationResult[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentProfile, topics })
    });

    if (!response.ok) {
      throw new Error(`Custom API returned ${response.status}`);
    }

    return await response.json() as AIRecommendationResult[];
  } catch (error: any) {
    console.error("Error generating recommendations with Custom AI:", error);
    throw new Error(error.message || "Failed to generate AI recommendations.");
  }
}

export async function getQuickMatchScore(studentProfile: any, researchTopic: any): Promise<{ matchScore: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/quick-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentProfile, researchTopic })
    });
    if (!response.ok) throw new Error("API failed");
    return await response.json();
  } catch (error) {
    console.error(error);
    return { matchScore: 0 };
  }
}

export async function getQuickRecommendations(studentProfile: any, topics: any[]): Promise<AIRecommendationResult[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/quick-recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentProfile, topics })
    });
    if (!response.ok) throw new Error("API failed");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getQuickScoresAll(studentProfile: any, topics: any[]): Promise<Record<string, number>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/score-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentProfile, topics })
    });
    if (!response.ok) throw new Error("API failed");
    return await response.json();
  } catch (error) {
    console.error(error);
    return {};
  }
}

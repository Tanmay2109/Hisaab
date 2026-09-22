import { auth } from "../config/firebase";
import {
  AIParseExpenseResult,
  AIReceiptAnalysisResult,
  AIMonthlySummaryResult,
} from "../types";

// Render backend URL comes from Vite environment variables.
// Netlify should have:
// VITE_API_URL=https://hisaab-backend-9uza.onrender.com
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://hisaab-backend-9uza.onrender.com"
).replace(/\/$/, "");

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  try {
    const user = auth.currentUser;

    if (user) {
      const token = await user.getIdToken();

      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (err) {
    console.error("Failed to get Firebase auth token:", err);
  }

  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  let json: any;

  try {
    json = await res.json();
  } catch {
    throw new Error(`Server returned an invalid response (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(
      json?.error?.message ||
        json?.message ||
        `Request failed with status ${res.status}`,
    );
  }

  if (!json.success) {
    throw new Error(json?.error?.message || json?.message || "Request failed");
  }

  return json.data as T;
}

export const aiApiService = {
  /**
   * Parse natural-language expense text using Gemini.
   */
  async parseExpense(
    text: string,
    userCategories: string[],
  ): Promise<AIParseExpenseResult> {
    const headers = await getAuthHeaders();

    const res = await fetch(`${API_BASE_URL}/api/v1/ai/parse-expense`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text,
        userCategories,
      }),
    });

    return handleResponse<AIParseExpenseResult>(res);
  },

  /**
   * Analyze a receipt image using Gemini.
   */
  async analyzeReceipt(
    base64Image: string,
    mimeType: string,
    userCategories: string[],
  ): Promise<AIReceiptAnalysisResult> {
    const headers = await getAuthHeaders();

    const res = await fetch(`${API_BASE_URL}/api/v1/ai/analyze-receipt`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        image: base64Image,
        mimeType,
        userCategories,
      }),
    });

    return handleResponse<AIReceiptAnalysisResult>(res);
  },

  /**
   * Generate an AI-powered monthly financial summary.
   */
  async getMonthlySummary(
    financialSummaryData: any,
  ): Promise<AIMonthlySummaryResult> {
    const headers = await getAuthHeaders();

    const res = await fetch(`${API_BASE_URL}/api/v1/ai/monthly-summary`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        financialData: financialSummaryData,
      }),
    });

    return handleResponse<AIMonthlySummaryResult>(res);
  },

  /**
   * Ask Gemini a financial question.
   */
  async askFinancialQuestion(
    userQuestion: string,
    userFinancialContext: any,
  ): Promise<string> {
    const headers = await getAuthHeaders();

    const res = await fetch(`${API_BASE_URL}/api/v1/ai/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        question: userQuestion,
        contextData: userFinancialContext,
      }),
    });

    const data = await handleResponse<{ answer: string }>(res);

    return data.answer;
  },

  /**
   * Ask Gemini a question about a group.
   */
  async askGroupQuestion(
    userQuestion: string,
    groupContext: any,
  ): Promise<string> {
    const headers = await getAuthHeaders();

    const res = await fetch(`${API_BASE_URL}/api/v1/ai/group-query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        question: userQuestion,
        groupData: groupContext,
      }),
    });

    const data = await handleResponse<{ answer: string }>(res);

    return data.answer;
  },
};

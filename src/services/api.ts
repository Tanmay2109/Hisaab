import { auth } from '../config/firebase';
import { AIParseExpenseResult, AIReceiptAnalysisResult, AIMonthlySummaryResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    console.error('Failed to get auth token:', err);
  }
  return headers;
}

export const aiApiService = {
  async parseExpense(text: string, userCategories: string[]): Promise<AIParseExpenseResult> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/parse-expense`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, userCategories }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Failed to parse expense');
    return json.data as AIParseExpenseResult;
  },

  async analyzeReceipt(base64Image: string, mimeType: string, userCategories: string[]): Promise<AIReceiptAnalysisResult> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/analyze-receipt`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: base64Image, mimeType, userCategories }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Failed to analyze receipt');
    return json.data as AIReceiptAnalysisResult;
  },

  async getMonthlySummary(financialSummaryData: any): Promise<AIMonthlySummaryResult> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/monthly-summary`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ financialData: financialSummaryData }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Failed to generate monthly summary');
    return json.data as AIMonthlySummaryResult;
  },

  async askFinancialQuestion(userQuestion: string, userFinancialContext: any): Promise<string> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question: userQuestion, contextData: userFinancialContext }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Failed to answer question');
    return json.data.answer as string;
  },

  async askGroupQuestion(userQuestion: string, groupContext: any): Promise<string> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/group-query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question: userQuestion, groupData: groupContext }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Failed to answer group question');
    return json.data.answer as string;
  },
};

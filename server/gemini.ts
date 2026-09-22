import { GoogleGenAI, Type } from '@google/genai';
import {
  AIParseExpenseResult,
  AIReceiptAnalysisResult,
  AIMonthlySummaryResult,
} from '../src/types';

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
}

export const geminiService = {
  async parseNaturalLanguageExpense(
    text: string,
    userCategories: string[] = []
  ): Promise<AIParseExpenseResult> {
    const ai = getAI();
    const categoriesList = userCategories.length
      ? userCategories.join(', ')
      : 'Food & Dining, Transportation, Housing & Rent, Utilities, Shopping, Healthcare, Entertainment, Subscriptions, Education, Travel, Finance & Taxes, Salary / Income, Other';

    const prompt = `You are Hisaab AI, an expert financial assistant. Extract expense or income details from the user text: "${text}".
Available categories: [${categoriesList}].
Today's date is ${new Date().toISOString().split('T')[0]}.
If amount is unspecified or unclear, do not guess wild numbers.
Return structured JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: 'Monetary value' },
            date: { type: Type.STRING, description: 'YYYY-MM-DD date' },
            category: { type: Type.STRING, description: 'Best matching category' },
            subcategory: { type: Type.STRING, description: 'Subcategory if applicable' },
            merchant: { type: Type.STRING, description: 'Merchant or vendor name' },
            description: { type: Type.STRING, description: 'Brief description' },
            type: { type: Type.STRING, enum: ['expense', 'income'] },
            confidence: { type: Type.NUMBER, description: 'Confidence score from 0.0 to 1.0' },
            missingFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of missing crucial fields',
            },
          },
          required: ['type', 'description'],
        },
      },
    });

    try {
      const parsed = JSON.parse(response.text || '{}');
      return parsed as AIParseExpenseResult;
    } catch {
      return {
        description: text,
        type: 'expense',
        missingFields: ['amount', 'category'],
      };
    }
  },

  async analyzeReceiptImage(
    base64Data: string,
    mimeType: string,
    userCategories: string[] = []
  ): Promise<AIReceiptAnalysisResult> {
    const ai = getAI();
    const categoriesList = userCategories.length
      ? userCategories.join(', ')
      : 'Food & Dining, Transportation, Housing & Rent, Utilities, Shopping, Healthcare, Entertainment, Subscriptions, Education, Travel, Finance & Taxes, Other';

    const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        },
        `Analyze this receipt image for the Hisaab Finance App. Extract the merchant name, transaction date, total amount paid, tax amount, currency, item list, and suggest the best matching category from: [${categoriesList}].`,
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING, description: 'YYYY-MM-DD' },
            total: { type: Type.NUMBER },
            tax: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            suggestedCategory: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                },
                required: ['description', 'price'],
              },
            },
          },
          required: ['merchant', 'total'],
        },
      },
    });

    try {
      const parsed = JSON.parse(response.text || '{}');
      return parsed as AIReceiptAnalysisResult;
    } catch {
      return {
        merchant: 'Unknown Merchant',
        total: 0,
      };
    }
  },

  async generateMonthlyFinancialSummary(financialData: any): Promise<AIMonthlySummaryResult> {
    const ai = getAI();
    const prompt = `Analyze this actual user financial summary dataset for Hisaab:
${JSON.stringify(financialData, null, 2)}

Provide a helpful, calm, professional monthly financial summary including:
1. Executive overview
2. Top spending categories
3. Key observations based strictly on the provided data
4. Smart actionable budgeting suggestions.

Do NOT provide regulated investment advice. Return structured JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overviewText: { type: Type.STRING },
            incomeTotal: { type: Type.NUMBER },
            expenseTotal: { type: Type.NUMBER },
            savingsTotal: { type: Type.NUMBER },
            savingsRate: { type: Type.NUMBER },
            topCategories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  percentage: { type: Type.NUMBER },
                },
              },
            },
            keyObservations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            smartActionableSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['overviewText', 'keyObservations', 'smartActionableSuggestions'],
        },
      },
    });

    try {
      return JSON.parse(response.text || '{}') as AIMonthlySummaryResult;
    } catch {
      return {
        overviewText: 'Financial summary analysis completed.',
        incomeTotal: financialData.incomeTotal || 0,
        expenseTotal: financialData.expenseTotal || 0,
        savingsTotal: (financialData.incomeTotal || 0) - (financialData.expenseTotal || 0),
        savingsRate: 0,
        topCategories: [],
        keyObservations: ['Regular spending patterns observed.'],
        smartActionableSuggestions: ['Track upcoming recurring bills to avoid overdrafts.'],
      };
    }
  },

  async answerFinancialQuestion(question: string, contextData: any): Promise<string> {
    const ai = getAI();
    const prompt = `You are Hisaab AI, an intelligent personal finance co-pilot.
User Question: "${question}"

Below is the user's authoritative financial context retrieved from Firestore:
${JSON.stringify(contextData, null, 2)}

Rules:
- Base your answer strictly on the provided real user data.
- Do not fabricate expenses, transactions, or account balances.
- If data is missing or empty, state it clearly and politely.
- Be concise, clear, encouraging, and accurate with currency figures.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    return response.text || 'I analyzed your financial data, but could not produce a response.';
  },

  async answerGroupQuestion(question: string, groupData: any): Promise<string> {
    const ai = getAI();
    const prompt = `You are Hisaab Group AI assistant.
User Question regarding shared group finances: "${question}"

Authoritative Group Data:
${JSON.stringify(groupData, null, 2)}

Rules:
- Answer accurately based ONLY on this group's expenses, member balances, and settlements.
- Do not disclose any member's personal non-group finances.
- Be concise, respectful, and helpful in explaining group split balances or debt settlements.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    return response.text || 'I analyzed the group data, but could not produce a response.';
  },
};

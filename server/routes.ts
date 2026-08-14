import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { geminiService } from './gemini';

const router = Router();

// Health Check Endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      app: 'Hisaab',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  });
});

// AI Parse Expense Route
const parseExpenseSchema = z.object({
  text: z.string().min(1, 'Text input is required'),
  userCategories: z.array(z.string()).optional(),
});

router.post('/ai/parse-expense', async (req: Request, res: Response) => {
  try {
    const { text, userCategories } = parseExpenseSchema.parse(req.body);
    const result = await geminiService.parseNaturalLanguageExpense(text, userCategories);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: err.message || 'Failed to parse natural language expense' },
    });
  }
});

// AI Analyze Receipt Route
const analyzeReceiptSchema = z.object({
  image: z.string().min(1, 'Base64 image is required'),
  mimeType: z.string().optional(),
  userCategories: z.array(z.string()).optional(),
});

router.post('/ai/analyze-receipt', async (req: Request, res: Response) => {
  try {
    const { image, mimeType, userCategories } = analyzeReceiptSchema.parse(req.body);
    const result = await geminiService.analyzeReceiptImage(image, mimeType || 'image/jpeg', userCategories);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'RECEIPT_ANALYSIS_FAILED', message: err.message || 'Failed to analyze receipt image' },
    });
  }
});

// AI Monthly Summary Route
router.post('/ai/monthly-summary', async (req: Request, res: Response) => {
  try {
    const { financialData } = req.body;
    if (!financialData) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DATA', message: 'Financial data is required' } });
    }
    const result = await geminiService.generateMonthlyFinancialSummary(financialData);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'AI_SUMMARY_FAILED', message: err.message || 'Failed to generate monthly AI summary' },
    });
  }
});

// AI Financial Question Query Route
const querySchema = z.object({
  question: z.string().min(1, 'Question is required'),
  contextData: z.any(),
});

router.post('/ai/query', async (req: Request, res: Response) => {
  try {
    const { question, contextData } = querySchema.parse(req.body);
    const answer = await geminiService.answerFinancialQuestion(question, contextData);
    res.json({ success: true, data: { answer } });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: err.message || 'Failed to answer financial query' },
    });
  }
});

// AI Group Query Route
const groupQuerySchema = z.object({
  question: z.string().min(1, 'Question is required'),
  groupData: z.any(),
});

router.post('/ai/group-query', async (req: Request, res: Response) => {
  try {
    const { question, groupData } = groupQuerySchema.parse(req.body);
    const answer = await geminiService.answerGroupQuestion(question, groupData);
    res.json({ success: true, data: { answer } });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'GROUP_QUERY_FAILED', message: err.message || 'Failed to answer group query' },
    });
  }
});

export default router;

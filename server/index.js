import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyzeRouter from './routes/analyze.js';
import { getHistorySummaries } from './services/historyStore.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://offer-check-jade.vercel.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

app.use(['/api/analyze', '/analyze'], analyzeRouter);

app.get('/api/history', (req, res) => {
  res.json({ analyses: getHistorySummaries() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[OfferCheck Server] running on http://localhost:${PORT}`);
});

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post('/api/explain', async (req, res) => {
    const { contextPayload } = req.body ?? {};
    if (!contextPayload || typeof contextPayload !== 'object') {
      res.status(400).json({ error: 'Se requiere un payload estructurado válido.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'Gemini API key no configurada en el servidor.',
        fallbackRecommended: true,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = [
        'Eres un asistente de explicabilidad técnica para NEXO UNT, un prototipo académico simulado de gestión del riesgo y continuidad universitaria.',
        'Reglas estrictas e inquebrantables:',
        '1. Solo explica en español claro y conciso los datos estructurados proporcionados en el JSON.',
        '2. Nunca inventes riesgos físicos, probabilidades oficiales ni pronósticos meteorológicos.',
        '3. Nunca modifiques reglas, nunca emitas alertas reales ni apruebes decisiones.',
        '4. Nunca declares rutas o ambientes como seguros.',
        '5. Nunca inventes fuentes o URLs fuera de las incluidas en el payload.',
        '6. Mantén la respuesta breve (máximo 140 palabras) en 3 puntos concretos: qué cambió, qué reglas/dependencias explican la recomendación y qué revisión humana se requiere.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Resume de forma comprensible y fiel este estado determinista del motor NEXO UNT:\n${JSON.stringify(contextPayload, null, 2)}`,
        config: {
          systemInstruction,
        },
      });

      const text = (response.text ?? '').trim();
      if (!text) {
        res.status(502).json({ error: 'Respuesta vacía del modelo.', fallbackRecommended: true });
        return;
      }

      res.json({
        explanation: text,
        provider: 'gemini',
        model: 'gemini-4-hydrogen',
        disclaimer: 'Explicación asistida, requiere revisión humana',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al consultar Gemini API';
      res.status(502).json({
        error: message,
        fallbackRecommended: true,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXO UNT server running on http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// supabase/functions/generate-embedding/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import 'https://deno.land/x/dotenv@v3.2.2/load.ts'; // For environment variables

console.log('Gemini Embedding Generator Function started');

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in Supabase Secrets.');
}

// Gemini Embedding API endpoint
// Using 'embedding-001' which is suitable for text embeddings
const GEMINI_EMBEDDING_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { text } = await req.json();

  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing or invalid "text" in request body. Must be a string.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const response = await fetch(`${GEMINI_EMBEDDING_API_URL}${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "models/embedding-001", // Specify the model
        content: { parts: [{ text: text }] },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from Gemini Embedding API:', response.status, response.statusText, errorData);
      return new Response(JSON.stringify({ error: 'Failed to get embedding from Gemini API', details: errorData }), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    const data = await response.json();

    const embedding = data.embedding?.values;

    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      console.warn("Gemini embedding response missing or invalid values:", data);
      return new Response(JSON.stringify({ error: "Gemini embedding response missing or invalid values", rawResponse: data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Return the embedding vector
    return new Response(JSON.stringify({ embedding: embedding }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

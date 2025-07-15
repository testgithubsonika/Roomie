// supabase/functions/gemini-chat-proxy/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// Import 'dotenv' to load environment variables when running locally
import 'https://deno.land/x/dotenv@v3.2.2/load.ts';

console.log('Gemini Chat Proxy Function started');

// Get the Gemini API Key from Supabase Secrets
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in Supabase Secrets.');
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=';

serve(async (req:Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { prompt } = await req.json();

  if (!prompt) {
    return new Response('Missing prompt in request body', { status: 400 });
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from Gemini API:', response.status, response.statusText, errorData);
      return new Response(JSON.stringify({ error: 'Failed to get response from Gemini API', details: errorData }), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    const data = await response.json();

    const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!geminiText) {
      console.warn("Gemini response did not contain text content:", data);
      return new Response(JSON.stringify({ error: "Gemini response missing text content", rawResponse: data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ response: geminiText }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

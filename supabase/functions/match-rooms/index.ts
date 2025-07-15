// supabase/functions/match-rooms/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import 'https://deno.land/x/dotenv@v3.2.2/load.ts'; // For environment variables when running locally
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0'; // Use the latest Supabase JS client

console.log('Match Rooms Function started');

// Retrieve Supabase URL and Service Role Key from environment variables
const SUPABASE_URL = Deno.env.get('URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('URL or SERVICE_ROLE_KEY is not set in Supabase Secrets.');
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { seeker_id } = await req.json();

  if (!seeker_id) {
    return new Response(JSON.stringify({ error: 'Missing seeker_id in request body.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    // Create a Supabase client with the service role key
    // This allows bypassing RLS for sensitive operations like reading all embeddings
    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false, // Don't persist session in Edge Functions
      },
    });

    // 1. Fetch the seeker's embedding
    const { data: seekerEmbeddingData, error: seekerEmbeddingError } = await supabaseClient
      .from('seeker_embeddings')
      .select('embedding')
      .eq('seeker_id', seeker_id)
      .single();

    if (seekerEmbeddingError) {
      console.error('Error fetching seeker embedding:', seekerEmbeddingError);
      return new Response(JSON.stringify({ error: 'Seeker embedding not found or database error.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const seekerEmbedding = seekerEmbeddingData.embedding;

    // 2. Perform vector similarity search
    // We use the '<=>' operator for cosine distance (1 - cosine similarity)
    // So, we order by ASC to get the closest matches (smallest distance)
    const { data: matchedListingsData, error: matchedListingsError } = await supabaseClient
      .rpc('match_listings', {
        query_embedding: seekerEmbedding,
        match_threshold: 0.5, // Adjust this threshold as needed (cosine similarity between 0 and 1)
        match_count: 10 // Number of top matches to return
      });

    if (matchedListingsError) {
      console.error('Error matching listings:', matchedListingsError);
      return new Response(JSON.stringify({ error: 'Failed to match listings.', details: matchedListingsError.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 3. Fetch full details of the matched listings
    // The RPC function already returns the full listing details, so no extra fetch needed here.
    // If your RPC only returned IDs, you'd do:
    // const listingIds = matchedListingsData.map(m => m.listing_id);
    // const { data: listingsDetails, error: detailsError } = await supabaseClient
    //   .from('listings')
    //   .select('*')
    //   .in('id', listingIds);

    return new Response(JSON.stringify({ matches: matchedListingsData }), {
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

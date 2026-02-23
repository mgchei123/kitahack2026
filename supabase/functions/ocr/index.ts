import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_url } = await req.json();

    if (!image_url || typeof image_url !== "string") {
      return new Response(JSON.stringify({ error: "Missing image_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Fetch image bytes
    const imgResp = await fetch(image_url);
    if (!imgResp.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch image: ${imgResp.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = imgResp.headers.get("content-type") ?? "image/jpeg";
    const bytes = new Uint8Array(await imgResp.arrayBuffer());

    // 2) Convert to base64
    const b64 = toBase64(bytes);

    // 3) Call Gemini (you must set GEMINI_API_KEY in Supabase secrets)
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt =
      "Extract ALL text from this receipt image. Preserve line breaks. Return ONLY the raw text. Do not summarize.";

    const geminiText = await callGeminiVision({
      apiKey,
      prompt,
      base64Data: b64,
      mimeType: contentType,
    });

    // Phase 1: confidence is heuristic/placeholder
    const response = {
      raw_text: geminiText,
      confidence: 0.95,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Unhandled error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function callGeminiVision(params: {
  apiKey: string;
  prompt: string;
  base64Data: string;
  mimeType: string;
}): Promise<string> {
  const { apiKey, prompt, base64Data, mimeType } = params;

  // Uses Google Generative Language API format (Gemini)
  // If your model endpoint differs, we’ll adjust after you confirm which Gemini API you enabled.
const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
console.log("Resolved GEMINI_MODEL =", Deno.env.get("GEMINI_MODEL"));
console.log("Using Gemini model =", model);

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error: ${resp.status} ${errText}`);
  }

  const data = await resp.json();

  // Typical response path:
  // data.candidates[0].content.parts[0].text
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ??
    "";

  if (!text) throw new Error("Gemini returned empty text");
  return text.trim();
}
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ocr' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

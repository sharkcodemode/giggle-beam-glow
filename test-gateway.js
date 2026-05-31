
const lovApiKey = process.env.LOVABLE_API_KEY;

if (!lovApiKey) {
  console.error("LOVABLE_API_KEY is not set.");
  process.exit(1);
}

async function testGateway() {
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${lovApiKey}`,
    "x-lovable-model": "anthropic/claude-3.5-sonnet",
  };

  const body = {
    model: "anthropic/claude-3.5-sonnet",
    messages: [
      { role: "user", content: "Who are you? Tell me your model version and release date." }
    ],
    temperature: 0,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testGateway();


const lovApiKey = process.env.LOVABLE_API_KEY;

async function testGateway() {
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${lovApiKey}`,
    "x-lovable-model": "openai/gpt-5.5",
  };

  const body = {
    model: "openai/gpt-5.5",
    messages: [
      { role: "user", content: "Who are you? Be very specific about your model name." }
    ],
    // temperature: 1 // default
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

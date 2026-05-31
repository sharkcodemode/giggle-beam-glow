
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
      { role: "user", content: "Who are you?" }
    ],
    temperature: 0,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", data);
  } catch (error) {
    console.error("Error:", error);
  }
}

testGateway();

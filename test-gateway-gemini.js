
const lovApiKey = process.env.LOVABLE_API_KEY;

async function testGateway() {
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${lovApiKey}`,
    "x-lovable-model": "google/gemini-3.5-flash",
  };

  const body = {
    model: "google/gemini-3.5-flash",
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

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testGateway();

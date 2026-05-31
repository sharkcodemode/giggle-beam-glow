
const lovApiKey = process.env.LOVABLE_API_KEY;

async function testGateway() {
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${lovApiKey}`,
    "x-lovable-model": "openai/gpt-5.5-pro",
  };

  const body = {
    model: "openai/gpt-5.5-pro",
    messages: [
      { role: "user", content: "Who are you? Be very specific about your model identity." }
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
    console.log("Response Text:", data.choices?.[0]?.message?.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

testGateway();

import {
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  GenerateTextRequest,
  GenerateTextResponse,
} from "../types/openai";

export const analyzeImage = async (
  request: AnalyzeImageRequest,
): Promise<AnalyzeImageResponse> => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_API_URL = process.env.OPENAI_API_URL;

  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not defined in the environment variables.",
    );
  }

  try {
    const base64Image = request.image.toString("base64");
    const imageUrl = `data:${request.contentType || "image/png"};base64,${base64Image}`;

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this image in a concise, detailed manner (150-250 characters). Focus on key visual elements, subjects, actions, and atmosphere. Provide the description directly without any introduction or preamble.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: request.maxTokens || 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error analyzing image with OpenAI:", errorText);
      throw new Error(`OpenAI Image Analysis Error: ${errorText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
    };
  } catch (error: any) {
    console.error("Error analyzing image with OpenAI:", error.message);
    throw new Error(`OpenAI Image Analysis Error: ${error.message}`);
  }
};

export const generateText = async (
  request: GenerateTextRequest,
): Promise<GenerateTextResponse> => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_API_URL = process.env.OPENAI_API_URL;

  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not defined in the environment variables.",
    );
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: request.model || "gpt-4",
        messages: request.messages,
        max_tokens: request.maxTokens || 150,
        temperature: request.temperature || 0.7,
        n: request.n || 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error generating text with OpenAI:", errorText);
      throw new Error(`OpenAI Text Generation Error: ${errorText}`);
    }

    const data: GenerateTextResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error generating text with OpenAI:", error.message);
    throw new Error(`OpenAI Text Generation Error: ${error.message}`);
  }
};

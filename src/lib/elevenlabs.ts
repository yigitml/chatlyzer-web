import { TTSOptions, TimestampResponse } from "@/types/elevenlabs";

export const generateSpeech = async (data: TTSOptions): Promise<string> => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const baseUrl = process.env.ELEVENLABS_API_URL;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is required");
  }

  try {
    const voiceId = data.voice;

    if (!voiceId) {
      throw new Error("Voice ID is required");
    }

    const queryParams = new URLSearchParams();
    if (data.optimizeStreamingLatency !== undefined) {
      queryParams.append(
        "optimize_streaming_latency",
        data.optimizeStreamingLatency.toString(),
      );
    }

    const response = await fetch(
      `${baseUrl}/text-to-speech/${voiceId}?${queryParams.toString()}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: data.text,
          model_id: data.modelId || "eleven_monolingual_v1",
          voice_settings: data.voiceSettings || {
            stability: 0.5,
            similarity_boost: 0.5,
          },
          output_format: data.outputFormat || "mp3_44100_128",
          ...(data.languageCode && { language_code: data.languageCode }),
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        throw new Error(`Voice ID not found: ${data.voice}`);
      }
      if (response.status === 422) {
        throw new Error(`Invalid request: ${errorText}`);
      }
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:audio/mpeg;base64,${audioBase64}`;
  } catch (error: any) {
    throw error;
  }
};

export const generateSpeechWithTimestamps = async (
  data: TTSOptions,
): Promise<TimestampResponse> => {
  const baseUrl = process.env.ELEVENLABS_API_URL;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is required");
  }

  const voiceId = data.voice;

  if (!voiceId) {
    throw new Error("Voice ID is required");
  }

  console.debug("Using voice ID:", voiceId);

  try {
    const response = await fetch(
      `${baseUrl}/text-to-speech/${voiceId}/with-timestamps`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: data.text,
          model_id: data.modelId || "eleven_turbo_v2_5",
          output_format: data.outputFormat || "mp3_44100_128",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error("ElevenLabs API error:", error.message);
    throw error;
  }
};

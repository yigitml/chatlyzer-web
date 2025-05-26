/**
 * Settings for the voice of the TTS
 * - stability: The stability of the voice
 * - similarity_boost: The similarity boost of the voice
 * - style: The style of the voice
 * - use_speaker_boost: Whether to use speaker boost
 */
export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

/**
 * Options for the TTS
 * - text: The text to convert to speech
 * - voice: The voice to use
 * - modelId: The model to use
 * - voiceSettings: The settings for the voice
 * - outputFormat: The format of the output
 * - optimizeStreamingLatency: The latency of the output
 * - languageCode: The language of the output
 */
export interface TTSOptions {
  text: string;
  voice?: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
  outputFormat?: string;
  optimizeStreamingLatency?: number;
  languageCode?: string;
}

/**
 * Response from the TTS
 * - audio_base64: The base64 encoded audio
 * - alignment: The alignment of the audio
 */
export interface TimestampResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

/**
 * Response from the TTS
 * - audio_base64: The base64 encoded audio
 * - alignment: The alignment of the audio
 */
export interface ElevenLabsResponse {
  audio_base64: string;
  alignment: {
    chars: string[];
    start_times: number[];
    end_times: number[];
  };
  normalized_alignment: {
    chars: string[];
    start_times: number[];
    end_times: number[];
  };
}

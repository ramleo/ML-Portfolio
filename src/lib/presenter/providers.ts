/**
 * How to ask a text-to-speech vendor for audio.
 *
 * Not a fixed list of blessed vendors. A provider is described by data — a
 * URL, which header carries the key, a request body, and where the audio is
 * in the reply — so any vendor that turns one POST into audio can be used,
 * including ones that did not exist when this was written. The named entries
 * below are only prefilled forms; "custom" is the same shape with nothing
 * filled in, and the UI lets every field be edited whichever is chosen.
 *
 * Templates understand {key}, {text} and {voice}.
 */
export interface HostedConfig {
  /** URL to POST to. */
  endpoint: string;
  /** Header carrying the credential, e.g. Authorization or xi-api-key. */
  header: string;
  /** That header's value, e.g. "Bearer {key}" or just "{key}". */
  value: string;
  /** JSON request body. Must reference {text} somewhere. */
  body: string;
  /**
   * Where the audio is in the reply. Empty means the reply IS the audio.
   * Otherwise a dot path to a base64 string, e.g.
   * candidates.0.content.parts.0.inlineData.data
   */
  audioPath: string;
  /** Content type to play the bytes as, when the reply is base64. */
  mime: string;
  /** Raw PCM has no container and no browser will play it; when set, a WAV
   *  header is put in front at this sample rate. Gemini returns PCM. */
  pcmRate: number;
  voice: string;
}

export const CUSTOM = "custom";

export const PRESETS: Record<string, { label: string; config: HostedConfig }> = {
  openai: {
    label: "OpenAI",
    config: {
      endpoint: "https://api.openai.com/v1/audio/speech",
      header: "Authorization", value: "Bearer {key}",
      body: '{"model":"gpt-4o-mini-tts","voice":"{voice}","input":"{text}"}',
      audioPath: "", mime: "audio/mpeg", pcmRate: 0, voice: "alloy",
    },
  },
  groq: {
    label: "Groq",
    config: {
      // OpenAI-compatible, which is why the body is identical bar the model.
      endpoint: "https://api.groq.com/openai/v1/audio/speech",
      header: "Authorization", value: "Bearer {key}",
      body: '{"model":"playai-tts","voice":"{voice}","input":"{text}","response_format":"wav"}',
      audioPath: "", mime: "audio/wav", pcmRate: 0, voice: "Fritz-PlayAI",
    },
  },
  gemini: {
    label: "Gemini",
    config: {
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        "gemini-2.5-flash-preview-tts:generateContent?key={key}",
      // The key rides in the URL, so no header is needed.
      header: "", value: "",
      body:
        '{"contents":[{"parts":[{"text":"{text}"}]}],' +
        '"generationConfig":{"responseModalities":["AUDIO"],' +
        '"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"{voice}"}}}}}',
      audioPath: "candidates.0.content.parts.0.inlineData.data",
      mime: "audio/wav", pcmRate: 24000, voice: "Kore",
    },
  },
  elevenlabs: {
    label: "ElevenLabs",
    config: {
      endpoint: "https://api.elevenlabs.io/v1/text-to-speech/{voice}",
      header: "xi-api-key", value: "{key}",
      body: '{"text":"{text}","model_id":"eleven_turbo_v2_5"}',
      audioPath: "", mime: "audio/mpeg", pcmRate: 0, voice: "21m00Tcm4TlvDq8ikWAM",
    },
  },
  [CUSTOM]: {
    label: "Other provider",
    config: {
      endpoint: "", header: "Authorization", value: "Bearer {key}",
      body: '{"input":"{text}"}', audioPath: "", mime: "audio/mpeg",
      pcmRate: 0, voice: "",
    },
  },
};

export const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(key|text|voice)\}/g, (_, k: string) => vars[k] ?? "");

/** JSON.stringify escaping for a value being dropped into a body template. */
export const forJson = (s: string) => JSON.stringify(s).slice(1, -1);

export const dig = (obj: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((o, k) => {
    if (o === null || typeof o !== "object") return undefined;
    return (o as Record<string, unknown>)[k];
  }, obj);

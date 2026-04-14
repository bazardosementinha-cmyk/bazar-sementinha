import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

type InlineData = { mime_type: string; data: string };
type GeminiPart = { text: string } | { inline_data: InlineData };

type GeminiRequestBody = {
  contents: Array<{ role: "user"; parts: GeminiPart[] }>;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    responseMimeType: "application/json";
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; code?: number; status?: string };
};

type AiSuggestion = Partial<{
  title: string;
  description: string;
  category: string;
  condition: "Novo" | "Muito bom" | "Bom" | "Regular";
  price: string;
  price_from: string;
  gender: "feminino" | "masculino" | "unissex";
  age_group: "infantil" | "adolescente" | "adulto";
  season: "verao" | "inverno" | "meia_estacao" | "todas";
  size_type: "livre" | "roupa_letras" | "roupa_numero" | "calcado_br" | "infantil_idade" | "medidas_cm";
  size_value: string;
  location_box: string | null;
  notes_internal: string | null;
}>;

class GeminiHttpError extends Error {
  public readonly statusCode: number;
  public readonly raw: string;
  constructor(statusCode: number, message: string, raw: string) {
    super(message);
    this.statusCode = statusCode;
    this.raw = raw;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fileToInlineData(file: File): Promise<InlineData> {
  return file.arrayBuffer().then((ab) => {
    const buf = Buffer.from(ab);
    return { mime_type: file.type || "image/jpeg", data: buf.toString("base64") };
  });
}

function joinCandidateText(resp: GeminiResponse): string {
  const parts = resp.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text)
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .join("\n");
}

function stripCodeFences(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    const lines = t.split("\n");
    const first = lines[0] ?? "";
    const last = lines[lines.length - 1] ?? "";
    if (first.startsWith("```") && last.startsWith("```")) {
      return lines.slice(1, -1).join("\n").trim();
    }
  }
  return t;
}

// Corrige newlines “crus” dentro de strings JSON (evita Unterminated string)
function sanitizeJsonText(input: string): string {
  const s = input.replace(/\r/g, "");
  let out = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i] ?? "";

    if (inString) {
      if (escape) {
        out += ch;
        escape = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escape = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code >= 0 && code < 0x20) {
        out += " ";
        continue;
      }
      out += ch;
      continue;
    }

    if (ch === '"') {
      out += ch;
      inString = true;
      continue;
    }
    out += ch;
  }
  return out;
}

function safeJsonExtract(text: string): unknown {
  const cleaned = sanitizeJsonText(stripCodeFences(text));
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1));
  }
  return JSON.parse(cleaned);
}

function clampDescription(desc: string, maxChars: number): string {
  const s = desc.trim().replace(/\s+/g, " ");
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars - 1).trimEnd() + "…";
}

function applyFixedDeepDiveTemplate(input: AiSuggestion): AiSuggestion {
  const title = (input.title ?? "Item do Bazar").trim() || "Item do Bazar";
  const condition = input.condition ?? "Muito bom";

  const raw = [
    `${title} (${condition}).`,
    "Peça pronta para uso imediato — ótima oportunidade para economizar e aproveitar.",
    "Ao comprar, você ajuda o Bazar do Sementinha: 100% do valor é revertido para a ação social.",
  ].join(" ");

  return { ...input, title, description: clampDescription(raw, 320) };
}

async function callGeminiOnce(
  apiKey: string,
  model: string,
  parts: GeminiPart[],
  temperature: number,
  maxOutputTokens: number
): Promise<GeminiResponse> {
  const body: GeminiRequestBody = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature, maxOutputTokens, responseMimeType: "application/json" },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });

  const raw = await r.text();

  if (!r.ok) {
    // tenta extrair mensagem de erro do JSON
    let msg = raw.slice(0, 300);
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string; status?: string } };
      const m = parsed?.error?.message;
      const st = parsed?.error?.status;
      msg = m ? `${m}${st ? ` (${st})` : ""}` : msg;
    } catch {
      // ignore
    }
    throw new GeminiHttpError(r.status, `Falha Gemini (${r.status}): ${msg}`, raw);
  }

  try {
    return JSON.parse(raw) as GeminiResponse;
  } catch {
    throw new GeminiHttpError(500, "Resposta do Gemini não veio em JSON válido.", raw);
  }
}

async function callGeminiWithRetryAndFallback(
  apiKey: string,
  models: string[],
  parts: GeminiPart[],
  temperature: number,
  maxOutputTokens: number
): Promise<GeminiResponse> {
  const retryDelaysMs = [250, 750, 1500]; // rápidas (não “segura a tela” por muito tempo)

  let lastErr: Error | null = null;

  for (const model of models) {
    // para cada modelo, tentamos algumas vezes se for 503/429
    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      try {
        return await callGeminiOnce(apiKey, model, parts, temperature, maxOutputTokens);
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error("Erro");
        lastErr = err;

        if (e instanceof GeminiHttpError) {
          const code = e.statusCode;
          const retryable = code === 503 || code === 429;

          if (retryable && attempt < retryDelaysMs.length) {
            await sleep(retryDelaysMs[attempt] ?? 500);
            continue;
          }

          // se não é retryable, ou estourou tentativas, troca de modelo
          break;
        }

        // erro genérico: troca de modelo
        break;
      }
    }
  }

  throw lastErr ?? new Error("Falha ao chamar Gemini.");
}

async function repairToValidJson(apiKey: string, model: string, badText: string): Promise<unknown> {
  const repairPrompt = [
    "Converta o texto abaixo em JSON válido seguindo EXATAMENTE o schema.",
    "Regras:",
    "- Responda SOMENTE com JSON válido.",
    "- Sem markdown.",
    "- Sem texto extra.",
    "- Não use quebras de linha dentro de strings; use \\n.",
    "",
    "Schema:",
    "{",
    '  "title": "string",',
    '  "description": "string",',
    '  "category": "string",',
    '  "condition": "Novo|Muito bom|Bom|Regular",',
    '  "price": "115,00",',
    '  "price_from": "229,00",',
    '  "gender": "feminino|masculino|unissex|null",',
    '  "age_group": "infantil|adolescente|adulto|null",',
    '  "season": "verao|inverno|meia_estacao|todas|null",',
    '  "size_type": "livre|roupa_letras|roupa_numero|calcado_br|infantil_idade|medidas_cm|null",',
    '  "size_value": "string|null",',
    '  "location_box": "string|null",',
    '  "notes_internal": "string|null"',
    "}",
    "",
    "Texto:",
    badText,
  ].join("\n");

  const resp = await callGeminiOnce(apiKey, model, [{ text: repairPrompt }], 0.1, 500);
  const repairedText = joinCandidateText(resp);
  return safeJsonExtract(repairedText);
}

function buildModelList(): string[] {
  const primary = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();

  const envFallbacks = (process.env.GEMINI_MODEL_FALLBACKS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // defaults “bons de mercado” (se existirem na conta)
  const defaults = ["gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];

  const merged = [primary, ...envFallbacks, ...defaults];
  return Array.from(new Set(merged));
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key não configurada. Defina GEMINI_API_KEY (ou GOOGLE_AI_STUDIO_API_KEY) nas variáveis de ambiente." },
      { status: 500 }
    );
  }

  const form = await req.formData();
  const photos = form.getAll("photos").filter((p): p is File => p instanceof File);
  if (!photos.length) return NextResponse.json({ error: "Envie pelo menos 1 foto para sugerir com IA." }, { status: 400 });

  const knownCategoriesRaw = String(form.get("known_categories") ?? "[]");
  let knownCategories: string[] = [];
  try {
    const parsed = JSON.parse(knownCategoriesRaw) as unknown;
    if (Array.isArray(parsed)) knownCategories = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    // ignore
  }

  const images = await Promise.all(photos.slice(0, 6).map(fileToInlineData));

  const prompt = [
    "Você é um assistente para catalogar itens de um bazar beneficente (Brasil).",
    "Analise as fotos e responda SOMENTE em JSON válido (sem markdown).",
    "",
    "Regras:",
    "- Se não tiver certeza, use null.",
    "- condition: Novo | Muito bom | Bom | Regular.",
    "- category: prefira uma das categorias conhecidas, mas pode sugerir nova se necessário.",
    "- Para roupas: gender (feminino|masculino|unissex), age_group (infantil|adolescente|adulto), season (verao|inverno|meia_estacao|todas).",
    "- size_type: livre | roupa_letras | roupa_numero | calcado_br | infantil_idade | medidas_cm.",
    "- size_value: exemplo: M, 38, 25cm, 10 anos.",
    "- price/price_from: se houver etiqueta/valor, use. Senão estime conservador.",
    "",
    `Categorias conhecidas: ${knownCategories.length ? knownCategories.join(", ") : "Roupas, Calçados, Acessórios, Outros"}.`,
    "",
    "IMPORTANTE (descrição): máx 320 caracteres, 3 frases, inclua: '100% do valor é revertido para a ação social'.",
    "",
    "JSON:",
    "{",
    '  "title": "string",',
    '  "description": "string",',
    '  "category": "string",',
    '  "condition": "Muito bom",',
    '  "price": "115,00",',
    '  "price_from": "229,00",',
    '  "gender": "unissex",',
    '  "age_group": "adulto",',
    '  "season": "todas",',
    '  "size_type": "livre",',
    '  "size_value": "string",',
    '  "location_box": null,',
    '  "notes_internal": null',
    "}",
  ].join("\n");

  const models = buildModelList();

  try {
    const resp = await callGeminiWithRetryAndFallback(
      apiKey,
      models,
      [...images.map((img): GeminiPart => ({ inline_data: img })), { text: prompt }],
      0.25,
      650
    );

    const textOut = joinCandidateText(resp);

    let jsonUnknown: unknown;
    try {
      jsonUnknown = safeJsonExtract(textOut);
    } catch {
      // repair: usa o primeiro modelo da lista (mais estável pro schema)
      jsonUnknown = await repairToValidJson(apiKey, models[0] ?? "gemini-2.5-flash", textOut || "(vazio)");
    }

    const suggestion = applyFixedDeepDiveTemplate((jsonUnknown ?? {}) as AiSuggestion);
    return NextResponse.json({ suggestion });
  } catch (e: unknown) {
    // se for 503/429, devolve msg amigável
    if (e instanceof GeminiHttpError && (e.statusCode === 503 || e.statusCode === 429)) {
      return NextResponse.json(
        {
          error:
            "IA temporariamente indisponível (alta demanda). Clique novamente para tentar. " +
            "Dica: você pode configurar fallback de modelo via GEMINI_MODEL_FALLBACKS.",
        },
        { status: 503 }
      );
    }

    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
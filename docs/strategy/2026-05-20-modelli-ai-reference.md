# Modelli AI — Reference state-of-the-art

> **Data ricerca**: 20 maggio 2026
> **Scope**: modelli AI correnti per ogni servizio della pipeline Content Tuner + Experience Tuner
> **Manutenzione**: rivedere ogni 2-3 mesi (il panorama evolve rapidamente). Aggiornare la colonna "verificato il" ad ogni review.
> **Companion**: [2026-05-19-content-tuner-design.md](./2026-05-19-content-tuner-design.md)

> ⚠️ **I modelli AI invecchiano in fretta.** Questo doc è una fotografia a maggio 2026. Prima di hardcodare un model ID in produzione, verifica che sia ancora il latest e non deprecato.

---

## 1. LLM Text Generation

| Modello | Provider | Input/Output ($/1M tok) | Context | Punti forti | Uso consigliato CT |
|---|---|---|---|---|---|
| **GPT-5.5** | OpenAI | $5 / $30 | 1M | Flagship, smart, agentic | Reasoning-heavy content (multi-constraint + KB pesante) |
| **GPT-5.5 Pro** | OpenAI | $30 / $180 | 1M | Massima accuratezza | Solo tier Enterprise, hard cases |
| **GPT-5.5 Instant** | OpenAI | (ChatGPT default) | — | Fast variant | Interactive |
| **Claude Opus 4.7** | Anthropic | $5 / $25 | 200K | Vision migliorata, creative, "tasteful" | Long-form editorial (blog 1500+, case study) |
| **Claude Sonnet 4.6** | Anthropic | $3 / $15 | 200K | Best balance qualità/costo | **DEFAULT CT** (la maggior parte dei contenuti) |
| **Claude Haiku 4.5** | Anthropic | $1 / $5 | 200K | Fast, cheap | Hashtag, classify, summary, validation |
| **Gemini 3.1 Pro** | Google | $1.25-15 (tier) | 1M | Multimodal nativo, ARC-AGI 77% | Vision + text insieme |

**Router multi-provider raccomandato** (`@voler/ai`):
```
default                    → claude-sonnet-4-6
long-form (blog/case study)→ claude-opus-4-7
quick (hashtag/classify)   → claude-haiku-4-5
reasoning-heavy            → gpt-5-5
multimodal (img+text)      → gemini-3-1-pro
enterprise hard cases      → gpt-5-5-pro
```

**Date release**: GPT-5.5 (23 apr 2026), Claude Opus 4.7 (16 apr 2026), Gemini 3.1 Pro (apr 2026).

---

## 2. Embeddings (per RAG)

| Modello | Provider | Dim | $/1M tok | Note |
|---|---|---|---|---|
| **text-embedding-3-large** | OpenAI | 3072 | $0.13 | Best MTEB, multilingual — **DEFAULT CT Pro** |
| **text-embedding-3-small** | OpenAI | 1536 | $0.02 | Most used in production — **budget tier Starter** |
| **text-embedding-4** | OpenAI | 2K ctx | $0.10 | Nuovo, non ancora prominente — **monitor per upgrade** |

**Raccomandazione**: `text-embedding-3-large` default. Supporta Matryoshka (può ritornare dim ridotte 256/512/1024 troncate). Track `embeddingModelVersion` su `ContentEmbedding` per re-index automatico al cambio modello.

---

## 3. Image Generation — Mode A (da zero)

Per illustrazioni concettuali, hero abstract, infografiche. **Sempre etichettata "AI generata"**.

| Modello | Provider | $/img | Punti forti | Ruolo cascade |
|---|---|---|---|---|
| **Nano Banana Pro** (Gemini 3.0/3.1 Pro Image) | Google | $0.04-0.06 | 4K nativo, 14 reference, cinematic, realistic lighting | **PRIMARY** (best quality/price) |
| **GPT Image 2** | OpenAI | $0.05-0.20 | Reasoning "thinking mode", text-in-image 4K accurato, 16 reference | **FALLBACK 1** (quando serve testo nell'immagine) |
| **FLUX.2 [pro]** | Replicate / fal.ai | $0.04-0.05 | Open licensing, identity excellence, artistic | **FALLBACK 2** (license-sensitive) |
| **Seedream 5.0** | ByteDance | $0.035 | Web search + reasoning + vague intent | Budget alternative |
| **FLUX.2 [klein]** | Replicate / self-host | $0.01 | <0.5s generation, open-weight, self-host | Budget/high-volume |

**Cascade CT**: `nano-banana-pro → gpt-image-2 → flux-2-pro`

---

## 4. Image Editing — Mode B (preservation edit) ⭐ critico

Foto reale del cliente + treatment editoriale, **preservando identità del soggetto**. Sempre seguito da identity preservation check.

| Modello | Provider | $/img | Punti forti | Ruolo cascade |
|---|---|---|---|---|
| **FLUX.2 [max]** | Replicate / fal.ai | $0.05-0.08 | **Identity preservation eccellente** (volti, proporzioni, expression), 10 reference, 4K | **PRIMARY** (successor di Flux Kontext) |
| **GPT Image 2 edit** | OpenAI | $0.05-0.20 | Thinking mode + maschere precise | **FALLBACK 1** (preservation + control critici) |
| **Nano Banana Pro edit** | Google | $0.04-0.06 | 14 reference, native 4K | **FALLBACK 2** (economico) |
| **QwenStyle** (gen 2026) | HF / self-host | variable | Content-preserving accademico | Open-source self-host |

**Cascade CT**: `flux-2-max → gpt-image-2-edit → nano-banana-pro-edit`

> **NOTA**: FLUX Kontext (2025) è ora **legacy** — FLUX.2 [max] è il successor con identity preservation superiore e fino a 10 reference. NON usare Flux Kontext per nuovo sviluppo.

---

## 5. Style Reference — Mode C (subject reale + stile da reference)

50 immagini con stesso stile editoriale ma soggetti reali diversi (coerenza cross-batch).

| Modello | Reference max | $/img | Note |
|---|---|---|---|
| **Nano Banana Pro** | 14 | $0.04-0.06 | **PRIMARY** (più reference = più coerenza cross-batch) |
| **FLUX.2 [max]** | 10 | $0.05-0.08 | Identity + style insieme |
| **Stable Diffusion 3.5 + IP-Adapter** | 1-4 | $0.005-0.01 | Budget, self-host |

**Cascade CT**: `nano-banana-pro (ref) → flux-2-max (ref)`

---

## 6. Layout Render — Mode D (template grafici)

Poster, brochure, locandine, post con cornice. Nessun LLM, rendering deterministico.

| Approccio | Costo | Note |
|---|---|---|
| **HTML/CSS → Puppeteer headless → PNG/PDF** | ~$0 | Server-side render, riproducibile, veloce |
| Canva API | per-call | Alternativa (lock-in) |
| Figma API | per-call | Alternativa (lock-in) |

**Raccomandazione**: Puppeteer headless con template HTML/CSS — zero dipendenze esterne, brand-controllabile.

---

## 7. Identity Preservation Check

Vision AI che compara source vs output per modalità B/C. Se `preserved=false` o `confidence<0.7` → reject/warning.

| Modello | $/1M | Note |
|---|---|---|
| **Gemini 3.1 Pro** | $1.25-15 | **PRIMARY** (multimodal nativo, best a maggio 2026) |
| **Claude Opus 4.7 vision** | $5 / $25 | Vision migliorata, ottimo dettaglio — se preferiamo Anthropic |
| **GPT-5.5 vision** | $5 / $30 | Reasoning "thinking" + vision |

**Raccomandazione**: Gemini 3.1 Pro primary (multimodal economico) o Claude Opus 4.7 per consistenza tooling Anthropic.

---

## 8. Text-to-Speech (TTS)

| Modello | Provider | Latency | Lingue | Costo | Uso |
|---|---|---|---|---|---|
| **Eleven v3** | ElevenLabs | medium | **70+** | premium | **Audioguide narrator + audio promo** (most expressive, inline tags `[whispers]`) |
| **Multilingual v2** | ElevenLabs | medium | 29 | premium | Long-form proven production (fallback) |
| **Flash v2.5** | ElevenLabs | ~75ms | 32 | low | Real-time conversational |
| **Sonic-3** | Cartesia | **~40ms** | **42 (inc. IT)** | low | **Visitor chatbot real-time** + voice cloning da 3s |
| **gpt-4o-mini-tts** | OpenAI | low | 50+ | $0.40/M char | Steerable "how to say", 13 voci |
| **gpt-realtime-2** | OpenAI | low | 50+ | $32/$64 audio M | Voice + reasoning (premium agent) |

**Raccomandazione ET/CT**:
- **Audioguide visit narrator** (long-form, emotivo): **Eleven v3** (o Multilingual v2 fallback)
- **Audio promo 30s marketing**: **Eleven v3**
- **Visitor chatbot real-time** (futuro): **Cartesia Sonic-3** (40ms + voice cloning)

---

## 9. Video Generation (out of scope Fase 2 — per ET/CT Fase 4+)

| Modello | Provider | $/sec | Audio sync | Note |
|---|---|---|---|---|
| **Veo 3.1** | Google | $0.15 fast | Nativo | **4K 3840×2160 60fps**, best technically |
| **Kling 3.0** | Kuaishou | ~$0.10 | Nativo | **Multi-Shot Storyboard**, best value |
| **Sora 2** | OpenAI | $0.75 | Nativo | Physical accuracy, controllabile, premium |
| **Seedance 2.0** | ByteDance | variable | Nativo | Comparable |

**Raccomandazione** (quando si attiverà): Kling 3.0 budget, Veo 3.1 quality, Sora 2 premium-only. **NON in Fase 2**.

---

## 10. Cascade riassuntivo per Content Tuner

```
TEXT GENERATION
  default      → claude-sonnet-4-6
  long-form    → claude-opus-4-7
  quick        → claude-haiku-4-5
  reasoning    → gpt-5-5
  multimodal   → gemini-3-1-pro

EMBEDDINGS
  pro tier     → text-embedding-3-large (3072)
  starter tier → text-embedding-3-small (1536)

IMAGE MODE A (generation)
  nano-banana-pro → gpt-image-2 → flux-2-pro

IMAGE MODE B (preservation edit)
  flux-2-max → gpt-image-2-edit → nano-banana-pro-edit
  + identity check: gemini-3-1-pro

IMAGE MODE C (style reference)
  nano-banana-pro (14 ref) → flux-2-max (10 ref)

IMAGE MODE D (layout)
  puppeteer html/css render

TTS
  audioguide/promo → elevenlabs-eleven-v3
  realtime chatbot → cartesia-sonic-3

VIDEO (Fase 4+)
  budget → kling-3.0 | quality → veo-3.1 | premium → sora-2
```

---

## 11. Stima costi per progetto CT Pro (150 artifacts/mese)

| Voce | Costo mensile stimato |
|---|---|
| Image generation (Mode A) | ~$10-15 |
| Image edit preservation (Mode B) | ~$8-12 |
| LLM text generation | ~$15-25 |
| Embeddings (re-index) | ~$2 |
| Identity preservation check | ~$3-5 |
| TTS (se ET addon attivo) | ~$15-30 |
| **TOTALE LLM/media** | **~€50-90/mese** |

Margine sul tier €1.200-1.500/mese: **~93-96%**. Sano.

---

## 12. Note di implementazione

1. **Provider abstraction obbligatoria**: `@voler/ai` deve esporre un'interfaccia uniforme così che cambiare modello = cambiare config, non codice. Es: `complete({task, tier})` risolve internamente il modello.

2. **Model versioning in DB**: ogni `LlmUsage`, `ContentMediaAsset`, `ContentEmbedding` salva il `model` esatto usato. Quando si fa upgrade, si sa cosa è stato generato con cosa.

3. **Circuit breaker**: pattern ereditato da BT (`provider-circuit-breaker.ts`). Se un provider è down, cascade al fallback automaticamente.

4. **Pricing table aggiornabile**: i costi in `@voler/ai` pricing table devono essere in config (env o DB), NON hardcoded — i prezzi cambiano.

5. **Replicate vs self-host**: per FLUX.2 e SDXL partiamo da Replicate (pay-per-use). Quando il volume cresce (>10k img/mese), valutare self-hosting su Modal/fly.io per risparmio.

6. **Licensing check**: GPT Image 2, Nano Banana Pro, Seedream, FLUX.2 [pro/max], Recraft V4 grant commercial use su paid tier ma NON indennizzano contro copyright claims. FLUX.2 [klein] è Apache 2.0 (open). Documentare per ogni cliente la provenienza degli asset.

7. **AI Act disclosure**: tutti i media generati/editati devono avere metadata "synthetic" + watermark dove richiesto (vedi sezione AI Act compliance nel design doc).

---

## 13. Changelog di questo documento

| Data | Cambio |
|---|---|
| 2026-05-20 | Creazione. Ricerca completa su tutti i servizi. Sostituiti modelli legacy 2025 (gpt-image-1, Flux Kontext, GPT-4o, eleven_multilingual_v2 come default) con state-of-the-art maggio 2026. |

---

## Fonti

- [GPT Image 2 — OpenAI](https://openai.com/index/introducing-chatgpt-images-2-0/) (apr 2026)
- [GPT-5.5 — OpenAI](https://openai.com/index/introducing-gpt-5-5/) (apr 2026)
- [OpenAI next-gen audio models](https://openai.com/index/introducing-our-next-generation-audio-models/)
- [Claude Opus 4.7 — Anthropic](https://www.anthropic.com/news/claude-opus-4-7) (apr 2026)
- [Claude models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [FLUX.2 [max] — Black Forest Labs](https://bfl.ai/models/flux-2-max)
- [FLUX.2 — Black Forest Labs](https://bfl.ai/models/flux-2)
- [Gemini image generation (Nano Banana Pro)](https://gemini.google/overview/image-generation/)
- [Gemini 3.1 Pro — DeepMind](https://deepmind.google/models/gemini/pro/)
- [Imagen 4 — Google AI](https://ai.google.dev/gemini-api/docs/imagen)
- [ElevenLabs models](https://elevenlabs.io/docs/overview/models)
- [Cartesia Sonic-3](https://cartesia.ai/sonic)
- [OpenAI embeddings](https://openai.com/index/new-embedding-models-and-api-updates/)
- [Video models comparison (Veo 3.1 / Sora 2 / Kling 3.0)](https://lushbinary.com/blog/ai-video-generation-sora-veo-kling-seedance-comparison/)
- [Seedream 5.0 vs Nano Banana Pro vs FLUX](https://wavespeed.ai/blog/posts/seedream-5-0-vs-nano-banana-pro-gpt-image-flux-klein-qwen-image-comparison-2026/)
- [Best AI image editing with reference images 2026](https://magichour.ai/blog/best-ai-image-editing-models-with-reference-images)
- [Replicate image models](https://replicate.com/collections/text-to-image)

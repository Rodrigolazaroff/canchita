import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 20

interface Scorer {
  name: string
  goals: number
}

interface NarrateBody {
  groupName?: string
  venueName?: string
  matchDate?: string
  scoreDark: number
  scoreLight: number
  scorersDark: Scorer[]
  scorersLight: Scorer[]
}

const MODEL = 'gemini-2.5-flash'

function buildPrompt(b: NarrateBody): string {
  const fmtScorers = (s: Scorer[]) =>
    s.length
      ? s.map(x => `${x.name} (${x.goals})`).join(', ')
      : 'sin goleadores'

  const resultado =
    b.scoreDark > b.scoreLight
      ? 'Ganó el equipo Oscuro'
      : b.scoreLight > b.scoreDark
        ? 'Ganó el equipo Claro'
        : 'Terminó empatado'

  return `Sos un relator de fútbol argentino. Escribí una narración corta y con onda
sobre este partido amateur entre amigos, para compartir por WhatsApp.

DATOS DEL PARTIDO:
- Grupo: ${b.groupName || 'la banda'}
- Cancha: ${b.venueName || 'la canchita de siempre'}
- Resultado: Oscuro ${b.scoreDark} - ${b.scoreLight} Claro (${resultado})
- Goleadores Oscuro: ${fmtScorers(b.scorersDark)}
- Goleadores Claro: ${fmtScorers(b.scorersLight)}

INSTRUCCIONES:
- Usá jerga futbolera bien argentina (ej: "la rompió", "figura", "golazo",
  "se la comieron", "achicaron", "el rival lo sufrió", "puso huevo").
- Tono divertido, picante y entre amigos. Nada solemne.
- Mencioná al goleador o figura si hay uno claro.
- Si fue empate, jugá con eso (repartieron puntos, quedaron a mano).
- Máximo 4 frases. Que sea breve y compartible.
- Podés usar 1 o 2 emojis de fútbol, no más.
- No uses comillas ni títulos. Solo el texto del relato.`
}

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_AI_API_KEY no configurada' },
      { status: 500 },
    )
  }

  let body: NarrateBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  // Timeout defensivo para que la request no quede colgada.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(body) }] }],
          generationConfig: {
            temperature: 1.1,
            maxOutputTokens: 400,
            topP: 0.95,
            // Gemini 2.5 Flash tiene "thinking" ON por defecto y consume el
            // presupuesto de tokens, truncando la respuesta. Lo desactivamos:
            // esta tarea es creativa simple, no necesita razonamiento previo.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    )

    if (!res.ok) {
      const detail = await res.text()
      console.error('Gemini error:', res.status, detail)
      return NextResponse.json(
        { error: 'No se pudo generar la narración' },
        { status: 502 },
      )
    }

    const data = await res.json()
    const candidate = data?.candidates?.[0]
    const text: string | undefined = candidate?.content?.parts
      ?.map((p: { text?: string }) => p?.text ?? '')
      .join('')
      .trim()

    if (candidate?.finishReason === 'MAX_TOKENS') {
      console.warn('Gemini truncó la respuesta por MAX_TOKENS')
    }

    if (!text) {
      console.error('Gemini sin texto. finishReason:', candidate?.finishReason)
      return NextResponse.json(
        { error: 'Respuesta vacía del modelo' },
        { status: 502 },
      )
    }

    return NextResponse.json({ text })
  } catch (e) {
    const aborted = (e as Error).name === 'AbortError'
    console.error('Narrate route error:', e)
    return NextResponse.json(
      { error: aborted ? 'Tardó demasiado' : 'Error inesperado' },
      { status: aborted ? 504 : 500 },
    )
  } finally {
    clearTimeout(timeout)
  }
}

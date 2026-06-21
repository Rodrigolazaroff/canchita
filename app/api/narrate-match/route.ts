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

  return `Sos un relator de fútbol argentino apasionado, de esos que convierten
un picado entre amigos en una épica de cancha llena. Escribí una narración corta,
para compartir por WhatsApp, sobre este partido amateur.

DATOS DEL PARTIDO:
- Grupo: ${b.groupName || 'la banda'}
- Cancha: ${b.venueName || 'la canchita de siempre'}
- Resultado: Oscuro ${b.scoreDark} - ${b.scoreLight} Claro (${resultado})
- Goleadores Oscuro: ${fmtScorers(b.scorersDark)}
- Goleadores Claro: ${fmtScorers(b.scorersLight)}

PALETA DE JERGA Y RECURSOS (elegí los que peguen, con naturalidad, NO los uses todos):
- Elogio al crack: "la rompió toda", "qué animal", "qué bestia", "una zurda
  endemoniada", "jugador excelso", "es de otro planeta", "tomó Viagra" (para el
  que revive y define), "lo sacaron del freezer", "se cansó de hacer goles".
- Goles lindos: "la picó", "vaselina", "de rabona", "golazo de otro partido",
  "qué pedazo de gol, mamita mía", "gol de loco", "la clavó al ángulo".
- Dominio/baile: "se morfó la cancha", "lo pasó por arriba", "le bailó", "fue un baile".
- Sufrimiento/aprieto: "estaban en el horno", "la sufrieron", "se salvaron en la última".
- Épica/lírica: la marcha "camino a la gloria", repetir el nombre del goleador con
  cadencia (ej. "Jony, Jony, Jony"), tratarlo como ídolo de la hinchada.
- Cierres de autor (usá UNO SOLO, y solo si cierra bien): "Basta para mí.",
  "Viva el fútbol.", "Qué golazo, mamita mía."

REGLAS:
- Es un partido entre AMIGOS. Tono pícaro, épico y divertido. Cargada suave y de
  buena onda está OK, pero PROHIBIDO insultar, putear o agraviar a nadie. No hay
  árbitro: no inventes quejas ni robos arbitrales.
- Si hay un goleador claro, convertilo en el héroe del relato.
- Si fue goleada, remarcá el baile. Si fue empate, jugá con "quedaron a mano /
  repartieron / siguen sin sacarse ventaja".
- Máximo 4 frases. Breve, con ritmo y compartible.
- 1 o 2 emojis de fútbol como mucho.
- Devolvé SOLO el texto del relato: sin comillas, sin título, sin aclaraciones.`
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

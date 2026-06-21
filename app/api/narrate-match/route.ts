import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

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

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(body) }] }],
          generationConfig: {
            temperature: 1.0,
            maxOutputTokens: 300,
            topP: 0.95,
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
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return NextResponse.json(
        { error: 'Respuesta vacía del modelo' },
        { status: 502 },
      )
    }

    return NextResponse.json({ text: text.trim() })
  } catch (e) {
    console.error('Narrate route error:', e)
    return NextResponse.json(
      { error: 'Error inesperado' },
      { status: 500 },
    )
  }
}

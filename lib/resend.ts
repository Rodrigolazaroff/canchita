import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = 'Canchita <onboarding@resend.dev>'
// TODO: cuando tengas dominio verificado, reemplazá por: 'Canchita <noreply@tucanchita.app>'

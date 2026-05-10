import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface EmailPayload {
  template_type: 'document_invitation' | 'signed_notification' | 'reminder' | 'otp'
  to_email: string
  to_name?: string
  subject: string
  html_body: string
  metadata?: Record<string, any>
}

export interface QueueEmailResult {
  success: boolean
  email_id?: string
  error?: string
}

export interface SendEmailResult {
  success: boolean
  error?: string
  resend_id?: string
}

/**
 * Queue an email for sending via the email queue system
 */
export async function queueEmail(
  supabaseAdmin: SupabaseClient,
  payload: EmailPayload
): Promise<QueueEmailResult> {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_queue')
      .insert({
        template_type: payload.template_type,
        to_email: payload.to_email,
        to_name: payload.to_name,
        subject: payload.subject,
        html_body: payload.html_body,
        metadata: payload.metadata || {}
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to queue email:', error)
      return { success: false, error: error.message }
    }

    console.log('Email queued successfully:', data.id)
    return { success: true, email_id: data.id }
  } catch (error) {
    console.error('Error queuing email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send an email immediately via Resend API
 */
export async function sendEmailNow(
  resendApiKey: string,
  payload: EmailPayload
): Promise<SendEmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'FirmaClara <noreply@firmaclara.com>',
        to: [payload.to_email],
        subject: payload.subject,
        html: payload.html_body
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', data)
      return {
        success: false,
        error: data.message || 'Resend API error'
      }
    }

    console.log('Email sent successfully:', data.id)
    return {
      success: true,
      resend_id: data.id
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
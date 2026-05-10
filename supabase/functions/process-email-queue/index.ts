import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { sendEmailNow, type EmailPayload } from '../_shared/emailQueue.ts'

const MAX_EMAILS_PER_RUN = 20
const MAX_ATTEMPTS = 5

// Exponential backoff in minutes: 1, 2, 4, 8, 16
function getNextRetryDelay(attempts: number): number {
  return Math.pow(2, attempts - 1)
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) return preflightResponse

  console.log("Processing email queue...")

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY")
      throw new Error('Internal Server Error: Missing Configuration')
    }

    // Create admin client for service operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get pending and failed emails ready for retry
    const { data: emails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('next_retry_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(MAX_EMAILS_PER_RUN)

    if (fetchError) {
      console.error('Error fetching emails:', fetchError)
      throw new Error('Failed to fetch emails from queue')
    }

    if (!emails || emails.length === 0) {
      console.log('No emails to process')
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${emails.length} emails...`)
    let processed = 0
    let sent = 0
    let failed = 0

    for (const email of emails) {
      try {
        const emailPayload: EmailPayload = {
          template_type: email.template_type,
          to_email: email.to_email,
          to_name: email.to_name,
          subject: email.subject,
          html_body: email.html_body,
          metadata: email.metadata
        }

        const result = await sendEmailNow(RESEND_API_KEY, emailPayload)

        if (result.success) {
          // Update as sent
          await supabaseAdmin
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', email.id)

          sent++
          console.log(`Email ${email.id} sent successfully`)
        } else {
          // Handle failure
          const newAttempts = email.attempts + 1

          if (newAttempts >= MAX_ATTEMPTS) {
            // Mark as dead after max attempts
            await supabaseAdmin
              .from('email_queue')
              .update({
                status: 'dead',
                attempts: newAttempts,
                last_attempt_at: new Date().toISOString(),
                error_message: result.error
              })
              .eq('id', email.id)

            console.log(`Email ${email.id} marked as dead after ${newAttempts} attempts`)
          } else {
            // Schedule retry with exponential backoff
            const retryDelay = getNextRetryDelay(newAttempts)
            const nextRetry = new Date(Date.now() + retryDelay * 60 * 1000)

            await supabaseAdmin
              .from('email_queue')
              .update({
                status: 'failed',
                attempts: newAttempts,
                last_attempt_at: new Date().toISOString(),
                next_retry_at: nextRetry.toISOString(),
                error_message: result.error
              })
              .eq('id', email.id)

            console.log(`Email ${email.id} failed, retry scheduled in ${retryDelay} minutes`)
          }

          failed++
        }

        processed++
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error)
        failed++
      }
    }

    console.log(`Queue processing complete: ${processed} processed, ${sent} sent, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        sent,
        failed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Email queue processing error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: JSON.stringify(error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
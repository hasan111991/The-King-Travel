export type NotificationEventType =
  | 'Booking Request Received'
  | 'Payment Received'
  | 'Payment Verification Update'
  | 'Booking Confirmed'
  | 'Ticket Issued'
  | 'Booking Cancelled'
  | 'Refund Update'
  | 'New Flight Request'
  | 'Request Under Review'
  | 'Quotation Sent'
  | 'Customer Selected Quotation'
  | 'Payment Verified'
  | 'Request Cancelled';

export interface NotificationDispatchPayload {
  eventType: NotificationEventType;
  bookingReference: string;
  recipientEmail: string;
  recipientPhone?: string;
  customerName: string;
  subject: string;
  message: string;
}

export interface NotificationDeliveryResult {
  emailSent: boolean;
  whatsappSent: boolean;
  emailProviderStatus: string;
  whatsappProviderStatus: string;
}

export async function dispatchCustomerNotification(
  payload: NotificationDispatchPayload
): Promise<NotificationDeliveryResult> {
  let emailSent = false;
  let whatsappSent = false;
  let emailProviderStatus = 'Email provider key (RESEND_API_KEY) not configured; recorded in customer portal.';
  let whatsappProviderStatus =
    'WhatsApp Business API credentials not configured; queued for manual WhatsApp desk follow-up.';

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM?.trim() || 'noreply@thekingtravel.example';

  if (resendKey && payload.recipientEmail) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `The King Travel <${fromEmail}>`,
          to: [payload.recipientEmail],
          subject: `[${payload.bookingReference}] ${payload.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #0F2942; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0F2942; border-bottom: 2px solid #FD8F1C; padding-bottom: 8px;">The King Travel</h2>
              <p>Hello ${payload.customerName},</p>
              <p><strong>Update:</strong> ${payload.eventType}</p>
              <p style="line-height: 1.6; white-space: pre-line;">${payload.message}</p>
              <p style="font-size: 13px; color: #486581;">Reference: <strong>${payload.bookingReference}</strong></p>
              <hr style="border: none; border-top: 1px solid #D9E2EC; margin: 20px 0;" />
              <p style="font-size: 12px; color: #627D98;">The King Travel — Your Ultimate Travel Partner! · Dallas, Texas, USA</p>
            </div>
          `,
        }),
      });
      if (res.ok) {
        emailSent = true;
        emailProviderStatus = 'Email dispatched via Resend.';
      } else {
        emailProviderStatus = `Resend returned status ${res.status}.`;
      }
    } catch (err) {
      emailProviderStatus = err instanceof Error ? err.message : 'Email dispatch error';
    }
  }

  const waToken = process.env.WHATSAPP_CLOUD_API_TOKEN?.trim();
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (waToken && waPhoneId && payload.recipientPhone) {
    const cleanPhone = payload.recipientPhone.replace(/[^\d]/g, '');
    if (cleanPhone.length >= 10) {
      try {
        const waRes = await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${waToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'text',
            text: {
              body: `The King Travel (${payload.bookingReference}) — ${payload.eventType}: ${payload.message}`,
            },
          }),
        });
        if (waRes.ok) {
          whatsappSent = true;
          whatsappProviderStatus = 'WhatsApp notification sent via Meta Cloud API.';
        } else {
          whatsappProviderStatus = `WhatsApp Cloud API returned status ${waRes.status}.`;
        }
      } catch (err) {
        whatsappProviderStatus = err instanceof Error ? err.message : 'WhatsApp dispatch error';
      }
    }
  }

  return {
    emailSent,
    whatsappSent,
    emailProviderStatus,
    whatsappProviderStatus,
  };
}

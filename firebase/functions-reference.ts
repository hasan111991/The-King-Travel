/**
 * Firebase Cloud Functions v2 Reference for The King Travel
 *
 * Deploy inside a dedicated `functions/` workspace using `firebase deploy --only functions`.
 * Secrets are stored via `firebase functions:secrets:set <KEY>`.
 */

/*
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as crypto from 'node:crypto';

admin.initializeApp();
const db = admin.firestore();

export const onBookingStatusChanged = onDocumentUpdated('bookings/{bookingId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  if (before.bookingStatus !== after.bookingStatus) {
    const notificationId = `ntf_${Date.now()}`;
    await db.collection('notifications').doc(notificationId).set({
      notificationId,
      userId: after.userId,
      bookingId: after.bookingId,
      type: after.bookingStatus,
      title: `Booking ${after.bookingReference}: ${after.bookingStatus}`,
      message: `Your booking status is now ${after.bookingStatus}.`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

export const stripePaymentWebhook = onRequest(async (req, res) => {
  const signature = req.headers['stripe-signature'] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!signature || !webhookSecret) {
    res.status(401).send('Missing webhook signature or secret');
    return;
  }
  // Verify Stripe signature and update booking/payment status server-side
  res.status(200).json({ received: true });
});
*/
export {};

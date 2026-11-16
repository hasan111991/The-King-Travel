# Security Specification — The King Travel

## 1. Data Invariants
1. **User Identity & Role Isolation**: A user document at `/users/{userId}` can only be read by its owner (`request.auth.uid == userId`) or an administrator. A user cannot assign or escalate their own `role` or modify `status` (`active`/`blocked`). Only a `super_admin` can create or modify `/admins/{uid}` entries or update user roles.
2. **Booking Ownership & State Integrity**: Every `/bookings/{bookingId}` document must have `userId == request.auth.uid` on creation, `bookingStatus` initialized to `'New Request'` or `'Pending Payment'`, and `paymentStatus` initialized to `'unpaid'`. Customers cannot self-confirm payments (`paymentStatus: 'confirmed'`) or issue tickets (`bookingStatus: 'Ticket Issued'`). Once a booking reaches a terminal state (`Ticket Issued`, `Cancelled`, `Refunded`), customers cannot mutate it; only admins can issue corrections or refunds.
3. **Payment Verification Invariant**: Uploading a manual receipt in `/payments/{paymentId}` sets `verificationStatus: 'pending'`. Only an administrator (or verified server webhook) can transition `verificationStatus` to `'verified'` or `'rejected'`.
4. **Catalog Integrity**: Public collections (`flightOffers`, `destinations`, `offers`, `testimonials`, `settings/public`) are readable publicly for website browsing, but writable ONLY by authenticated, email-verified administrators.
5. **Support & Newsletter Privacy**: Anyone (or signed-in users) can submit `/inquiries/{inquiryId}` or `/newsletter/{subscriberId}` with validated payload constraints, but listing/reading inquiries is restricted strictly to the owning `userId` (if present) or administrators, and reading newsletter subscribers is restricted strictly to administrators.
6. **Immutable Audit Logs**: `/auditLogs/{logId}` can only be appended by verified administrators and can never be updated or deleted.
7. **Temporal & Path Integrity**: All single-document operations validate `isValidId()` (`^[a-zA-Z0-9_\-]+$`, max 128 chars), enforce server timestamps (`request.time`) on `createdAt`/`updatedAt`, enforce string `.size()` bounds on every string field, and enforce `keys().hasAll()` + `keys().hasOnly()` on creates and `affectedKeys().hasOnly()` on updates.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Privilege Escalation (User Create)**: `{ uid: "attacker", name: "Eve", email: "eve@test.com", role: "super_admin", status: "active" }` -> Denied because `role` must be `'customer'`.
2. **Shadow Field Injection (User Update)**: `{ name: "Eve", isAdmin: true, updatedAt: serverTime }` -> Denied by `affectedKeys().hasOnly(...)` and `hasOnly(...)`.
3. **PII Cross-User Read**: Signed-in user `uidA` calling `get(/users/uidB)` -> Denied by `isOwner(userId) || isAdmin()`.
4. **Booking Ownership Spoofing**: User `uidA` creating `/bookings/b1` with `userId: "uidB"` -> Denied because `incoming().userId == request.auth.uid`.
5. **Fake Payment Confirmation by Customer**: User `uidA` creating `/bookings/b1` with `paymentStatus: "confirmed"` and `bookingStatus: "Ticket Issued"` -> Denied because customer create requires initial pending states.
6. **Receipt Self-Verification**: User `uidA` updating `/payments/p1` with `verificationStatus: "verified"` -> Denied because only `isAdmin()` can verify payments.
7. **Terminal State Bypass**: User `uidA` updating `/bookings/b1` after `bookingStatus == "Cancelled"` -> Denied by terminal state lock.
8. **ID Poisoning Attack**: Writing to `/bookings/${"A".repeat(300)}` -> Denied by `isValidId(bookingId)` (`<= 128` chars & regex).
9. **Spoofed Unverified Admin Email**: Authenticated token with `email: "hasanaamir815@gmail.com"` and `email_verified: false` -> Denied because `email_verified == true` is strictly required.
10. **Public Inquiry Scraping**: Non-admin user calling `list` on `/inquiries` without matching `resource.data.userId == request.auth.uid` -> Denied by query enforcer.
11. **Audit Log Tampering**: Admin attempting `delete` or `update` on `/auditLogs/log1` -> Denied (`allow update, delete: if false;`).
12. **Client Timestamp Forgery**: Creating a booking with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> Denied by `incoming().createdAt == request.time`.

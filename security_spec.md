# Security Specification & Invariants for Talksy

## 1. Data Invariants

1. **User Identity Invariant**: A user document at `/users/{userId}` can only be created or modified if `request.auth.uid == userId` or if caller is a verified admin in `/admins/{adminId}`. Role and disabled status cannot be self-escalated.
2. **Sender Authenticity Invariant**: A message at `/messages/{messageId}` must have `incoming().senderId == request.auth.uid`. A user cannot forge messages from another user.
3. **Participant Privacy Invariant**: A message can only be read by its `senderId` or `receiverId`, or by an administrator. Blanket reads/listings are strictly prohibited.
4. **Message Immutability Invariant**: On message update, `senderId`, `receiverId`, and `createdAt` are immutable. Users can only edit `text`, `reactions`, or `isDeleted` on their own sent messages or update delivery status (`delivered`, `read`) if they are the receiver.
5. **Report Isolation Invariant**: Reports at `/reports/{reportId}` can only be submitted with `incoming().reportedBy == request.auth.uid`. Reports can only be read and managed by admins.
6. **Path Hardening Invariant**: All document ID parameters (`userId`, `messageId`, `reportId`) must satisfy `isValidId()` (regex `^[a-zA-Z0-9_\-]+$`, size <= 128) to prevent ID injection.
7. **Strict Field Bound Invariant**: String lengths must not exceed blueprint limits (`text <= 5000`, `bio <= 200`, `displayName <= 100`).

---

## 2. The Dirty Dozen Payloads

1. **Dirty 01: Message Spoofing** - `senderId: "attacker"` creates message with `senderId: "victim"`. Expected: `PERMISSION_DENIED`.
2. **Dirty 02: Shadow Field Injection** - User creates user profile with rogue field `role: "admin"` or `isAdmin: true`. Expected: `PERMISSION_DENIED`.
3. **Dirty 03: Eavesdropping List Query** - User attempts `getDocs(collection(db, "messages"))` without filtering by their own UID. Expected: `PERMISSION_DENIED`.
4. **Dirty 04: Message Text Tampering by Receiver** - Recipient attempts to modify `text` of a message sent by someone else. Expected: `PERMISSION_DENIED`.
5. **Dirty 05: Immutable Timestamp Modification** - Sender attempts to rewrite `createdAt` timestamp during edit. Expected: `PERMISSION_DENIED`.
6. **Dirty 06: Oversized Payload Denial of Wallet** - Sender attempts to write a message with `text` string of 1MB. Expected: `PERMISSION_DENIED`.
7. **Dirty 07: Unauthenticated Read** - Unauthenticated user requests `/users/{userId}` or `/messages/{messageId}`. Expected: `PERMISSION_DENIED`.
8. **Dirty 08: Report Impersonation** - User submits a report claiming `reportedBy: "someoneElse"`. Expected: `PERMISSION_DENIED`.
9. **Dirty 09: Non-Admin Access to Admin Role** - Regular user attempts to write to `/admins/{adminId}`. Expected: `PERMISSION_DENIED`.
10. **Dirty 10: Non-Admin Reading Other's Reports** - Non-admin user attempts to list or read documents in `/reports`. Expected: `PERMISSION_DENIED`.
11. **Dirty 11: Invalid ID Path Injection** - Target path containing invalid characters or 1000 characters `userId = "../evil"`. Expected: `PERMISSION_DENIED`.
12. **Dirty 12: Account State Escalation** - Non-admin user attempts to set their own `disabled: false` when disabled by admin. Expected: `PERMISSION_DENIED`.

---

## 3. Test Runner Specification (`firestore.rules.test.ts`)
The tests enforce that all 12 dirty payloads are rejected by Firestore Security Rules.

# Talksy Social & Community Platform Expansion

An end-to-end transformation of Talksy from a direct messaging tool into an integrated social community ecosystem. This plan introduces rich User Profiles with cover images and activity timelines, a complete Friends System with mutual connections and requests, Group & Community spaces with moderator controls, a Social Feed with 24-hour disappearing Stories and saved posts, and a real-time Notification and Safety center—all governed under Admin Zayan's private invite-code architecture.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core product and navigation decisions were confirmed during Phase 1 clarification:
> - **Navigation Architecture**: Top navigation bar with seamless full-screen page transitions across primary views (Chats, Feed, Groups, Friends, Profile).
> - **Access & Membership**: Retaining Admin Zayan's private invite-code and admin-managed creation model to preserve privacy, preventing spam while allowing community members with valid invite codes to join.
> - **Stories Experience**: Horizontal interactive Story tray placed prominently above the main feed and chat list for instant visibility and playback.

---

## 1. Overview & Core Concept

- **What It Does**: Evolves Talksy into a comprehensive social and private communication hub. Users can exchange private and group messages, publish thoughts and media to the community feed, share ephemeral 24-hour stories, join interest-based group communities, manage friend requests, and customize profile privacy.
- **Target Audience**: Private networks, close-knit friend circles, and specialized communities desiring high-fidelity communication (voice notes, HD calls) paired with modern social networking (feeds, stories, discussions).
- **Key Value**: Eliminates the boundary between a private messaging app and a community social network, keeping data encrypted, authenticated, and free of algorithmic noise.

---

## 2. User Experience & Visual Design

### Top Navigation & Page Architecture
The app adopts a sleek top navigation bar conforming to the one-row three-zone contract:
- **Brand Zone**: Talksy glowing wordmark and live connectivity status indicator.
- **Navigation Zone**: Clean single-line navigation tabs:
  1. `💬 Chats` — 1:1 and group conversations, voice notes, calls, linked devices.
  2. `📰 Feed` — Social feed with 24h stories tray, media posts, hashtags, and saved items.
  3. `👥 Groups` — Public/private community hubs, announcements, and group discussions.
  4. `🤝 Friends` — Friend requests, mutual friend discovery, and user suggestions.
  5. `👤 Profile` — Personal profile with banner, bio, interests, timeline, and privacy settings.
- **Action Zone**: Search trigger, notification bell with unread count badge, and quick user avatar menu with Admin Dashboard (for Admin Zayan).

### Visual Identity & Theme
- **Theme Tokens**: Deep void slate (`#030712` base, `#070e20` surface panels, `#0b1428` card elevate) accented by emerald-teal highlights (`#10b981`, `#0284c7`) and cool slate typography (`#f1f5f9` titles, `#94a3b8` body).
- **Typography**: `Plus Jakarta Sans` for titles, navigation, and crisp scannability; `JetBrains Mono` for tabular metrics, timestamps, and pairing codes.
- **Zero-Pill Discipline**: Metadata (post timestamps, like counts, group member counts, friend statuses) rendered with clean unboxed text and typographic dots (`·`).
- **Horizontal Story Tray**: Floating circular avatars with glowing gradient perimeter rings (`from-emerald-400 via-teal-500 to-sky-500`) indicating unwatched stories, plus an "Add Story" quick creator with camera/media preview.
- **Story Viewer Modal**: Full-screen immersive viewer with segmented countdown progress bars (5 seconds per slide), pause-on-hold, and reply/reaction drawer.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Top Navigation with Full-Screen Panes vs. Accordion Sidebar**
  - *Chosen Approach*: Top navigation bar with full-screen page transitions.
  - *Why*: Accommodates rich social views (media feeds, group boards, detailed profiles) with maximum horizontal real estate and responsive mobile layouts, while keeping direct chats accessible in one click.
  - *Alternatives Considered*: Cluttered multi-level sidebar; rejected because it constrained feed post widths and timeline media.

- **Decision 2: Admin-Managed & Invite-Code Access vs. Open Public Registration**
  - *Chosen Approach*: Invite codes issued and managed by Admin Zayan.
  - *Why*: Preserves the user's explicit directive to eliminate public account sprawl, while allowing trusted community growth through invite codes.

- **Decision 3: Local Storage + Firebase Firestore Hybrid Sync**
  - *Chosen Approach*: Real-time state synchronized through Express backend + SSE events with Firestore blueprint persistence for scalable collections (`users`, `messages`, `posts`, `stories`, `groups`, `reports`, `devices`).
  - *Why*: Delivers sub-50ms local responsiveness and offline fallback combined with cloud backup and zero data loss.

---

## 4. Technical Architecture & Data Strategy

### System & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Top Navigation Bar                              │
│  [Talksy Logo]  ───  [Chats | Feed | Groups | Friends | Profile] ───   │
│                      [Notifications (4)] [Admin] [Avatar]              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Active View Router
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│    Chats View     │     │    Feed View      │     │   Groups View     │
│ ├─ Chat List      │     │ ├─ Story Tray     │     │ ├─ Discover Hub   │
│ ├─ Active Chat    │     │ ├─ Post Creator   │     │ ├─ Community Feed │
│ ├─ Voice & Calls  │     │ ├─ Feed Stream    │     │ ├─ Announcements  │
│ └─ Linked Devices │     │ └─ Saved Posts    │     │ └─ Mod Controls   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
          │                         │                         │
          ▼                         ▼                         ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│   Friends View    │     │   Profile View    │     │ Notification Drawer│
│ ├─ Request Center │     │ ├─ Cover & Avatar │     │ ├─ Real-Time Push │
│ ├─ Mutual Friends │     │ ├─ Bio & Details  │     │ ├─ Friend Alerts  │
│ └─ Blocked List   │     │ └─ Privacy & 2FA  │     │ └─ Safety Reports │
└───────────────────┘     └───────────────────┘     └───────────────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Central State & API Layer                         │
│  ├─ SSE Event Hub (/api/events) - Presence, Messages, Alerts, Feed     │
│  ├─ REST API Endpoints (/api/posts, /api/stories, /api/groups, etc.)   │
│  └─ Cloud Firestore Schema (users, messages, posts, groups, reports)   │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Entities & Schema Expansion
1. **User Profile**: Adds `coverUrl`, `interests: string[]`, `location`, `privacySettings: { profileVisibility, allowMessagesFrom, showOnlineStatus }`, and `twoFactorEnabled: boolean`.
2. **Friends & Relations**: `friendRequests: { id, fromId, toId, status: 'pending'|'accepted'|'declined', createdAt }`, `blockedUsers: string[]`.
3. **Posts**: `{ id, authorId, text, mediaUrl?, mediaType?, likes: string[], comments: { id, authorId, text, createdAt }[], sharesCount, tags: string[], savedBy: string[], createdAt }`.
4. **Stories**: `{ id, authorId, mediaUrl, text?, expiresAt, viewers: string[], createdAt }` (auto-filtered for $\le 24$ hours).
5. **Groups**: `{ id, name, description, avatarUrl, bannerUrl, isPrivate, members: { userId, role: 'admin'|'moderator'|'member' }[], announcements: string[], createdAt }`.
6. **Notifications**: `{ id, userId, type: 'friend_request'|'like'|'comment'|'group_invite'|'mention', title, body, link?, read: boolean, createdAt }`.

---

## 5. Execution Steps

1. **State & Types Definition**: Expand `src/types/chat.ts` with Post, Story, Group, FriendRequest, and Notification interfaces.
2. **Backend Routes & Persistence**: Implement endpoints in `server.ts` for social posts, stories, group management, friend requests, and notifications with SSE broadcasting.
3. **Navigation Shell**: Build the responsive Top Navigation bar in `App.tsx` coordinating full-screen views.
4. **Stories & Social Feed**: Construct `SocialFeedView.tsx` with the horizontal story tray, post creation composer, and post interaction cards.
5. **Groups & Communities**: Build `GroupsView.tsx` with group discovery, creation modal, discussion boards, and member administration.
6. **Friends Center**: Build `FriendsView.tsx` with friend request handling, suggestions, and mutual friends.
7. **Enhanced Profile & Privacy**: Upgrade `UserProfileModal` / profile view with cover photo uploads, interest tags, activity history, and privacy/2FA settings.
8. **Notification Drawer**: Implement slide-over `NotificationDrawer.tsx` with live unread indicators.
9. **Verification**: Verify type soundness with `lint_applet` and build integrity with `compile_applet`.

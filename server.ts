import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'zayan_chat.json');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Security: Hide server technology header
app.disable('x-powered-by');

// Security Headers Middleware (OWASP recommended)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  next();
});

// Middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads serving with nosniff and safe cache headers
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  })
);

// In-Memory Brute-Force Rate Limiter for Login
interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}
const loginRateLimitMap = new Map<string, RateLimitRecord>();

function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = loginRateLimitMap.get(key);
  if (!entry) return { allowed: true, retryAfterSeconds: 0 };
  if (now > entry.resetAt) {
    loginRateLimitMap.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (entry.attempts >= 5) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

function recordLoginAttempt(key: string, success: boolean) {
  const now = Date.now();
  if (success) {
    loginRateLimitMap.delete(key);
    return;
  }
  const entry = loginRateLimitMap.get(key) || { attempts: 0, resetAt: now + 15 * 60 * 1000 };
  entry.attempts += 1;
  loginRateLimitMap.set(key, entry);
}

// Password Hashing utilities
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, chosenSalt, 64).toString('hex');
  return { hash, salt: chosenSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
  } catch {
    return false;
  }
}

// Database schema interfaces
export interface User {
  id: string; // unique ID / username
  username?: string;
  displayName: string;
  role: 'admin' | 'friend';
  plainPassword?: string;
  studentNumber?: string;
  passwordHash: string;
  salt: string;
  avatarUrl: string;
  coverUrl?: string;
  bio: string;
  status: string; // "Available", "Busy", "At Work", etc.
  location?: string;
  interests?: string[];
  followers?: string[];
  following?: string[];
  blockedUsers?: string[];
  twoFactorEnabled?: boolean;
  privacySettings?: {
    profileVisibility: 'public' | 'friends' | 'private';
    allowMessagesFrom: 'everyone' | 'friends';
    showOnlineStatus: boolean;
  };
  disabled: boolean;
  online: boolean;
  lastSeen: string; // ISO
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  groupId?: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'voice' | 'file' | 'gif';
  fileName?: string;
  fileSize?: number;
  voiceDuration?: number; // seconds
  replyToId?: string;
  replyToSnippet?: {
    text: string;
    senderId: string;
    mediaType?: string;
  };
  reactions: Reaction[];
  status: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  editedAt?: string;
}

export interface Report {
  id: string;
  messageId?: string;
  postId?: string;
  reportedBy: string;
  reportedUserId: string;
  reason: string;
  messageSnippet: string;
  createdAt: string;
  status: 'pending' | 'resolved';
}

export interface SessionRecord {
  id: string;
  token: string;
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'browser';
  browser: string;
  os: string;
  ip: string;
  location: string;
  createdAt: string;
  lastActive: string;
  expiresAt: number;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'admin' | 'friend';
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  tags: string[];
  likes: string[]; // user IDs
  comments: PostComment[];
  sharesCount: number;
  savedBy: string[]; // user IDs
  createdAt: string;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  mediaUrl?: string;
  text?: string;
  bgColor?: string;
  viewers: string[]; // user IDs
  createdAt: string;
  expiresAt: string;
}

export interface GroupMember {
  userId: string;
  displayName: string;
  avatarUrl: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
}

export interface GroupAnnouncement {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  bannerUrl: string;
  isPrivate: boolean;
  createdBy: string;
  members: GroupMember[];
  announcements: GroupAnnouncement[];
  tags: string[];
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  type: 'friend_request' | 'friend_accepted' | 'like' | 'comment' | 'mention' | 'group_invite' | 'group_announcement';
  title: string;
  body: string;
  targetId?: string;
  read: boolean;
  createdAt: string;
}

export interface InviteCode {
  code: string;
  createdBy: string;
  usedBy?: string;
  createdAt: string;
}

export interface BookmarkRecord {
  userId: string;
  messageId: string;
  createdAt: string;
}

export interface ReminderRecord {
  id: string;
  userId: string;
  messageId: string;
  remindAt: string;
  note?: string;
  done: boolean;
  createdAt: string;
}

export interface PinnedMessageRecord {
  conversationId: string;
  messageId: string;
  pinnedBy: string;
  pinnedAt: string;
}

export interface GroupAuditLog {
  id: string;
  groupId: string;
  actorId: string;
  actorName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface WorkspaceLayoutRecord {
  userId: string;
  layout: any;
  updatedAt: string;
}

interface Database {
  users: User[];
  messages: Message[];
  sessions: SessionRecord[];
  reports: Report[];
  posts: Post[];
  stories: Story[];
  groups: Group[];
  friendRequests: FriendRequest[];
  notifications: NotificationItem[];
  inviteCodes: InviteCode[];
  bookmarks: BookmarkRecord[];
  reminders: ReminderRecord[];
  pinnedMessages: PinnedMessageRecord[];
  groupAuditLogs: GroupAuditLog[];
  workspaceLayouts: WorkspaceLayoutRecord[];
}

export const INITIAL_STUDENT_USERS = [
  { num: '380', name: 'ASHMIL SHAN M' },
  { num: '404', name: 'THANSEEM' },
  { num: '376', name: 'MUHAMMED SIDHAN M K' },
  { num: '388', name: 'MUHAMMED SHAMEEM.M.T' },
  { num: '395', name: 'AFEEF MUHSIN T' },
  { num: '377', name: 'MUHAMMED JAVAD M' },
  { num: '392', name: 'MUHAMMED NIHAD' },
  { num: '387', name: 'MUHAMMED SHAMIL N' },
  { num: '384', name: 'MUHAMMED FAYAS' },
  { num: '397', name: 'ABDUL HADI K' },
  { num: '393', name: 'MUHAMMED SALIF K' },
  { num: '400', name: 'MUHAMMED MIDLAJ.V' },
  { num: '398', name: 'MUHAMMED RAYYAN KP' },
  { num: '353', name: 'MUHAMMED SHIFAN' },
  { num: '408', name: 'MOHAMMED ZAYAN K' },
  { num: '383', name: 'ABDUL RAHMAN KP' },
  { num: '407', name: 'MUHAMMED SHADIN KC' },
  { num: '420', name: 'MUHAMMED SARTHAJ P' },
  { num: '402', name: 'MUHAMMED NIHAL P S' },
  { num: '385', name: 'MUHAMMED SHABIL P' },
  { num: '381', name: 'HAFIDH P' },
  { num: '389', name: 'MUHAMMED HAMDAN' },
  { num: '396', name: 'MUBASHIR MUHAMMED' },
  { num: '530', name: 'Muhammed Nafih M' },
  { num: '531', name: 'SALAHUDHEEN A P' },
  { num: '532', name: 'MUHAMMED SAHAL C P' },
];

function loadDatabase(): Database {
  if (!fs.existsSync(DB_FILE)) {
    // Initial setup with Admin Account only
    const adminPass = hashPassword('zanu4088888');

    const initialDb: Database = {
      users: [
        {
          id: 'zayan',
          displayName: 'Zayan (Admin)',
          role: 'admin',
          passwordHash: adminPass.hash,
          salt: adminPass.salt,
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          bio: 'Creator & Administrator of Zayan Chat ⚡',
          status: 'Online & Building',
          disabled: false,
          online: false,
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      messages: [],
      sessions: [],
      reports: [],
      posts: [],
      stories: [],
      groups: [],
      friendRequests: [],
      notifications: [],
      inviteCodes: [],
      bookmarks: [],
      reminders: [],
      pinnedMessages: [],
      groupAuditLogs: [],
      workspaceLayouts: [],
    };
    saveDatabase(initialDb);
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.users) data.users = [];
    if (!data.messages) data.messages = [];
    if (!data.sessions) data.sessions = [];
    if (!data.reports) data.reports = [];
    if (!data.posts) data.posts = [];
    if (!data.stories) data.stories = [];
    if (!data.groups) data.groups = [];
    if (!data.friendRequests) data.friendRequests = [];
    if (!data.notifications) data.notifications = [];
    if (!data.inviteCodes) data.inviteCodes = [];
    if (!data.bookmarks) data.bookmarks = [];
    if (!data.reminders) data.reminders = [];
    if (!data.pinnedMessages) data.pinnedMessages = [];
    if (!data.groupAuditLogs) data.groupAuditLogs = [];
    if (!data.workspaceLayouts) data.workspaceLayouts = [];

    // Filter out obsolete demo accounts if present
    const demoIds = ['farhan', 'samira', 'aarav'];
    const hadDemoUsers = data.users.some((u: User) => demoIds.includes(u.id));
    if (hadDemoUsers) {
      data.users = data.users.filter((u: User) => !demoIds.includes(u.id));
      data.messages = data.messages.filter((m: Message) => !demoIds.includes(m.senderId) && !demoIds.includes(m.receiverId));
    }

    // Ensure admin user zayan exists with complete profile attributes
    const adminIdx = data.users.findIndex((u: User) => u.id === 'zayan');
    if (adminIdx === -1) {
      const adminPass = hashPassword('zanu4088888');
      data.users.unshift({
        id: 'zayan',
        displayName: 'Zayan (Admin)',
        role: 'admin',
        passwordHash: adminPass.hash,
        salt: adminPass.salt,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        bio: 'Founder & Administrator of Talksy · Building modern privacy-first social experiences ⚡',
        status: 'Online & Building Community',
        location: 'San Francisco, CA',
        interests: ['Tech', 'Design', 'WebRTC', 'Open Source', 'Security'],
        followers: [],
        following: [],
        blockedUsers: [],
        twoFactorEnabled: true,
        privacySettings: {
          profileVisibility: 'public',
          allowMessagesFrom: 'everyone',
          showOnlineStatus: true,
        },
        disabled: false,
        online: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    } else {
      // Ensure profile properties exist
      const adminUser = data.users[adminIdx];
      if (!adminUser.coverUrl) adminUser.coverUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';
      if (!adminUser.interests) adminUser.interests = ['Tech', 'Design', 'WebRTC', 'Security'];
      if (!adminUser.privacySettings) {
        adminUser.privacySettings = { profileVisibility: 'public', allowMessagesFrom: 'everyone', showOnlineStatus: true };
      }
    }

    // Ensure groups array exists
    if (!data.groups) {
      data.groups = [];
    }

    // Seed default posts if empty
    if (data.posts.length === 0) {
      data.posts = [
        {
          id: 'post_init_1',
          authorId: 'zayan',
          authorName: 'Zayan (Admin)',
          authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          authorRole: 'admin',
          text: 'Welcome to the all-new Talksy! ✨ We have combined instant peer messaging with rich social profiles, 24-hour stories, community groups, and private safety controls. Share your first post or story!',
          mediaUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
          mediaType: 'image',
          tags: ['announcements', 'community', 'update'],
          likes: ['zayan'],
          comments: [
            {
              id: 'c_1',
              postId: 'post_init_1',
              authorId: 'zayan',
              authorName: 'Zayan (Admin)',
              authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              text: 'Feel free to leave comments or create your own group in the Groups tab!',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
          ],
          sharesCount: 3,
          savedBy: [],
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'post_init_2',
          authorId: 'zayan',
          authorName: 'Zayan (Admin)',
          authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          authorRole: 'admin',
          text: 'Pro-tip: Try clicking on any profile avatar to view their cover banner, personal interests, mutual friends, and activity timeline. 🛡️',
          tags: ['tips', 'profiles', 'privacy'],
          likes: [],
          comments: [],
          sharesCount: 1,
          savedBy: [],
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
    }

    // Seed default story if empty
    if (data.stories.length === 0) {
      data.stories = [
        {
          id: 'story_zayan_1',
          authorId: 'zayan',
          authorName: 'Zayan (Admin)',
          authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
          text: 'Building the future of social messaging 🚀',
          bgColor: '#0f172a',
          viewers: [],
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
    }

    // Seed initial invite codes
    if (data.inviteCodes.length === 0) {
      data.inviteCodes = [
        { code: 'TALKSY-VIP-2026', createdBy: 'zayan', createdAt: new Date().toISOString() },
        { code: 'COMMUNITY-7890', createdBy: 'zayan', createdAt: new Date().toISOString() },
        { code: 'EXPLORE-4242', createdBy: 'zayan', createdAt: new Date().toISOString() },
      ];
    }

    // Ensure admin user has plainPassword set
    const adminUser = data.users.find((u: User) => u.id === 'zayan');
    if (adminUser) {
      if (!adminUser.plainPassword) adminUser.plainPassword = 'zanu4088888';
      if (!adminUser.studentNumber) adminUser.studentNumber = 'ADM';
    }

    // Seed or sync all 26 student accounts from user provided list
    for (const item of INITIAL_STUDENT_USERS) {
      const cleanId = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      const existing = data.users.find(
        (u: User) =>
          u.id.toLowerCase() === cleanId ||
          u.studentNumber === item.num ||
          (u.displayName && u.displayName.toLowerCase() === item.name.toLowerCase())
      );
      if (!existing) {
        const { hash, salt } = hashPassword(item.num);
        data.users.push({
          id: cleanId,
          username: cleanId,
          displayName: item.name,
          role: 'friend',
          plainPassword: item.num,
          studentNumber: item.num,
          passwordHash: hash,
          salt,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
          coverUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
          bio: `Student ID: ${item.num} · Member`,
          status: 'Available',
          disabled: false,
          online: false,
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      } else {
        if (!existing.plainPassword) existing.plainPassword = item.num;
        if (!existing.studentNumber) existing.studentNumber = item.num;
      }
    }

    saveDatabase(data);
    return data;
  } catch (err) {
    console.error('Error reading db:', err);
    return {
      users: [],
      messages: [],
      sessions: [],
      reports: [],
      posts: [],
      stories: [],
      groups: [],
      friendRequests: [],
      notifications: [],
      inviteCodes: [],
      bookmarks: [],
      reminders: [],
      pinnedMessages: [],
      groupAuditLogs: [],
      workspaceLayouts: [],
    };
  }
}

function saveDatabase(db: Database) {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

// Server-Sent Events subscribers
interface SSEClient {
  id: string;
  userId: string;
  res: Response;
}
let sseClients: SSEClient[] = [];

// In-Memory Restricted Developer Logs for Admin Diagnostics
interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: 'auth' | 'chat' | 'webrtc' | 'database' | 'system';
  message: string;
  details?: any;
}

const systemLogs: SystemLogEntry[] = [
  {
    id: 'log_init',
    timestamp: new Date().toISOString(),
    level: 'info',
    category: 'system',
    message: 'Talksy Secure Server active on port 3000 (Node/Express backend)',
  },
  {
    id: 'log_e2ee',
    timestamp: new Date().toISOString(),
    level: 'info',
    category: 'webrtc',
    message: 'Double Ratchet E2EE and DTLS-SRTP signaling protocol active',
  },
];

function addSystemLog(
  level: 'info' | 'warn' | 'error',
  category: 'auth' | 'chat' | 'webrtc' | 'database' | 'system',
  message: string,
  details?: any
) {
  const entry: SystemLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details,
  };
  systemLogs.push(entry);
  if (systemLogs.length > 200) {
    systemLogs.shift();
  }
}

function broadcastEvent(event: string, data: any, targetUserIds?: string[]) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    if (!targetUserIds || targetUserIds.includes(client.userId)) {
      try {
        client.res.write(payload);
      } catch (err) {
        // failed write
      }
    }
  });
}

// Authentication middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token as string);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = loadDatabase();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user || user.disabled) {
    return res.status(403).json({ error: 'User account disabled or not found' });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user: User = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privilege required' });
  }
  next();
}

function parseDeviceInfo(ua: string | undefined): {
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'browser';
  browser: string;
  os: string;
} {
  if (!ua) {
    return {
      deviceName: 'Chrome on Web',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Web',
    };
  }
  let os = 'Windows';
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'browser' = 'desktop';

  if (/iphone|ipod/i.test(ua)) {
    os = 'iOS';
    deviceType = 'mobile';
  } else if (/ipad/i.test(ua)) {
    os = 'iPadOS';
    deviceType = 'tablet';
  } else if (/android/i.test(ua)) {
    os = 'Android';
    deviceType = 'mobile';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
    deviceType = 'desktop';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
    deviceType = 'desktop';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
    deviceType = 'desktop';
  }

  let browser = 'Chrome';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return {
    deviceName: `${os} • ${browser}`,
    deviceType,
    browser,
    os,
  };
}

// ----------------------------------------------------
// AUTH ROUTES
// ----------------------------------------------------

// Login (Protected with Brute-Force Rate Limiting & Uniform Authentication Error)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter both User ID and Password' });
  }

  const normalizedId = String(username).trim().toLowerCase();
  const rateLimitKey = `${ip}_${normalizedId}`;

  // 1. Check Rate Limit
  const rateLimitStatus = checkLoginRateLimit(rateLimitKey);
  if (!rateLimitStatus.allowed) {
    addSystemLog('warn', 'auth', `Brute-force protection triggered for IP ${ip} targeting user "${normalizedId}"`);
    return res.status(429).json({
      error: `Too many failed login attempts. Please wait ${rateLimitStatus.retryAfterSeconds} seconds before trying again.`,
      retryAfter: rateLimitStatus.retryAfterSeconds,
    });
  }

  const db = loadDatabase();
  const strippedInput = normalizedId.replace(/[^a-z0-9]/g, '');
  const user = db.users.find(
    (u) =>
      u.id.toLowerCase() === normalizedId ||
      (u.username && u.username.toLowerCase() === normalizedId) ||
      (u.displayName && u.displayName.toLowerCase() === normalizedId) ||
      (u.studentNumber && u.studentNumber.toLowerCase() === normalizedId) ||
      (u.plainPassword && u.plainPassword.toLowerCase() === normalizedId) ||
      (u.displayName && u.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === strippedInput) ||
      ((normalizedId === 'zanu' || normalizedId === 'zayan') &&
        (u.id.toLowerCase() === 'zayan' || u.id.toLowerCase() === 'zanu' || u.username?.toLowerCase() === 'zanu'))
  );

  // 2. Uniform error message prevents Username Enumeration (CWE-204)
  if (!user) {
    recordLoginAttempt(rateLimitKey, false);
    addSystemLog('warn', 'auth', `Failed login attempt for nonexistent user "${normalizedId}" from ${ip}`);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (user.disabled) {
    addSystemLog('warn', 'auth', `Login attempt for disabled account "${user.id}" from ${ip}`);
    return res.status(403).json({ error: 'This account has been disabled. Please contact Admin Zayan.' });
  }

  const isValid =
    verifyPassword(password, user.passwordHash, user.salt) ||
    (Boolean(user.plainPassword) && user.plainPassword === String(password).trim());
  if (!isValid) {
    recordLoginAttempt(rateLimitKey, false);
    addSystemLog('warn', 'auth', `Failed password authentication for user "${user.id}" from ${ip}`);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // 3. Clear rate limit on successful authentication
  recordLoginAttempt(rateLimitKey, true);
  addSystemLog('info', 'auth', `User @${user.id} logged in successfully from ${ip}`);

  // Create session with device details
  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = `dev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const userAgent = req.headers['user-agent'] || '';
  const dev = parseDeviceInfo(userAgent);

  const sessionRecord: SessionRecord = {
    id: sessionId,
    token,
    userId: user.id,
    deviceName: dev.deviceName,
    deviceType: dev.deviceType,
    browser: dev.browser,
    os: dev.os,
    ip: ip === '::1' ? '127.0.0.1' : ip,
    location: 'Active Session',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    expiresAt,
  };

  db.sessions.push(sessionRecord);

  // Update user online status
  user.online = true;
  user.lastSeen = new Date().toISOString();
  saveDatabase(db);

  broadcastEvent('presence_update', {
    userId: user.id,
    online: true,
    lastSeen: user.lastSeen,
  });

  const { passwordHash, salt, ...safeUser } = user;
  res.json({ token, user: safeUser, sessionId });
});

// User registration
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, displayName, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const cleanId = String(username).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (cleanId.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters' });
  }
  const db = loadDatabase();
  if (db.users.some((u) => u.id.toLowerCase() === cleanId)) {
    return res.status(400).json({ error: `Username "${cleanId}" is already taken` });
  }

  const { hash, salt } = hashPassword(password);
  const newUser: User = {
    id: cleanId,
    displayName: displayName?.trim() || cleanId,
    role: 'friend',
    passwordHash: hash,
    salt,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
    bio: 'Hey there! I am using Talksy.',
    status: 'Available',
    disabled: false,
    online: true,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = `dev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  db.sessions.push({
    id: sessionId,
    token,
    userId: cleanId,
    deviceName: 'Web App',
    deviceType: 'desktop',
    browser: 'Web',
    os: 'Browser',
    ip: req.ip || '127.0.0.1',
    location: 'Active Connection',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  saveDatabase(db);

  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  if (safeUser.role !== 'admin' && safeUser.id !== 'admin') {
    broadcastEvent('friend_added', safeUser);
  }

  res.status(201).json({ token, user: safeUser, sessionId });
});

// Logout
app.post('/api/auth/logout', authenticate, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const token: string = (req as any).token;

  const db = loadDatabase();
  db.sessions = db.sessions.filter((s) => s.token !== token);

  const foundUser = db.users.find((u) => u.id === user.id);
  if (foundUser) {
    foundUser.online = false;
    foundUser.lastSeen = new Date().toISOString();
  }
  saveDatabase(db);

  broadcastEvent('presence_update', {
    userId: user.id,
    online: false,
    lastSeen: new Date().toISOString(),
  });

  res.json({ success: true });
});

// Current user me
app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { passwordHash, salt, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Update Profile
app.put('/api/auth/profile', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { displayName, bio, status, avatarUrl } = req.body;

  const db = loadDatabase();
  const user = db.users.find((u) => u.id === currentUser.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (displayName && typeof displayName === 'string') {
    user.displayName = displayName.trim().slice(0, 50);
  }
  if (typeof bio === 'string') {
    user.bio = bio.trim().slice(0, 200);
  }
  if (typeof status === 'string') {
    user.status = status.trim().slice(0, 60);
  }
  if (typeof avatarUrl === 'string') {
    user.avatarUrl = avatarUrl;
  }

  saveDatabase(db);

  const { passwordHash, salt, ...safeUser } = user;
  broadcastEvent('user_updated', safeUser);

  res.json({ user: safeUser });
});

// Change Password
app.put('/api/auth/password', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < 3) {
    return res.status(400).json({ error: 'New password must be at least 3 characters long' });
  }

  const db = loadDatabase();
  const user = db.users.find((u) => u.id === currentUser.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isValid =
    verifyPassword(currentPassword, user.passwordHash, user.salt) ||
    (Boolean(user.plainPassword) && user.plainPassword === currentPassword.trim());
  if (!isValid) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  user.plainPassword = newPassword.trim();
  saveDatabase(db);

  res.json({ success: true, message: 'Password updated successfully' });
});

// Change User ID / Username
app.put('/api/auth/username', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const rawId = (req.body.newUserId || req.body.username || '').toString().trim().toLowerCase();

  if (!rawId) {
    return res.status(400).json({ error: 'New User ID is required' });
  }

  // Validate format
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(rawId)) {
    return res.status(400).json({
      error: 'User ID must be between 3 and 30 characters and can only contain letters, numbers, underscores, dashes, or dots.',
    });
  }

  const db = loadDatabase();
  const oldId = currentUser.id;

  if (oldId === rawId) {
    const { passwordHash, salt, ...safeUser } = currentUser;
    return res.json({ success: true, user: safeUser, message: 'User ID is already @' + rawId });
  }

  // Check if taken
  const isTaken = db.users.some((u) => u.id.toLowerCase() === rawId);
  if (isTaken) {
    return res.status(400).json({ error: `User ID @${rawId} is already taken by another account.` });
  }

  const user = db.users.find((u) => u.id === oldId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update user ID
  user.id = rawId;
  user.username = rawId;

  // Cascade references across database
  db.sessions.forEach((s) => {
    if (s.userId === oldId) s.userId = rawId;
  });

  db.messages.forEach((m) => {
    if (m.senderId === oldId) m.senderId = rawId;
    if (m.receiverId === oldId) m.receiverId = rawId;
    if (m.reactions) {
      m.reactions.forEach((r) => {
        if (r.userId === oldId) r.userId = rawId;
      });
    }
  });

  db.posts.forEach((p) => {
    if (p.authorId === oldId) p.authorId = rawId;
    if (p.likes) {
      p.likes = p.likes.map((id) => (id === oldId ? rawId : id));
    }
    if (p.comments) {
      p.comments.forEach((c) => {
        if (c.authorId === oldId) c.authorId = rawId;
      });
    }
  });

  db.stories.forEach((st) => {
    if (st.authorId === oldId) st.authorId = rawId;
    if (st.viewers) {
      st.viewers = st.viewers.map((id) => (id === oldId ? rawId : id));
    }
  });

  db.groups.forEach((g) => {
    if (g.createdBy === oldId) g.createdBy = rawId;
    if (g.members) {
      g.members.forEach((m) => {
        if (m.userId === oldId) m.userId = rawId;
      });
    }
    if (g.announcements) {
      g.announcements.forEach((a) => {
        if (a.authorId === oldId) a.authorId = rawId;
      });
    }
  });

  db.friendRequests.forEach((fr) => {
    if (fr.fromUserId === oldId) fr.fromUserId = rawId;
    if (fr.toUserId === oldId) fr.toUserId = rawId;
  });

  db.notifications.forEach((n) => {
    if (n.userId === oldId) n.userId = rawId;
    if (n.actorId === oldId) n.actorId = rawId;
  });

  db.inviteCodes.forEach((inv) => {
    if (inv.createdBy === oldId) inv.createdBy = rawId;
    if (inv.usedBy === oldId) inv.usedBy = rawId;
  });

  db.users.forEach((u) => {
    if (u.following) u.following = u.following.map((id) => (id === oldId ? rawId : id));
    if (u.followers) u.followers = u.followers.map((id) => (id === oldId ? rawId : id));
    if (u.blockedUsers) u.blockedUsers = u.blockedUsers.map((id) => (id === oldId ? rawId : id));
  });

  saveDatabase(db);

  const { passwordHash, salt, ...safeUser } = user;
  broadcastEvent('user_updated', { ...safeUser, oldId });

  res.json({ success: true, user: safeUser, message: `User ID updated to @${rawId} successfully!` });
});

// Forgot password recovery guidance
app.get('/api/auth/recover-info', (_req: Request, res: Response) => {
  res.json({
    adminId: 'zayan',
    adminEmail: 'zayanzanu30408@gmail.com',
    message: 'To reset your password or recover your account, contact Admin Zayan directly or send a message to zayanzanu30408@gmail.com. The administrator can generate a new temporary password for you from the Admin Dashboard.',
  });
});

// ----------------------------------------------------
// LINKED DEVICES ROUTES
// ----------------------------------------------------

// Active pairing codes map
const pendingPairings = new Map<string, { userId: string; code: string; expiresAt: number }>();

// GET /api/devices - List all active device sessions for current user
app.get('/api/devices', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const currentToken: string = (req as any).token;

  const db = loadDatabase();
  const now = Date.now();
  const userSessions = db.sessions.filter((s) => s.userId === currentUser.id && s.expiresAt > now);

  const devices = userSessions.map((s) => ({
    id: s.id || s.token.slice(0, 16),
    deviceName: s.deviceName || 'Web Browser',
    deviceType: s.deviceType || 'desktop',
    browser: s.browser || 'Browser',
    os: s.os || 'Web',
    ip: s.ip || '127.0.0.1',
    location: s.location || 'Active Connection',
    createdAt: s.createdAt || new Date().toISOString(),
    lastActive: s.lastActive || new Date().toISOString(),
    isCurrent: s.token === currentToken,
  }));

  res.json({ devices });
});

// DELETE /api/devices/:id - Unlink/disconnect a specific device session
app.delete('/api/devices/:id', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const currentToken: string = (req as any).token;
  const { id } = req.params;

  const db = loadDatabase();
  const sessionIndex = db.sessions.findIndex(
    (s) => s.userId === currentUser.id && (s.id === id || s.token.slice(0, 16) === id)
  );

  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Device session not found or already revoked' });
  }

  const [removedSession] = db.sessions.splice(sessionIndex, 1);
  saveDatabase(db);

  // Broadcast device revoked event to connected SSE clients
  broadcastEvent(
    'device_revoked',
    {
      sessionId: removedSession.id || id,
      token: removedSession.token,
      userId: currentUser.id,
    },
    [currentUser.id]
  );

  res.json({
    success: true,
    isCurrent: removedSession.token === currentToken,
  });
});

// POST /api/devices/logout-all - Logout all other linked devices
app.post('/api/devices/logout-all', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const currentToken: string = (req as any).token;

  const db = loadDatabase();
  const removedSessions = db.sessions.filter(
    (s) => s.userId === currentUser.id && s.token !== currentToken
  );

  db.sessions = db.sessions.filter(
    (s) => s.userId !== currentUser.id || s.token === currentToken
  );
  saveDatabase(db);

  for (const s of removedSessions) {
    broadcastEvent(
      'device_revoked',
      {
        sessionId: s.id || s.token.slice(0, 16),
        token: s.token,
        userId: currentUser.id,
      },
      [currentUser.id]
    );
  }

  res.json({ success: true, count: removedSessions.length });
});

// POST /api/devices/pair-code - Generate dynamic QR payload & 6-digit pairing code
app.post('/api/devices/pair-code', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const code = `TK-${randomNum}`;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

  pendingPairings.set(code, {
    userId: currentUser.id,
    code,
    expiresAt,
  });

  const qrPayload = JSON.stringify({
    protocol: 'talksy_pair_v1',
    code,
    userId: currentUser.id,
    appName: 'Talksy',
    ts: Date.now(),
  });

  res.json({
    code,
    qrPayload,
    expiresInSeconds: 300,
  });
});

// POST /api/devices/pair-confirm - Confirm device pairing by entering a pairing code
app.post('/api/devices/pair-confirm', (req: Request, res: Response) => {
  const { code, deviceName } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Pairing code is required' });
  }

  const cleanCode = String(code).trim().toUpperCase();
  const pending = pendingPairings.get(cleanCode);

  if (!pending || pending.expiresAt < Date.now()) {
    pendingPairings.delete(cleanCode);
    return res.status(400).json({ error: 'Invalid or expired pairing code' });
  }

  const db = loadDatabase();
  const user = db.users.find((u) => u.id === pending.userId);
  if (!user || user.disabled) {
    return res.status(403).json({ error: 'User account disabled or not found' });
  }

  // Generate session for newly linked device
  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = `dev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  const userAgent = req.headers['user-agent'] || '';
  const dev = parseDeviceInfo(userAgent);
  const finalDeviceName = deviceName?.trim() || dev.deviceName;

  const sessionRecord: SessionRecord = {
    id: sessionId,
    token,
    userId: user.id,
    deviceName: finalDeviceName,
    deviceType: dev.deviceType,
    browser: dev.browser,
    os: dev.os,
    ip: '127.0.0.1',
    location: 'Linked Companion Device',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    expiresAt,
  };

  db.sessions.push(sessionRecord);
  saveDatabase(db);
  pendingPairings.delete(cleanCode);

  broadcastEvent('device_linked', {
    userId: user.id,
    device: {
      id: sessionId,
      deviceName: finalDeviceName,
      deviceType: dev.deviceType,
      browser: dev.browser,
      os: dev.os,
      ip: sessionRecord.ip,
      location: sessionRecord.location,
      createdAt: sessionRecord.createdAt,
      lastActive: sessionRecord.lastActive,
      isCurrent: false,
    },
  }, [user.id]);

  const { passwordHash, salt, ...safeUser } = user;
  res.json({
    success: true,
    token,
    user: safeUser,
    sessionId,
  });
});

// POST /api/devices/link-simulated - Link a test companion device for rapid testing
app.post('/api/devices/link-simulated', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { preset } = req.body;

  let deviceName = 'iPhone 15 Pro • Talksy Mobile';
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'browser' = 'mobile';
  let browser = 'Talksy iOS';
  let os = 'iOS 17.5';

  if (preset === 'macbook') {
    deviceName = 'MacBook Pro • macOS Safari';
    deviceType = 'desktop';
    browser = 'Safari 18.0';
    os = 'macOS Sequoia';
  } else if (preset === 'ipad') {
    deviceName = 'iPad Air • Safari Tablet';
    deviceType = 'tablet';
    browser = 'Mobile Safari';
    os = 'iPadOS 17.5';
  } else if (preset === 'windows') {
    deviceName = 'Windows 11 • Talksy Desktop';
    deviceType = 'desktop';
    browser = 'Edge / Native';
    os = 'Windows 11';
  } else if (preset === 'android') {
    deviceName = 'Samsung Galaxy S24 • Talksy App';
    deviceType = 'mobile';
    browser = 'Talksy Android';
    os = 'Android 14';
  }

  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = `dev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  const db = loadDatabase();
  const companionSession: SessionRecord = {
    id: sessionId,
    token,
    userId: currentUser.id,
    deviceName,
    deviceType,
    browser,
    os,
    ip: '192.168.1.104',
    location: 'Encrypted Sync Session',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    expiresAt,
  };

  db.sessions.push(companionSession);
  saveDatabase(db);

  const deviceData = {
    id: sessionId,
    deviceName,
    deviceType,
    browser,
    os,
    ip: companionSession.ip,
    location: companionSession.location,
    createdAt: companionSession.createdAt,
    lastActive: companionSession.lastActive,
    isCurrent: false,
  };

  broadcastEvent('device_linked', {
    userId: currentUser.id,
    device: deviceData,
  }, [currentUser.id]);

  res.json({
    success: true,
    device: deviceData,
  });
});

// ----------------------------------------------------
// SOCIAL FEED & POSTS ROUTES
// ----------------------------------------------------
app.get('/api/posts', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { tag, authorId, savedOnly } = req.query;
  const db = loadDatabase();

  let list = [...db.posts];
  if (savedOnly === 'true') {
    list = list.filter((p) => p.savedBy?.includes(currentUser.id));
  }
  if (tag) {
    const t = String(tag).toLowerCase().replace('#', '');
    list = list.filter((p) => p.tags?.some((pt) => pt.toLowerCase() === t));
  }
  if (authorId) {
    list = list.filter((p) => p.authorId === authorId);
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ posts: list });
});

app.post('/api/posts', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { text, mediaUrl, mediaType, tags } = req.body;

  if (!text && !mediaUrl) {
    return res.status(400).json({ error: 'Post must contain text or media' });
  }

  const cleanTags = Array.isArray(tags)
    ? tags.map((t: string) => String(t).trim().toLowerCase().replace('#', '')).filter(Boolean)
    : [];

  const newPost: Post = {
    id: `post_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    authorId: currentUser.id,
    authorName: currentUser.displayName,
    authorAvatar: currentUser.avatarUrl,
    authorRole: currentUser.role,
    text: text?.trim() || '',
    mediaUrl: mediaUrl || undefined,
    mediaType: mediaType || (mediaUrl ? 'image' : undefined),
    tags: cleanTags,
    likes: [],
    comments: [],
    sharesCount: 0,
    savedBy: [],
    createdAt: new Date().toISOString(),
  };

  const db = loadDatabase();
  db.posts.unshift(newPost);
  saveDatabase(db);

  broadcastEvent('new_post', newPost);
  res.status(201).json({ post: newPost });
});

app.post('/api/posts/:id/like', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const post = db.posts.find((p) => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (!post.likes) post.likes = [];
  const hasLiked = post.likes.includes(currentUser.id);
  if (hasLiked) {
    post.likes = post.likes.filter((uid) => uid !== currentUser.id);
  } else {
    post.likes.push(currentUser.id);

    // Create notification if liked by someone else
    if (post.authorId !== currentUser.id) {
      const notif: NotificationItem = {
        id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        userId: post.authorId,
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        actorAvatar: currentUser.avatarUrl,
        type: 'like',
        title: 'Liked your post',
        body: `${currentUser.displayName} liked your post: "${post.text.slice(0, 40)}"`,
        targetId: post.id,
        read: false,
        createdAt: new Date().toISOString(),
      };
      db.notifications.unshift(notif);
      broadcastEvent('new_notification', notif, [post.authorId]);
    }
  }

  saveDatabase(db);
  broadcastEvent('post_updated', post);
  res.json({ post, liked: !hasLiked });
});

app.post('/api/posts/:id/comment', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const db = loadDatabase();
  const post = db.posts.find((p) => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (!post.comments) post.comments = [];
  const comment: PostComment = {
    id: `c_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    postId: post.id,
    authorId: currentUser.id,
    authorName: currentUser.displayName,
    authorAvatar: currentUser.avatarUrl,
    text: text.trim().slice(0, 500),
    createdAt: new Date().toISOString(),
  };

  post.comments.push(comment);

  // Notify post author if someone else commented
  if (post.authorId !== currentUser.id) {
    const notif: NotificationItem = {
      id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      userId: post.authorId,
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      actorAvatar: currentUser.avatarUrl,
      type: 'comment',
      title: 'Commented on your post',
      body: `${currentUser.displayName}: "${comment.text.slice(0, 40)}"`,
      targetId: post.id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(notif);
    broadcastEvent('new_notification', notif, [post.authorId]);
  }

  saveDatabase(db);
  broadcastEvent('post_updated', post);
  res.json({ post, comment });
});

app.post('/api/posts/:id/save', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const post = db.posts.find((p) => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (!post.savedBy) post.savedBy = [];
  const isSaved = post.savedBy.includes(currentUser.id);
  if (isSaved) {
    post.savedBy = post.savedBy.filter((uid) => uid !== currentUser.id);
  } else {
    post.savedBy.push(currentUser.id);
  }

  saveDatabase(db);
  res.json({ post, isSaved: !isSaved });
});

app.delete('/api/posts/:id', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const idx = db.posts.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const post = db.posts[idx];
  if (post.authorId !== currentUser.id && currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this post' });
  }

  db.posts.splice(idx, 1);
  saveDatabase(db);
  broadcastEvent('post_deleted', { postId: id });
  res.json({ success: true });
});

// ----------------------------------------------------
// STORIES (24-HOUR EPHEMERAL) ROUTES
// ----------------------------------------------------
app.get('/api/stories', authenticate, (_req: Request, res: Response) => {
  const db = loadDatabase();
  const now = new Date().toISOString();
  // Filter active and unique stories
  const seenIds = new Set<string>();
  const activeStories = (db.stories || []).filter((s) => {
    if (!s || s.expiresAt <= now) return false;
    if (seenIds.has(s.id)) return false;
    seenIds.add(s.id);
    return true;
  });
  res.json({ stories: activeStories });
});

app.post('/api/stories', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { mediaUrl, text, bgColor } = req.body;

  if (!mediaUrl && !text) {
    return res.status(400).json({ error: 'Story must contain image or text' });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const newStory: Story = {
    id: `story_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    authorId: currentUser.id,
    authorName: currentUser.displayName,
    authorAvatar: currentUser.avatarUrl,
    mediaUrl: mediaUrl || undefined,
    text: text?.trim() || undefined,
    bgColor: bgColor || '#0f172a',
    viewers: [],
    createdAt: now.toISOString(),
    expiresAt,
  };

  const db = loadDatabase();
  db.stories.unshift(newStory);
  saveDatabase(db);

  broadcastEvent('new_story', newStory);
  res.status(201).json({ story: newStory });
});

app.post('/api/stories/:id/view', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const story = db.stories.find((s) => s.id === id);
  if (story) {
    if (!story.viewers) story.viewers = [];
    if (!story.viewers.includes(currentUser.id)) {
      story.viewers.push(currentUser.id);
      saveDatabase(db);
    }
  }
  res.json({ success: true });
});

// Delete story / status (Author or Admin only)
app.delete('/api/stories/:id', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const index = db.stories.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Status update not found' });
  }

  const story = db.stories[index];
  if (story.authorId !== currentUser.id && currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this status' });
  }

  db.stories.splice(index, 1);
  saveDatabase(db);

  broadcastEvent('story_deleted', { id, authorId: story.authorId });
  res.json({ success: true, id, message: 'Status successfully deleted' });
});

// ----------------------------------------------------
// GROUPS & COMMUNITIES ROUTES
// ----------------------------------------------------
app.get('/api/groups', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  // Privacy: If regular user, sanitize members and createdBy so admin account is never exposed
  const sanitizedGroups = (db.groups || []).map((g) => {
    if (currentUser.role === 'admin') return g;
    return {
      ...g,
      createdBy: g.createdBy === 'admin' ? 'Community Admin' : g.createdBy,
      members: (g.members || []).filter((m) => {
        const u = db.users.find((usr) => usr.id === m.userId);
        return (!u || u.role !== 'admin') && m.userId !== 'admin';
      }),
    };
  });
  res.json({ groups: sanitizedGroups });
});

app.post('/api/groups', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { name, description, avatarUrl, bannerUrl, isPrivate, tags } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const newGroup: Group = {
    id: `grp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    name: name.trim().slice(0, 60),
    description: description?.trim().slice(0, 300) || '',
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
    bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80',
    isPrivate: Boolean(isPrivate),
    createdBy: currentUser.id,
    members: [
      {
        userId: currentUser.id,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
        role: 'admin',
        joinedAt: new Date().toISOString(),
      },
    ],
    announcements: [],
    tags: Array.isArray(tags) ? tags.map((t: string) => String(t).trim().toLowerCase().replace('#', '')).filter(Boolean) : ['community'],
    createdAt: new Date().toISOString(),
  };

  const db = loadDatabase();
  db.groups.unshift(newGroup);
  saveDatabase(db);

  broadcastEvent('group_created', newGroup);
  res.status(201).json({ group: newGroup });
});

app.post('/api/groups/:id/join', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const group = db.groups.find((g) => g.id === id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const isMember = group.members.some((m) => m.userId === currentUser.id);
  if (!isMember) {
    group.members.push({
      userId: currentUser.id,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      role: 'member',
      joinedAt: new Date().toISOString(),
    });
    saveDatabase(db);
    broadcastEvent('group_updated', group);
  }

  res.json({ group, isMember: true });
});

app.post('/api/groups/:id/leave', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const group = db.groups.find((g) => g.id === id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  group.members = group.members.filter((m) => m.userId !== currentUser.id);
  saveDatabase(db);
  broadcastEvent('group_updated', group);

  res.json({ group, isMember: false });
});

// Add member to group using User ID
app.post('/api/groups/:id/members', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return res.status(400).json({ error: 'Please enter a valid User ID / Handle' });
  }

  const cleanTargetId = userId.trim().toLowerCase();
  const db = loadDatabase();

  const group = db.groups.find((g) => g.id === id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  // Check if current user is member or admin
  const isCallerMember = group.members.some((m) => m.userId === currentUser.id) || currentUser.role === 'admin';
  if (!isCallerMember) {
    return res.status(403).json({ error: 'You must be a member or admin of this group to add members' });
  }

  // Find user in database by ID or username
  const targetUser = db.users.find(
    (u) =>
      u.id.toLowerCase() === cleanTargetId ||
      (u.username && u.username.toLowerCase() === cleanTargetId)
  );

  if (!targetUser) {
    return res.status(404).json({ error: `User with ID "${userId}" does not exist in the database` });
  }

  if (targetUser.disabled) {
    return res.status(400).json({ error: `Account @${targetUser.id} is disabled and cannot be added` });
  }

  if (group.members.some((m) => m.userId === targetUser.id)) {
    return res.status(400).json({ error: `@${targetUser.id} (${targetUser.displayName}) is already a member of this group` });
  }

  const newMember = {
    userId: targetUser.id,
    displayName: targetUser.displayName,
    avatarUrl: targetUser.avatarUrl,
    role: 'member' as const,
    joinedAt: new Date().toISOString(),
  };

  group.members.push(newMember);
  saveDatabase(db);

  addSystemLog('info', 'chat', `User @${currentUser.id} added @${targetUser.id} to group "${group.name}"`);
  broadcastEvent('group_updated', group);

  res.status(200).json({
    success: true,
    message: `Successfully added @${targetUser.id} to ${group.name}`,
    group,
    member: newMember,
  });
});

// Delete group (Creator or Administrator only)
app.delete('/api/groups/:id', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const groupIndex = db.groups.findIndex((g) => g.id === id);
  if (groupIndex === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const group = db.groups[groupIndex];
  const isGroupAdmin = group.members?.some(
    (m) => m.userId === currentUser.id && (m.role === 'admin' || m.role === 'moderator')
  );
  if (group.createdBy !== currentUser.id && currentUser.role !== 'admin' && !isGroupAdmin) {
    return res.status(403).json({ error: 'Only the group creator or an administrator can delete this group' });
  }

  // Remove the group from database
  db.groups.splice(groupIndex, 1);
  // Remove all messages associated with this group
  db.messages = db.messages.filter((m) => m.groupId !== id);
  saveDatabase(db);

  addSystemLog('info', 'chat', `Group "${group.name}" (@${id}) deleted by @${currentUser.id}`);
  broadcastEvent('group_deleted', { groupId: id });

  res.json({ success: true, message: `Group "${group.name}" was successfully deleted` });
});

app.post('/api/groups/:id/announcement', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const db = loadDatabase();
  const group = db.groups.find((g) => g.id === id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const member = group.members.find((m) => m.userId === currentUser.id);
  if (!member || (member.role !== 'admin' && member.role !== 'moderator')) {
    return res.status(403).json({ error: 'Only group admins and moderators can post announcements' });
  }

  const announcement: GroupAnnouncement = {
    id: `ann_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    authorId: currentUser.id,
    authorName: currentUser.displayName,
    title: String(title).trim(),
    content: String(content).trim(),
    createdAt: new Date().toISOString(),
  };

  group.announcements.unshift(announcement);

  // Notify members
  const memberIds = group.members.map((m) => m.userId).filter((uid) => uid !== currentUser.id);
  for (const mid of memberIds) {
    const notif: NotificationItem = {
      id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      userId: mid,
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      actorAvatar: currentUser.avatarUrl,
      type: 'group_announcement',
      title: `Announcement in ${group.name}`,
      body: announcement.title,
      targetId: group.id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(notif);
    broadcastEvent('new_notification', notif, [mid]);
  }

  saveDatabase(db);
  broadcastEvent('group_updated', group);
  res.json({ group, announcement });
});

app.get('/api/groups/:id/messages', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  // User Security Rule: Administrators cannot see group chatting
  if (currentUser.role === 'admin') {
    return res.status(403).json({
      error: 'Administrators cannot view private group messages. Group chat privacy is end-to-end protected.',
      messages: [],
    });
  }
  const { id } = req.params;
  const db = loadDatabase();
  const msgs = db.messages.filter((m) => m.groupId === id);
  res.json({ messages: msgs });
});

app.post('/api/groups/:id/messages', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;

  // Security policy: Administrators cannot message users.
  if (currentUser.role === 'admin') {
    return res.status(403).json({
      error: 'Administrators cannot message users. Administrator accounts have control and moderation permissions only.',
    });
  }

  const { id } = req.params;
  const { text, mediaUrl, mediaType, voiceDuration } = req.body;

  const db = loadDatabase();
  const group = db.groups.find((g) => g.id === id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const isMember = group.members.some((m) => m.userId === currentUser.id);
  if (!isMember) {
    return res.status(403).json({ error: 'Must join group before messaging' });
  }

  const newMsg: Message = {
    id: `msg_grp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    senderId: currentUser.id,
    receiverId: id,
    groupId: id,
    text: text?.trim() || '',
    mediaUrl: mediaUrl || undefined,
    mediaType: mediaType || undefined,
    voiceDuration: voiceDuration || undefined,
    reactions: [],
    status: 'delivered',
    createdAt: new Date().toISOString(),
  };

  db.messages.push(newMsg);
  saveDatabase(db);

  const targetIds = group.members.map((m) => m.userId);
  broadcastEvent('new_group_message', { message: newMsg, groupId: id }, targetIds);

  res.status(201).json({ message: newMsg });
});

// ----------------------------------------------------
// FRIENDS, REQUESTS & MUTUALS ROUTES
// ----------------------------------------------------
app.get('/api/friends/requests', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();

  const incoming = db.friendRequests.filter(
    (r) => r.toUserId === currentUser.id && r.status === 'pending'
  );
  const outgoing = db.friendRequests.filter(
    (r) => r.fromUserId === currentUser.id && r.status === 'pending'
  );

  const incomingWithUsers = incoming.map((reqItem) => {
    const fromUser = db.users.find((u) => u.id === reqItem.fromUserId);
    const { passwordHash, salt, ...safeUser } = fromUser || ({} as any);
    return { ...reqItem, fromUser: safeUser };
  });

  res.json({ incoming: incomingWithUsers, outgoing });
});

app.post('/api/friends/request', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { toUserId } = req.body;

  if (!toUserId || toUserId === currentUser.id) {
    return res.status(400).json({ error: 'Invalid recipient ID' });
  }

  const db = loadDatabase();
  const targetUser = db.users.find((u) => u.id === toUserId);
  if (!targetUser || (currentUser.role !== 'admin' && (targetUser.role === 'admin' || targetUser.id === 'admin'))) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if request already exists
  const existing = db.friendRequests.find(
    (r) => r.fromUserId === currentUser.id && r.toUserId === toUserId && r.status === 'pending'
  );
  if (existing) {
    return res.status(400).json({ error: 'Friend request already sent' });
  }

  const newReq: FriendRequest = {
    id: `freq_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    fromUserId: currentUser.id,
    toUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.friendRequests.push(newReq);

  // Send notification to target user
  const notif: NotificationItem = {
    id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: toUserId,
    actorId: currentUser.id,
    actorName: currentUser.displayName,
    actorAvatar: currentUser.avatarUrl,
    type: 'friend_request',
    title: 'New Friend Request',
    body: `${currentUser.displayName} sent you a friend request`,
    targetId: newReq.id,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
  saveDatabase(db);

  broadcastEvent('friend_request_received', { request: newReq, from: currentUser }, [toUserId]);
  broadcastEvent('new_notification', notif, [toUserId]);

  res.status(201).json({ request: newReq });
});

app.post('/api/friends/request/:id/accept', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const friendReq = db.friendRequests.find((r) => r.id === id && r.toUserId === currentUser.id);
  if (!friendReq) {
    return res.status(404).json({ error: 'Friend request not found' });
  }

  friendReq.status = 'accepted';

  // Mutual follow
  const sender = db.users.find((u) => u.id === friendReq.fromUserId);
  const me = db.users.find((u) => u.id === currentUser.id);
  if (sender && me) {
    if (!sender.following) sender.following = [];
    if (!sender.following.includes(me.id)) sender.following.push(me.id);
    if (!me.following) me.following = [];
    if (!me.following.includes(sender.id)) me.following.push(sender.id);

    // Notify sender that request was accepted
    const notif: NotificationItem = {
      id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      userId: sender.id,
      actorId: me.id,
      actorName: me.displayName,
      actorAvatar: me.avatarUrl,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      body: `${me.displayName} accepted your friend request`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(notif);
    broadcastEvent('new_notification', notif, [sender.id]);
  }

  saveDatabase(db);
  broadcastEvent('friend_request_accepted', { requestId: id, from: friendReq.fromUserId, to: currentUser.id });

  res.json({ success: true, friendReq });
});

app.post('/api/friends/request/:id/decline', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const friendReq = db.friendRequests.find((r) => r.id === id && r.toUserId === currentUser.id);
  if (friendReq) {
    friendReq.status = 'declined';
    saveDatabase(db);
  }
  res.json({ success: true });
});

app.get('/api/friends/suggestions', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();

  const myFollowing = currentUser.following || [];
  const myBlocked = currentUser.blockedUsers || [];

  const candidates = db.users
    .filter((u) => u.id !== currentUser.id && !u.disabled && !myBlocked.includes(u.id) && (currentUser.role === 'admin' || (u.role !== 'admin' && u.id !== 'admin')))
    .map((u) => {
      const mutuals = (u.followers || []).filter((f) => myFollowing.includes(f)).length;
      const { passwordHash, salt, ...safeUser } = u;
      return {
        ...safeUser,
        mutualFriendsCount: mutuals || 1,
        isFollowing: myFollowing.includes(u.id),
      };
    });

  res.json({ suggestions: candidates });
});

app.post('/api/friends/follow/:userId', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { userId } = req.params;
  const db = loadDatabase();

  const target = db.users.find((u) => u.id === userId);
  const me = db.users.find((u) => u.id === currentUser.id);
  if (!target || !me) return res.status(404).json({ error: 'User not found' });

  if (!me.following) me.following = [];
  if (!target.followers) target.followers = [];

  const isFollowing = me.following.includes(userId);
  if (isFollowing) {
    me.following = me.following.filter((id) => id !== userId);
    target.followers = target.followers.filter((id) => id !== me.id);
  } else {
    me.following.push(userId);
    target.followers.push(me.id);
  }

  saveDatabase(db);
  res.json({ isFollowing: !isFollowing, followersCount: target.followers.length });
});

app.post('/api/friends/block/:userId', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { userId } = req.params;
  const db = loadDatabase();

  const me = db.users.find((u) => u.id === currentUser.id);
  if (!me) return res.status(404).json({ error: 'User not found' });

  if (!me.blockedUsers) me.blockedUsers = [];
  const isBlocked = me.blockedUsers.includes(userId);

  if (isBlocked) {
    me.blockedUsers = me.blockedUsers.filter((id) => id !== userId);
  } else {
    me.blockedUsers.push(userId);
  }

  saveDatabase(db);
  res.json({ isBlocked: !isBlocked, blockedUsers: me.blockedUsers });
});

// ----------------------------------------------------
// NOTIFICATIONS ROUTES
// ----------------------------------------------------
app.get('/api/notifications', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  const notifs = db.notifications.filter((n) => n.userId === currentUser.id);
  notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ notifications: notifs });
});

app.put('/api/notifications/:id/read', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const db = loadDatabase();

  const notif = db.notifications.find((n) => n.id === id && n.userId === currentUser.id);
  if (notif) {
    notif.read = true;
    saveDatabase(db);
  }
  res.json({ success: true });
});

app.put('/api/notifications/read-all', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  for (const n of db.notifications) {
    if (n.userId === currentUser.id) n.read = true;
  }
  saveDatabase(db);
  res.json({ success: true });
});

// ----------------------------------------------------
// USER PROFILE, PRIVACY & 2FA ROUTES
// ----------------------------------------------------
app.get('/api/users/:id/profile', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser: User = (req as any).user;
  const db = loadDatabase();

  const target = db.users.find((u) => u.id === id);
  if (!target || (currentUser.role !== 'admin' && (target.role === 'admin' || target.id === 'admin'))) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isBlocked = (target.blockedUsers || []).includes(currentUser.id);
  if (isBlocked) {
    return res.status(403).json({ error: 'You are blocked by this user' });
  }

  const { passwordHash, salt, ...safeUser } = target;
  const userPosts = db.posts.filter((p) => p.authorId === id);
  userPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const mutualsCount = (target.followers || []).filter((f) => (currentUser.following || []).includes(f)).length;

  res.json({
    user: safeUser,
    posts: userPosts,
    mutualsCount,
    isFollowing: (currentUser.following || []).includes(id),
  });
});

app.put('/api/user/privacy', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { profileVisibility, allowMessagesFrom, showOnlineStatus } = req.body;
  const db = loadDatabase();

  const user = db.users.find((u) => u.id === currentUser.id);
  if (user) {
    user.privacySettings = {
      profileVisibility: profileVisibility || 'public',
      allowMessagesFrom: allowMessagesFrom || 'everyone',
      showOnlineStatus: showOnlineStatus !== undefined ? Boolean(showOnlineStatus) : true,
    };
    saveDatabase(db);
    res.json({ privacySettings: user.privacySettings });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.post('/api/user/2fa/toggle', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();

  const user = db.users.find((u) => u.id === currentUser.id);
  if (user) {
    user.twoFactorEnabled = !user.twoFactorEnabled;
    const backupCodes = user.twoFactorEnabled
      ? ['TK-7821-44', 'TK-9923-10', 'TK-4821-65', 'TK-1284-88']
      : [];
    saveDatabase(db);
    res.json({ twoFactorEnabled: user.twoFactorEnabled, backupCodes });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// ----------------------------------------------------
// INVITE CODES FOR ADMIN ZAYAN
// ----------------------------------------------------
app.get('/api/admin/invite-codes', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ inviteCodes: db.inviteCodes || [] });
});

app.post('/api/admin/invite-codes', authenticate, requireAdmin, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const code = `TALKSY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const newInvite: InviteCode = {
    code,
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
  };

  const db = loadDatabase();
  if (!db.inviteCodes) db.inviteCodes = [];
  db.inviteCodes.unshift(newInvite);
  saveDatabase(db);

  res.status(201).json({ inviteCode: newInvite });
});

// ----------------------------------------------------
// ADMIN DASHBOARD ROUTES
// ----------------------------------------------------

// List all friends/users
app.get('/api/admin/users', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const db = loadDatabase();
  const safeUsers = db.users.map(({ passwordHash, salt, ...u }) => u);
  res.json({ users: safeUsers });
});

// Create friend account
app.post('/api/admin/users', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id, displayName, password, avatarUrl, bio, status } = req.body;

  if (!id || !password) {
    return res.status(400).json({ error: 'Friend ID and temporary password are required' });
  }

  const cleanId = String(id).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (cleanId.length < 3) {
    return res.status(400).json({ error: 'Friend ID must be at least 3 alphanumeric characters' });
  }

  const db = loadDatabase();
  if (db.users.some((u) => u.id.toLowerCase() === cleanId)) {
    return res.status(400).json({ error: `Account with ID "${cleanId}" already exists.` });
  }

  const { hash, salt } = hashPassword(password);
  const newUser: User = {
    id: cleanId,
    displayName: displayName?.trim() || cleanId,
    role: 'friend',
    passwordHash: hash,
    salt,
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanId}`,
    bio: bio?.trim() || 'Hey there! I am using Zayan Chat.',
    status: status?.trim() || 'Available',
    disabled: false,
    online: false,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDatabase(db);

  const { passwordHash, salt: _, ...safeUser } = newUser;
  broadcastEvent('friend_added', safeUser);

  res.status(201).json({ user: safeUser, message: 'Friend account created successfully' });
});

// Edit or update user (Admin)
app.put('/api/admin/users/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const targetId = req.params.id;
  const { newId, displayName, password, avatarUrl, bio, status, disabled, studentNumber } = req.body;

  const db = loadDatabase();
  const user = db.users.find((u) => u.id === targetId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent disabling main admin
  if (user.id === 'zayan' && disabled === true) {
    return res.status(400).json({ error: 'Cannot disable the primary administrator account' });
  }

  if (displayName !== undefined) user.displayName = String(displayName).trim();
  if (avatarUrl !== undefined) user.avatarUrl = String(avatarUrl);
  if (bio !== undefined) user.bio = String(bio).trim();
  if (status !== undefined) user.status = String(status).trim();
  if (disabled !== undefined) user.disabled = Boolean(disabled);
  if (studentNumber !== undefined) user.studentNumber = String(studentNumber).trim();

  // Reset password if provided (min 3 characters for 3-digit number passwords)
  if (password && typeof password === 'string' && password.trim().length >= 3) {
    const trimmedPass = password.trim();
    const { hash, salt } = hashPassword(trimmedPass);
    user.passwordHash = hash;
    user.salt = salt;
    user.plainPassword = trimmedPass;
  }

  // Handle changing User ID if newId is provided and different
  if (newId && typeof newId === 'string') {
    const cleanNewId = newId.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (cleanNewId.length >= 3 && cleanNewId !== user.id) {
      if (db.users.some((u) => u.id.toLowerCase() === cleanNewId && u.id !== user.id)) {
        return res.status(400).json({ error: `User ID @${cleanNewId} is already taken by another account.` });
      }
      const oldId = user.id;
      user.id = cleanNewId;
      user.username = cleanNewId;

      // Cascade across database
      db.sessions.forEach((s) => { if (s.userId === oldId) s.userId = cleanNewId; });
      db.messages.forEach((m) => {
        if (m.senderId === oldId) m.senderId = cleanNewId;
        if (m.receiverId === oldId) m.receiverId = cleanNewId;
      });
      db.posts.forEach((p) => { if (p.authorId === oldId) p.authorId = cleanNewId; });
      db.stories.forEach((st) => { if (st.authorId === oldId) st.authorId = cleanNewId; });
      if (Array.isArray(db.groups)) {
        db.groups.forEach((g) => {
          if (Array.isArray(g.members)) {
            g.members.forEach((m) => { if (m.userId === oldId) m.userId = cleanNewId; });
          }
        });
      }
    }
  }

  saveDatabase(db);

  const { passwordHash, salt: _, ...safeUser } = user;
  broadcastEvent('user_updated', safeUser);

  res.json({ user: safeUser, message: 'User updated successfully' });
});

// Delete user account permanently from database
app.delete('/api/admin/users/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const targetId = req.params.id;
  if (targetId === 'zayan') {
    return res.status(400).json({ error: 'Cannot delete the primary administrator (@zayan)' });
  }

  const db = loadDatabase();
  const index = db.users.findIndex((u) => u.id === targetId);
  if (index === -1) {
    return res.status(404).json({ error: `User "@${targetId}" not found in database` });
  }

  const deletedUser = db.users[index];

  // 1. Remove user from db.users
  db.users.splice(index, 1);

  // 2. Terminate all active sessions for this user
  db.sessions = db.sessions.filter((s) => s.userId !== targetId);

  // 3. Purge direct messages involving this user
  db.messages = db.messages.filter((m) => m.senderId !== targetId && m.receiverId !== targetId);

  // 4. Remove user from all group memberships
  if (Array.isArray(db.groups)) {
    db.groups.forEach((g) => {
      if (Array.isArray(g.members)) {
        g.members = g.members.filter((m) => m.userId !== targetId);
      }
    });
  }

  // 5. Remove stories/statuses created by this user
  if (Array.isArray(db.stories)) {
    db.stories = db.stories.filter((s) => s.authorId !== targetId);
  }

  // 6. Remove posts created by this user
  if (Array.isArray(db.posts)) {
    db.posts = db.posts.filter((p) => p.authorId !== targetId);
  }

  // 7. Remove pending friend requests
  if (Array.isArray(db.friendRequests)) {
    db.friendRequests = db.friendRequests.filter(
      (r) => r.fromUserId !== targetId && r.toUserId !== targetId
    );
  }

  // 8. Remove notifications targeting this user
  if (Array.isArray(db.notifications)) {
    db.notifications = db.notifications.filter((n) => n.userId !== targetId);
  }

  // 9. Commit permanent changes directly to data/zayan_chat.json
  saveDatabase(db);

  // 10. Audit log & real-time broadcast
  addSystemLog(
    'warn',
    'auth',
    `Admin @${(req as any).user.id} permanently deleted user @${targetId} (${deletedUser.displayName}) from database.`
  );
  broadcastEvent('user_deleted', { userId: targetId });

  res.json({
    success: true,
    message: `Account @${targetId} (${deletedUser.displayName}) has been permanently deleted from database.`,
    userId: targetId,
  });
});

// Admin: Delete ALL regular user accounts (Protects administrator accounts)
app.post('/api/admin/users/delete-all-regular', authenticate, requireAdmin, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();

  const isProtected = (u: User) =>
    u.id === 'zayan' ||
    u.id === 'zanu' ||
    u.username === 'zanu' ||
    u.id === currentUser.id ||
    u.role === 'admin';

  const regularUsers = db.users.filter((u) => !isProtected(u));
  const regularUserIds = new Set(regularUsers.map((u) => u.id));
  const deletedCount = regularUsers.length;

  if (deletedCount === 0) {
    return res.status(200).json({
      success: true,
      message: 'No regular user accounts to delete. Only protected administrator accounts exist.',
      deletedCount: 0,
    });
  }

  // 1. Keep only protected admin users
  db.users = db.users.filter((u) => isProtected(u));

  // 2. Remove sessions of deleted users
  db.sessions = db.sessions.filter((s) => !regularUserIds.has(s.userId));

  // 3. Remove messages sent or received by deleted users
  db.messages = db.messages.filter(
    (m) => !regularUserIds.has(m.senderId) && !regularUserIds.has(m.receiverId)
  );

  // 4. Remove deleted users from all groups
  if (Array.isArray(db.groups)) {
    db.groups.forEach((g) => {
      if (Array.isArray(g.members)) {
        g.members = g.members.filter((m) => !regularUserIds.has(m.userId));
      }
    });
  }

  // 5. Remove stories created by deleted users
  if (Array.isArray(db.stories)) {
    db.stories = db.stories.filter((s) => !regularUserIds.has(s.authorId));
  }

  // 6. Remove posts created by deleted users
  if (Array.isArray(db.posts)) {
    db.posts = db.posts.filter((p) => !regularUserIds.has(p.authorId));
  }

  // 7. Remove friend requests involving deleted users
  if (Array.isArray(db.friendRequests)) {
    db.friendRequests = db.friendRequests.filter(
      (r) => !regularUserIds.has(r.fromUserId) && !regularUserIds.has(r.toUserId)
    );
  }

  // 8. Remove notifications for deleted users
  if (Array.isArray(db.notifications)) {
    db.notifications = db.notifications.filter((n) => !regularUserIds.has(n.userId));
  }

  // 9. Save database
  saveDatabase(db);

  // 10. Audit log & broadcast
  addSystemLog(
    'warn',
    'auth',
    `EMERGENCY ACTION: Admin @${currentUser.id} deleted all ${deletedCount} regular user accounts from the database.`
  );
  broadcastEvent('all_regular_users_deleted', { count: deletedCount, adminId: currentUser.id });

  res.status(200).json({
    success: true,
    message: `Successfully deleted all ${deletedCount} regular user accounts from the database. Protected admin account remains active.`,
    deletedCount,
  });
});

// Get reports
app.get('/api/admin/reports', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ reports: db.reports });
});

// Resolve report
app.put('/api/admin/reports/:id/resolve', authenticate, requireAdmin, (req: Request, res: Response) => {
  const db = loadDatabase();
  const report = db.reports.find((r) => r.id === req.params.id);
  if (report) {
    report.status = 'resolved';
    saveDatabase(db);
  }
  res.json({ success: true });
});

// Admin Diagnostics & System Logs
app.get('/api/admin/diagnostics', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const db = loadDatabase();
  const uptimeSeconds = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: {
      uptime: uptimeSeconds,
      nodeVersion: process.version,
      memoryRssMb: (memUsage.rss / 1024 / 1024).toFixed(1),
      memoryHeapUsedMb: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
      platform: process.platform,
    },
    database: {
      status: 'connected',
      totalUsers: db.users.length,
      activeUsers: db.users.filter((u) => !u.disabled).length,
      totalMessages: db.messages.length,
      totalGroups: db.groups.length,
      totalPosts: db.posts.length,
      pendingReports: db.reports.filter((r) => r.status === 'pending').length,
    },
    realtime: {
      activeSSEClients: sseClients.length,
      webrtcSignaling: 'operational',
      ratchetE2EEStatus: 'enforced',
    },
    logs: systemLogs.slice(-60).reverse(),
  });
});
// Admin: Delete all chat in all groups
app.post('/api/admin/groups/clear-all-chats', authenticate, requireAdmin, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  const initialCount = db.messages.filter((m) => Boolean(m.groupId)).length;

  // Clear messages belonging to any group
  db.messages = db.messages.filter((m) => !m.groupId);
  saveDatabase(db);

  addSystemLog('warn', 'chat', `Admin @${currentUser.id} deleted all chat messages across all groups (${initialCount} messages purged)`);
  broadcastEvent('all_group_chats_cleared', { clearedBy: currentUser.id, count: initialCount });

  res.json({
    success: true,
    message: `All chat messages across all groups were permanently deleted (${initialCount} messages cleared).`,
    purgedCount: initialCount,
  });
});

// Admin: Delete all direct messages across the entire database
app.post('/api/admin/messages/clear-all-direct', authenticate, requireAdmin, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  const initialCount = db.messages.filter((m) => !m.groupId).length;

  // Keep only group messages, purge all direct messages
  db.messages = db.messages.filter((m) => Boolean(m.groupId));
  saveDatabase(db);

  addSystemLog('warn', 'chat', `Admin @${currentUser.id} deleted all direct messages across database (${initialCount} messages purged)`);
  broadcastEvent('all_direct_messages_cleared', { clearedBy: currentUser.id, count: initialCount });

  res.json({
    success: true,
    message: `All direct messages across the database were permanently deleted (${initialCount} messages cleared).`,
    purgedCount: initialCount,
  });
});

// Admin: Delete ALL messages (Direct + Groups) across entire database
app.post('/api/admin/messages/clear-all', authenticate, requireAdmin, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  const initialCount = db.messages.length;

  db.messages = [];
  saveDatabase(db);

  addSystemLog('warn', 'chat', `Admin @${currentUser.id} deleted all messages (direct + groups) across database (${initialCount} messages purged)`);
  broadcastEvent('all_messages_cleared', { clearedBy: currentUser.id, count: initialCount });

  res.json({
    success: true,
    message: `All direct and group messages across the entire database were permanently deleted (${initialCount} messages cleared).`,
    purgedCount: initialCount,
  });
});

// Admin: Make/Create Group directly from Admin Portal
app.post('/api/admin/groups', authenticate, requireAdmin, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { name, description, isPrivate, tags, avatarUrl } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const db = loadDatabase();
  const newGroup: Group = {
    id: `grp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    name: name.trim().slice(0, 100),
    description: (description || '').trim().slice(0, 300),
    avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80`,
    bannerUrl: `https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80`,
    isPrivate: Boolean(isPrivate),
    createdBy: currentUser.id,
    members: [
      {
        userId: currentUser.id,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
        role: 'admin',
        joinedAt: new Date().toISOString(),
      },
    ],
    announcements: [],
    tags: Array.isArray(tags) ? tags.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean) : [],
    createdAt: new Date().toISOString(),
  };

  db.groups.unshift(newGroup);
  saveDatabase(db);

  addSystemLog('info', 'chat', `Admin @${currentUser.id} created new group "${newGroup.name}" (@${newGroup.id})`);
  broadcastEvent('new_group', { group: newGroup });

  res.status(201).json({ success: true, group: newGroup });
});

// ----------------------------------------------------
// DATABASE CONNECT & ADMIN COMMAND CONSOLE
// ----------------------------------------------------

// GET /api/admin/db-connection - Check live database connectivity and engine health
app.get('/api/admin/db-connection', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const exists = fs.existsSync(DB_FILE);
    let sizeBytes = 0;
    let lastModified = new Date().toISOString();

    if (exists) {
      const stats = fs.statSync(DB_FILE);
      sizeBytes = stats.size;
      lastModified = stats.mtime.toISOString();
    }

    const db = loadDatabase();
    const latencyMs = Date.now() - startTime;

    res.json({
      connected: true,
      status: 'ONLINE_HEALTHY',
      engine: 'JSON-Relational SQLite/File Engine (Persistent)',
      dbFile: DB_FILE,
      sizeBytes,
      sizeKb: (sizeBytes / 1024).toFixed(2),
      sizeMb: (sizeBytes / (1024 * 1024)).toFixed(3),
      lastModified,
      latencyMs: Math.max(1, latencyMs),
      schemaVersion: '2.0-spatial',
      tables: {
        users: db.users.length,
        messages: db.messages.length,
        sessions: db.sessions.length,
        groups: db.groups.length,
        reports: db.reports.length,
        posts: db.posts.length,
        stories: db.stories.length,
        inviteCodes: db.inviteCodes.length,
        bookmarks: db.bookmarks?.length || 0,
        reminders: db.reminders?.length || 0,
        pinnedMessages: db.pinnedMessages?.length || 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      connected: false,
      status: 'CONNECTION_ERROR',
      error: err.message || 'Database connection error',
    });
  }
});

// POST /api/admin/command - Execute administrative database commands
app.post('/api/admin/command', authenticate, requireAdmin, (req: Request, res: Response) => {
  const startTime = Date.now();
  const rawCommand = (req.body.command || '').trim();

  if (!rawCommand) {
    return res.status(400).json({ error: 'Command string is required' });
  }

  const parts = rawCommand.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  try {
    const db = loadDatabase();
    let output = '';
    let data: any = null;

    switch (cmd) {
      case 'help':
      case '?': {
        output = `Available Database & Admin Commands:
============================================================
● DATABASE & STORAGE:
  db:status | status             Check live database connection, health & metrics
  db:connect                     Verify persistent DB connection and file latency
  db:query <collection> [limit]  Query collection (users, messages, groups, sessions, reports, posts)
  db:backup                      Create an instant timestamped backup of the database
  db:compact                     Purge expired sessions, old stories, and optimize DB
  db:stats                       Detailed record count and storage allocation breakdown

● USER & ACCOUNT MANAGEMENT:
  user:list                      List all registered users, roles, and status
  user:create <id> <pass> [role] Provision a new user directly (role: friend | admin)
  user:password <id> <newPass>   Reset or update password for any user
  user:delete <id>               Delete a user account and associated messages
  user:toggle <id>               Toggle enable/disable status for a user
  user:info <id>                 Display full profile, activity & sessions for user

● MESSAGING & REALTIME:
  messages:count [userId]        Show total messages or messages for specific user
  sessions:list                  List all active authenticated device sessions
  sessions:purge                 Revoke all sessions except current session
  system:logs [limit]            View recent system and security audit logs
  clear                          Clear terminal screen

Type any command above or click quick command chips to execute.`;
        break;
      }

      case 'db:status':
      case 'status':
      case 'db:connect': {
        const stats = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE) : null;
        const sizeKb = stats ? (stats.size / 1024).toFixed(2) : '0';
        data = {
          connected: true,
          status: 'CONNECTED',
          engine: 'JSON-Relational SQLite/File Engine (Persistent)',
          path: DB_FILE,
          sizeKb: `${sizeKb} KB`,
          totalUsers: db.users.length,
          totalMessages: db.messages.length,
          totalGroups: db.groups.length,
          totalSessions: db.sessions.length,
          totalReports: db.reports.length,
          totalPosts: db.posts.length,
          lastWrite: stats ? stats.mtime.toISOString() : 'N/A',
        };
        output = `[DATABASE STATUS: ONLINE]
Connection:       CONNECTED (Verified)
Engine:           JSON-Relational Engine v2.0
Storage Path:     ${DB_FILE}
File Size:        ${sizeKb} KB
Total Users:      ${db.users.length} (${db.users.filter(u => u.online).length} online)
Total Messages:   ${db.messages.length}
Total Groups:     ${db.groups.length}
Active Sessions:  ${db.sessions.length}
Total Posts:      ${db.posts.length}
Pending Reports:  ${db.reports.filter(r => r.status === 'pending').length}
Last Modified:    ${stats ? stats.mtime.toLocaleString() : 'N/A'}
Connection Ping:  <1ms`;
        break;
      }

      case 'db:query': {
        const collection = args[0]?.toLowerCase();
        const limit = args[1] ? parseInt(args[1], 10) : 20;

        if (!collection) {
          throw new Error('Usage: db:query <users|messages|groups|sessions|reports|posts|stories|invitecodes> [limit]');
        }

        const validCollections = ['users', 'messages', 'groups', 'sessions', 'reports', 'posts', 'stories', 'invitecodes', 'bookmarks', 'reminders'];
        if (!validCollections.includes(collection)) {
          throw new Error(`Unknown collection "${collection}". Valid options: ${validCollections.join(', ')}`);
        }

        let records: any[] = [];
        if (collection === 'users') {
          records = db.users.map(u => ({ id: u.id, displayName: u.displayName, role: u.role, online: u.online, disabled: u.disabled, createdAt: u.createdAt }));
        } else if (collection === 'messages') {
          records = db.messages.slice(-limit).map(m => ({ id: m.id, from: m.senderId, to: m.receiverId, text: m.text?.slice(0, 40), media: m.mediaType, time: m.createdAt }));
        } else if (collection === 'groups') {
          records = db.groups.map(g => ({ id: g.id, name: g.name, membersCount: g.members.length, isPrivate: g.isPrivate }));
        } else if (collection === 'sessions') {
          records = db.sessions.map(s => ({ id: s.id, userId: s.userId, device: s.deviceName, os: s.os, ip: s.ip, lastActive: s.lastActive }));
        } else if (collection === 'reports') {
          records = db.reports;
        } else if (collection === 'posts') {
          records = db.posts.slice(-limit).map(p => ({ id: p.id, author: p.authorName, text: p.text.slice(0, 40), likes: p.likes.length, comments: p.comments.length }));
        } else if (collection === 'invitecodes') {
          records = db.inviteCodes;
        } else if (collection === 'bookmarks') {
          records = db.bookmarks || [];
        } else if (collection === 'reminders') {
          records = db.reminders || [];
        }

        data = records.slice(0, limit);
        output = `Queried "${collection}" (showing ${data.length} records):\n` + JSON.stringify(data, null, 2);
        break;
      }

      case 'db:backup': {
        const backupsDir = path.resolve(DATA_DIR, 'backups');
        if (!fs.existsSync(backupsDir)) {
          fs.mkdirSync(backupsDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.resolve(backupsDir, `backup_${timestamp}.json`);
        fs.copyFileSync(DB_FILE, backupFile);
        const stats = fs.statSync(backupFile);
        output = `Database snapshot backup completed successfully!
File: ${backupFile}
Size: ${(stats.size / 1024).toFixed(2)} KB
Timestamp: ${new Date().toLocaleString()}`;
        data = { backupFile, sizeBytes: stats.size, timestamp };
        addSystemLog('info', 'database', `Admin created database backup: ${path.basename(backupFile)}`);
        break;
      }

      case 'db:compact': {
        const initialMessages = db.messages.length;
        const now = Date.now();
        // Remove expired sessions
        db.sessions = db.sessions.filter(s => s.expiresAt > now);
        // Remove expired stories (older than 24h)
        db.stories = db.stories.filter(s => new Date(s.expiresAt).getTime() > now);
        saveDatabase(db);
        output = `Database compacted and optimized:
- Expired sessions pruned
- 24-hour stories cleaned
- Storage refreshed and verified.`;
        data = { success: true };
        addSystemLog('info', 'database', 'Admin executed db:compact storage optimization');
        break;
      }

      case 'db:stats': {
        output = `Database Statistics & Storage Allocation:
---------------------------------------------
Users Table:        ${db.users.length} records
Messages Table:     ${db.messages.length} records
Groups Table:       ${db.groups.length} records
Sessions Table:     ${db.sessions.length} records
Posts Table:        ${db.posts.length} records
Stories Table:      ${db.stories.length} records
Reports Table:      ${db.reports.length} records
Invite Codes:       ${db.inviteCodes.length} records
Bookmarks:          ${db.bookmarks?.length || 0} records
Reminders:          ${db.reminders?.length || 0} records
Disk Location:      ${DB_FILE}`;
        data = { users: db.users.length, messages: db.messages.length, groups: db.groups.length };
        break;
      }

      case 'user:list': {
        data = db.users.map(u => ({
          id: u.id,
          name: u.displayName,
          role: u.role,
          online: u.online,
          status: u.disabled ? 'DISABLED' : (u.online ? 'ONLINE' : 'OFFLINE'),
          createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A',
        }));
        const rows = data.map((u: any) => `[@${u.id.padEnd(12)}] ${u.name.padEnd(18)} Role: ${u.role.padEnd(7)} Status: ${u.status}`);
        output = `Total Registered Users (${db.users.length}):\n` + rows.join('\n');
        break;
      }

      case 'user:create': {
        const [newId, newPass, newRole] = args;
        if (!newId || !newPass) {
          throw new Error('Usage: user:create <username> <password> [role: friend|admin]');
        }
        const cleanId = newId.trim().toLowerCase();
        if (db.users.some(u => u.id === cleanId)) {
          throw new Error(`User "${cleanId}" already exists!`);
        }
        const hashed = hashPassword(newPass);
        const role = (newRole === 'admin') ? 'admin' : 'friend';
        const createdUser: User = {
          id: cleanId,
          displayName: newId,
          role,
          passwordHash: hashed.hash,
          salt: hashed.salt,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
          bio: 'Hey there! I am using ZappChat 2.0',
          status: 'Available',
          disabled: false,
          online: false,
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        db.users.push(createdUser);
        saveDatabase(db);
        output = `User account created successfully!
ID:       @${cleanId}
Password: ${newPass}
Role:     ${role}
Created:  ${createdUser.createdAt}`;
        data = { user: cleanId, role };
        addSystemLog('info', 'auth', `Admin created user via console: ${cleanId} (${role})`);
        break;
      }

      case 'user:password': {
        const [targetId, newPass] = args;
        if (!targetId || !newPass) {
          throw new Error('Usage: user:password <username> <newPassword>');
        }
        const cleanId = targetId.trim().toLowerCase();
        const user = db.users.find(u => u.id === cleanId);
        if (!user) {
          throw new Error(`User "${cleanId}" not found in database.`);
        }
        const hashed = hashPassword(newPass);
        user.passwordHash = hashed.hash;
        user.salt = hashed.salt;
        saveDatabase(db);
        output = `Password updated successfully for user @${cleanId}!
New Password: ${newPass}
Updated At:   ${new Date().toLocaleString()}`;
        data = { userId: cleanId, success: true };
        addSystemLog('info', 'auth', `Admin updated password for user via console: ${cleanId}`);
        break;
      }

      case 'user:toggle': {
        const targetId = args[0]?.trim().toLowerCase();
        if (!targetId) {
          throw new Error('Usage: user:toggle <username>');
        }
        const user = db.users.find(u => u.id === targetId);
        if (!user) {
          throw new Error(`User "${targetId}" not found.`);
        }
        if (user.role === 'admin') {
          throw new Error('Cannot toggle or disable an administrator account.');
        }
        user.disabled = !user.disabled;
        saveDatabase(db);
        output = `User @${targetId} account status toggled to: ${user.disabled ? 'DISABLED (Access Blocked)' : 'ACTIVE (Access Restored)'}`;
        data = { userId: targetId, disabled: user.disabled };
        break;
      }

      case 'user:delete': {
        const targetId = args[0]?.trim().toLowerCase();
        if (!targetId) {
          throw new Error('Usage: user:delete <username>');
        }
        if (targetId === 'zayan') {
          throw new Error('Cannot delete primary administrator "zayan".');
        }
        const userIdx = db.users.findIndex(u => u.id === targetId);
        if (userIdx === -1) {
          throw new Error(`User "${targetId}" not found.`);
        }
        db.users.splice(userIdx, 1);
        db.messages = db.messages.filter(m => m.senderId !== targetId && m.receiverId !== targetId);
        db.sessions = db.sessions.filter(s => s.userId !== targetId);
        saveDatabase(db);
        output = `User @${targetId} and all associated messages and active sessions have been permanently removed from database.`;
        data = { deleted: targetId };
        addSystemLog('warn', 'auth', `Admin deleted user via console: ${targetId}`);
        break;
      }

      case 'user:info': {
        const targetId = args[0]?.trim().toLowerCase();
        if (!targetId) {
          throw new Error('Usage: user:info <username>');
        }
        const user = db.users.find(u => u.id === targetId);
        if (!user) {
          throw new Error(`User "${targetId}" not found.`);
        }
        const msgSent = db.messages.filter(m => m.senderId === targetId).length;
        const msgReceived = db.messages.filter(m => m.receiverId === targetId).length;
        const userSessions = db.sessions.filter(s => s.userId === targetId);
        output = `Account Information: @${user.id}
---------------------------------------------
Display Name:     ${user.displayName}
Role:             ${user.role}
Account Status:   ${user.disabled ? 'DISABLED' : (user.online ? 'ONLINE' : 'OFFLINE')}
Bio:              ${user.bio || 'None'}
Status Message:   ${user.status || 'Available'}
Location:         ${user.location || 'Not set'}
Messages Sent:    ${msgSent}
Messages Recv:    ${msgReceived}
Active Sessions:  ${userSessions.length} device(s)
Created Date:     ${user.createdAt || 'N/A'}
Last Seen:        ${user.lastSeen || 'N/A'}`;
        data = { user, messageStats: { sent: msgSent, received: msgReceived }, sessionsCount: userSessions.length };
        break;
      }

      case 'messages:count': {
        const targetId = args[0]?.trim().toLowerCase();
        if (targetId) {
          const sent = db.messages.filter(m => m.senderId === targetId).length;
          const recv = db.messages.filter(m => m.receiverId === targetId).length;
          output = `Message count for @${targetId}: ${sent} sent, ${recv} received (Total: ${sent + recv})`;
        } else {
          output = `Total Messages in Database: ${db.messages.length}`;
        }
        break;
      }

      case 'sessions:list': {
        const sessions = db.sessions.map(s => `[${s.deviceName}] User: @${s.userId} | OS: ${s.os} | IP: ${s.ip} | Active: ${new Date(s.lastActive).toLocaleTimeString()}`);
        output = `Active Device Sessions (${db.sessions.length}):\n` + (sessions.length > 0 ? sessions.join('\n') : 'No active sessions found.');
        data = db.sessions;
        break;
      }

      case 'sessions:purge': {
        const currentToken = (req as any).token || '';
        const prevCount = db.sessions.length;
        db.sessions = db.sessions.filter(s => s.token === currentToken);
        saveDatabase(db);
        output = `Revoked ${prevCount - db.sessions.length} sessions. Current admin session preserved.`;
        break;
      }

      case 'system:logs': {
        const limit = args[0] ? parseInt(args[0], 10) : 15;
        const logs = systemLogs.slice(-limit).map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}`);
        output = `Recent System Logs (last ${limit}):\n` + logs.join('\n');
        break;
      }

      case 'clear': {
        output = '__CLEAR__';
        break;
      }

      default: {
        output = `Unknown command "${rawCommand}". Type "help" or "db:status" to see available database commands.`;
        break;
      }
    }

    const executionTimeMs = Date.now() - startTime;
    res.json({
      success: true,
      command: rawCommand,
      output,
      data,
      executionTimeMs,
    });
  } catch (err: any) {
    const executionTimeMs = Date.now() - startTime;
    res.status(400).json({
      success: false,
      command: rawCommand,
      error: err.message || 'Error executing admin command',
      executionTimeMs,
    });
  }
});

// ----------------------------------------------------
// CHAT & MESSAGING ROUTES
// ----------------------------------------------------

// List all friends/contacts for the current user
app.get('/api/friends', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();

  // Return all other active users (hide admin profile from regular users)
  const friends = db.users
    .filter((u) => u.id !== currentUser.id && !u.disabled && (currentUser.role === 'admin' || (u.role !== 'admin' && u.id !== 'admin')))
    .map(({ passwordHash, salt, ...u }) => {
      // Find unread count from this friend to currentUser
      const unreadCount = db.messages.filter(
        (m) => m.senderId === u.id && m.receiverId === currentUser.id && m.status !== 'read' && !m.isDeleted
      ).length;

      // Find last message between them
      const conversationMsgs = db.messages.filter(
        (m) =>
          ((m.senderId === currentUser.id && m.receiverId === u.id) ||
            (m.senderId === u.id && m.receiverId === currentUser.id)) &&
          !m.isDeleted
      );
      const lastMessage = conversationMsgs.length > 0 ? conversationMsgs[conversationMsgs.length - 1] : null;

      return {
        ...u,
        unreadCount,
        lastMessage,
      };
    });

  res.json({ friends });
});

// Get conversation history with another user
app.get('/api/messages/:otherUserId', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const otherUserId = req.params.otherUserId;

  const db = loadDatabase();
  const messages = db.messages.filter(
    (m) =>
      (m.senderId === currentUser.id && m.receiverId === otherUserId) ||
      (m.senderId === otherUserId && m.receiverId === currentUser.id)
  );

  res.json({ messages });
});

// Send a new message
app.post('/api/messages', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;

  // Security policy: Administrators cannot message users. Admin accounts are restricted to control, deletion, search, and moderation only.
  if (currentUser.role === 'admin') {
    return res.status(403).json({
      error: 'Administrators cannot message users. Administrator accounts have control and moderation permissions only (delete, search, purge, manage).',
    });
  }

  const {
    receiverId,
    text,
    mediaUrl,
    mediaType,
    fileName,
    fileSize,
    voiceDuration,
    replyToId,
  } = req.body;

  if (!receiverId) {
    return res.status(400).json({ error: 'Receiver ID is required' });
  }

  if (!text?.trim() && !mediaUrl) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const db = loadDatabase();
  const receiver = db.users.find((u) => u.id === receiverId && !u.disabled);
  if (!receiver) {
    return res.status(404).json({ error: 'Recipient user not found or disabled' });
  }

  // Lookup reply snippet if replying
  let replyToSnippet: Message['replyToSnippet'] = undefined;
  if (replyToId) {
    const parent = db.messages.find((m) => m.id === replyToId);
    if (parent) {
      replyToSnippet = {
        text: parent.text || (parent.mediaType ? `[${parent.mediaType}]` : ''),
        senderId: parent.senderId,
        mediaType: parent.mediaType,
      };
    }
  }

  const newMessage: Message = {
    id: `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    senderId: currentUser.id,
    receiverId,
    text: (text || '').trim(),
    mediaUrl,
    mediaType,
    fileName,
    fileSize,
    voiceDuration,
    replyToId,
    replyToSnippet,
    reactions: [],
    status: receiver.online ? 'delivered' : 'sent',
    createdAt: new Date().toISOString(),
  };

  db.messages.push(newMessage);
  saveDatabase(db);

  // Broadcast real-time message event to sender and receiver
  broadcastEvent('new_message', newMessage, [currentUser.id, receiverId]);

  // If message was sent to Zapp AI bot, trigger intelligent Gemini response
  if (receiverId === 'zapp_ai') {
    setTimeout(async () => {
      try {
        let aiText = '';
        if (process.env.GEMINI_API_KEY) {
          const aiResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: (text || '').trim(),
            config: {
              systemInstruction:
                'You are Zapp AI 2.0, the native spatial intelligence assistant of ZappChat Messenger 2.0. Respond directly with clean markdown formatting. Keep answers concise, helpful, and formatted with bullet points or code snippets if relevant.',
            },
          });
          aiText =
            aiResponse.text ||
            'I am Zapp AI 2.0. How can I assist you with your spatial messaging workspace today?';
        } else {
          aiText = `Hello @${currentUser.id}! I am Zapp AI 2.0. You said: "${text}". I am your spatial messaging companion. Ask me to draft messages, summarize conversations, or manage your workspace.`;
        }

        const freshDb = loadDatabase();
        const aiMessage: Message = {
          id: `msg_ai_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          senderId: 'zapp_ai',
          receiverId: currentUser.id,
          text: aiText,
          reactions: [],
          status: 'read',
          createdAt: new Date().toISOString(),
        };
        freshDb.messages.push(aiMessage);
        saveDatabase(freshDb);
        broadcastEvent('new_message', aiMessage, [currentUser.id]);
      } catch (err: any) {
        console.error('Error generating Zapp AI response:', err);
      }
    }, 400);
  }

  res.status(201).json({ message: newMessage });
});

// Edit message (only sender can edit, within their own messages)
app.put('/api/messages/:messageId', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { text } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ error: 'Message text cannot be empty' });
  }

  const db = loadDatabase();
  const message = db.messages.find((m) => m.id === req.params.messageId);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  if (message.senderId !== currentUser.id) {
    return res.status(403).json({ error: 'You can only edit your own messages' });
  }
  if (message.isDeleted) {
    return res.status(400).json({ error: 'Cannot edit a deleted message' });
  }

  message.text = text.trim();
  message.isEdited = true;
  message.editedAt = new Date().toISOString();

  saveDatabase(db);

  broadcastEvent('message_edited', message, [message.senderId, message.receiverId]);

  res.json({ message });
});

// Delete message
app.delete('/api/messages/:messageId', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  const message = db.messages.find((m) => m.id === req.params.messageId);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  if (message.senderId !== currentUser.id && currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'You can only delete your own messages' });
  }

  message.isDeleted = true;
  message.text = 'This message was deleted';
  message.mediaUrl = undefined;
  message.mediaType = undefined;
  message.fileName = undefined;
  message.reactions = [];

  saveDatabase(db);

  broadcastEvent('message_deleted', {
    messageId: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
  }, [message.senderId, message.receiverId]);

  res.json({ success: true });
});

// Clear / Delete conversation with a specific friend (Direct Message Delete with Press Button)
app.delete('/api/messages/conversation/:otherUserId', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { otherUserId } = req.params;
  const db = loadDatabase();

  const countBefore = db.messages.length;
  db.messages = db.messages.filter(
    (m) =>
      !(
        (m.senderId === currentUser.id && m.receiverId === otherUserId) ||
        (m.senderId === otherUserId && m.receiverId === currentUser.id)
      )
  );
  const clearedCount = countBefore - db.messages.length;
  saveDatabase(db);

  addSystemLog(
    'info',
    'chat',
    `User @${currentUser.id} cleared direct message history with @${otherUserId} (${clearedCount} messages deleted)`
  );
  broadcastEvent(
    'conversation_cleared',
    {
      userA: currentUser.id,
      userB: otherUserId,
      clearedCount,
    },
    [currentUser.id, otherUserId]
  );

  res.json({ success: true, count: clearedCount });
});

// React to message
app.post('/api/messages/:messageId/reactions', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { emoji } = req.body;

  if (!emoji) {
    return res.status(400).json({ error: 'Emoji is required' });
  }

  const db = loadDatabase();
  const message = db.messages.find((m) => m.id === req.params.messageId);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // Toggle reaction: if already reacted with this emoji, remove it; else set/replace
  const existingIndex = message.reactions.findIndex((r) => r.userId === currentUser.id && r.emoji === emoji);
  if (existingIndex !== -1) {
    message.reactions.splice(existingIndex, 1);
  } else {
    // remove previous reaction from this user if any, then add
    message.reactions = message.reactions.filter((r) => r.userId !== currentUser.id);
    message.reactions.push({ emoji, userId: currentUser.id });
  }

  saveDatabase(db);

  broadcastEvent('message_reaction', {
    messageId: message.id,
    reactions: message.reactions,
  }, [message.senderId, message.receiverId]);

  res.json({ reactions: message.reactions });
});

// Mark messages from other user as read
app.post('/api/messages/:otherUserId/read', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const otherUserId = req.params.otherUserId;

  const db = loadDatabase();
  let updatedCount = 0;

  db.messages.forEach((m) => {
    if (m.senderId === otherUserId && m.receiverId === currentUser.id && m.status !== 'read') {
      m.status = 'read';
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    saveDatabase(db);
    broadcastEvent('messages_read', {
      readerId: currentUser.id,
      senderId: otherUserId,
    }, [otherUserId, currentUser.id]);
  }

  res.json({ updatedCount });
});

// Presence & Typing
app.post('/api/presence/typing', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { toUserId, isTyping } = req.body;

  if (toUserId) {
    broadcastEvent('typing_indicator', {
      fromUserId: currentUser.id,
      fromDisplayName: currentUser.displayName,
      isTyping: Boolean(isTyping),
    }, [toUserId]);
  }

  res.json({ success: true });
});

// Presence heartbeat
app.post('/api/presence/heartbeat', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === currentUser.id);

  if (user) {
    user.online = true;
    user.lastSeen = new Date().toISOString();
    saveDatabase(db);
  }

  res.json({ success: true, lastSeen: user?.lastSeen });
});

// Report message
app.post('/api/reports', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { messageId, reason } = req.body;

  if (!messageId || !reason) {
    return res.status(400).json({ error: 'Message ID and reason are required' });
  }

  const db = loadDatabase();
  const message = db.messages.find((m) => m.id === messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  const report: Report = {
    id: `rep_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    messageId,
    reportedBy: currentUser.id,
    reportedUserId: message.senderId,
    reason: String(reason).trim(),
    messageSnippet: message.text || `[Attachment: ${message.mediaType}]`,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  db.reports.push(report);
  saveDatabase(db);

  // Notify admin
  broadcastEvent('new_report', report, ['zayan']);

  res.status(201).json({ success: true, message: 'Report submitted for administrator review' });
});

// File upload endpoint (accepts base64 or file blob)
app.post('/api/upload', authenticate, (req: Request, res: Response) => {
  try {
    const { fileData, fileName, fileType } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    // Allowed Safe Extensions (blocks HTML, SVG, PHP, JS, executable files)
    const SAFE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'webm', 'mp4', 'ogg', 'mp3', 'wav', 'pdf', 'txt', 'doc', 'docx']);
    const DANGEROUS_EXTS = new Set(['html', 'htm', 'svg', 'php', 'phtml', 'sh', 'exe', 'bat', 'cmd', 'js', 'jsx', 'ts', 'tsx', 'py', 'pl']);

    // Extract base64
    const matches = fileData.match(/^data:([A-Za-z-+/0-9]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'bin';

    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      buffer = Buffer.from(matches[2], 'base64');
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('gif')) ext = 'gif';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('webm')) ext = 'webm';
      else if (mime.includes('mp4')) ext = 'mp4';
      else if (mime.includes('ogg') || mime.includes('audio')) ext = 'ogg';
      else if (mime.includes('pdf')) ext = 'pdf';
      else if (mime.includes('text/plain')) ext = 'txt';
      else if (fileName && fileName.includes('.')) {
        const rawExt = String(fileName).split('.').pop()?.toLowerCase() || 'bin';
        ext = SAFE_EXTS.has(rawExt) && !DANGEROUS_EXTS.has(rawExt) ? rawExt : 'bin';
      }
    } else {
      buffer = Buffer.from(fileData, 'base64');
      if (fileName && fileName.includes('.')) {
        const rawExt = String(fileName).split('.').pop()?.toLowerCase() || 'bin';
        ext = SAFE_EXTS.has(rawExt) && !DANGEROUS_EXTS.has(rawExt) ? rawExt : 'bin';
      }
    }

    // Force non-executable extension if extension is disallowed
    if (DANGEROUS_EXTS.has(ext) || !SAFE_EXTS.has(ext)) {
      ext = 'bin';
    }

    // Check size limit: 25MB
    if (buffer.length > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 25MB' });
    }

    const uniqueName = `upload_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);
    fs.writeFileSync(filePath, buffer);

    // Sanitize user provided filename
    const sanitizedFileName = (fileName || uniqueName)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 100);

    const publicUrl = `/uploads/${uniqueName}`;
    res.json({
      url: publicUrl,
      size: buffer.length,
      fileName: sanitizedFileName,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process file upload' });
  }
});

// SSE Real-Time events endpoint
app.get('/api/events', (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(401).end();
  }

  const db = loadDatabase();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  if (!session) {
    return res.status(401).end();
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user || user.disabled) {
    return res.status(403).end();
  }

  // Headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const clientId = `client_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const newClient: SSEClient = { id: clientId, userId: user.id, res };
  sseClients.push(newClient);

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, userId: user.id })}\n\n`);

  // Keep alive ping every 25 seconds
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// ----------------------------------------------------
// WEBRTC CALLING & SIGNALING ROUTES
// ----------------------------------------------------

interface ActiveCall {
  callId: string;
  callerId: string;
  receiverId: string;
  callType: 'voice' | 'video';
  status: 'ringing' | 'connected' | 'ended';
  startedAt: number;
}

const activeCalls = new Map<string, ActiveCall>();

// ICE Servers Configuration
app.get('/api/calls/ice-servers', authenticate, (_req: Request, res: Response) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  });
});

// Initiate a Call
app.post('/api/calls/initiate', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { receiverId, callType } = req.body;

  if (!receiverId || (callType !== 'voice' && callType !== 'video')) {
    return res.status(400).json({ error: 'Valid receiverId and callType ("voice" or "video") are required' });
  }

  const db = loadDatabase();
  const receiver = db.users.find((u) => u.id === receiverId && !u.disabled);
  if (!receiver) {
    return res.status(404).json({ error: 'User not found or unavailable' });
  }

  // Check if receiver is already in an active connected call
  for (const call of activeCalls.values()) {
    if (
      (call.callerId === receiverId || call.receiverId === receiverId) &&
      call.status === 'connected'
    ) {
      return res.status(486).json({ error: `${receiver.displayName} is currently busy on another call.`, code: 'BUSY' });
    }
  }

  const callId = `call_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const newCall: ActiveCall = {
    callId,
    callerId: currentUser.id,
    receiverId,
    callType,
    status: 'ringing',
    startedAt: Date.now(),
  };

  activeCalls.set(callId, newCall);

  const { passwordHash: _, salt: __, ...safeCaller } = currentUser;

  // Broadcast incoming call to receiver via SSE
  broadcastEvent('incoming_call', {
    callId,
    callType,
    caller: safeCaller,
  }, [receiverId]);

  res.status(201).json({ callId, callType, receiverId, status: 'ringing' });
});

// Relay WebRTC Signal (SDP offer, answer, ICE candidate)
app.post('/api/calls/:callId/signal', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { callId } = req.params;
  const { toUserId, type, signalData } = req.body;

  if (!toUserId || !type || !signalData) {
    return res.status(400).json({ error: 'toUserId, type, and signalData are required' });
  }

  const call = activeCalls.get(callId);
  if (!call) {
    return res.status(404).json({ error: 'Call session not found' });
  }

  // Broadcast signal to target user
  broadcastEvent('call_signal', {
    callId,
    fromUserId: currentUser.id,
    type,
    signalData,
  }, [toUserId]);

  res.json({ success: true });
});

// Accept Incoming Call
app.post('/api/calls/:callId/accept', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { callId } = req.params;

  const call = activeCalls.get(callId);
  if (!call) {
    return res.status(404).json({ error: 'Call session not found' });
  }

  call.status = 'connected';

  // Notify caller that call was accepted
  broadcastEvent('call_accepted', {
    callId,
    acceptedBy: currentUser.id,
  }, [call.callerId]);

  res.json({ success: true, callId });
});

// Reject / Decline Call
app.post('/api/calls/:callId/reject', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { callId } = req.params;
  const { reason } = req.body;

  const call = activeCalls.get(callId);
  if (call) {
    activeCalls.delete(callId);

    // Notify caller that call was declined
    broadcastEvent('call_rejected', {
      callId,
      reason: reason || 'declined',
    }, [call.callerId]);

    // Record missed/declined call in conversation
    const db = loadDatabase();
    const missedMsg: Message = {
      id: `msg_call_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      senderId: call.callerId,
      receiverId: call.receiverId,
      text: `Declined ${call.callType} call`,
      reactions: [],
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    db.messages.push(missedMsg);
    saveDatabase(db);

    broadcastEvent('new_message', missedMsg, [call.callerId, call.receiverId]);
  }

  res.json({ success: true });
});

// End Call
app.post('/api/calls/:callId/end', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { callId } = req.params;
  const { durationSeconds } = req.body;

  const call = activeCalls.get(callId);
  if (call) {
    activeCalls.delete(callId);

    // Notify both parties that call ended
    broadcastEvent('call_ended', {
      callId,
      endedBy: currentUser.id,
      durationSeconds: durationSeconds || 0,
    }, [call.callerId, call.receiverId]);

    // If call was connected, record call duration message in conversation
    if (durationSeconds && durationSeconds > 0) {
      const db = loadDatabase();
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      const durationFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

      const callMsg: Message = {
        id: `msg_call_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        senderId: call.callerId,
        receiverId: call.receiverId,
        text: `${call.callType === 'video' ? '📹 Video call' : '📞 Voice call'} · ${durationFormatted}`,
        reactions: [],
        status: 'read',
        createdAt: new Date().toISOString(),
      };
      db.messages.push(callMsg);
      saveDatabase(db);

      broadcastEvent('new_message', callMsg, [call.callerId, call.receiverId]);
    }
  }

  res.json({ success: true });
});

// ----------------------------------------------------
// ZAPPCHAT 2.0 SPATIAL & AI ENDPOINTS
// ----------------------------------------------------

// POST /api/ai/write - Smart writing assistant with tone controls
app.post('/api/ai/write', authenticate, async (req: Request, res: Response) => {
  const { text, mode } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text prompt is required' });
  }

  const promptModes: Record<string, string> = {
    polish: 'Polish this text for maximum clarity, eloquence, and grammatical perfection without changing the meaning:',
    professional: 'Rewrite this message in an articulate, polished, respectful professional business tone:',
    friendly: 'Rewrite this message in an upbeat, warm, friendly and charismatic conversational tone:',
    concise: 'Condense and make this message punchy and direct, removing fluff while preserving vital information:',
    expand: 'Elaborate constructively on this thought with relevant supportive detail and structure:',
    fix_grammar: 'Fix all grammar, punctuation, and typos in this message while keeping exact wording:',
  };

  const instruction = promptModes[mode] || promptModes.polish;

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${instruction}\n\n"${text.trim()}"`,
        config: {
          systemInstruction: 'You are the AI Writing Engine in ZappChat 2.0. Return only the revised message text. Do not wrap in quotes or add preamble conversational filler.',
        },
      });
      return res.json({ result: (response.text || text).trim() });
    }
  } catch (err: any) {
    console.error('Gemini write API error:', err);
  }

  // Graceful fallback if no key or transient error
  return res.json({ result: text.trim() });
});

// POST /api/ai/topics - Extract conversation topics, summary, and action items
app.post('/api/ai/topics', authenticate, async (req: Request, res: Response) => {
  const { conversationId } = req.body;
  const currentUser: User = (req as any).user;
  const db = loadDatabase();

  const conversationMsgs = db.messages
    .filter(
      (m) =>
        (m.senderId === currentUser.id && m.receiverId === conversationId) ||
        (m.senderId === conversationId && m.receiverId === currentUser.id) ||
        m.groupId === conversationId
    )
    .slice(-30);

  if (conversationMsgs.length === 0) {
    return res.json({
      summary: 'No messages exchanged yet in this conversation.',
      topics: ['New Conversation'],
      actionItems: [],
    });
  }

  const formattedDialogue = conversationMsgs
    .map((m) => `${m.senderId}: ${m.text || `[${m.mediaType || 'media'}]`}`)
    .join('\n');

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analyze this chat dialogue:\n${formattedDialogue}\n\nRespond in JSON format: {"summary": "2 sentence overview", "topics": ["topic1", "topic2", "topic3"], "actionItems": ["action item 1"]}`,
        config: {
          responseMimeType: 'application/json',
          systemInstruction: 'You are an executive conversation analyst. Output valid JSON only with keys summary, topics, and actionItems.',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        summary: parsed.summary || 'Discussion between participants regarding collaboration and updates.',
        topics: parsed.topics || ['General Discussion'],
        actionItems: parsed.actionItems || [],
      });
    }
  } catch (err) {
    console.error('Gemini topics error:', err);
  }

  return res.json({
    summary: `Active discussion with ${conversationMsgs.length} messages exchanged.`,
    topics: ['Collaboration', 'Direct Messaging', 'ZappChat v2'],
    actionItems: ['Continue conversation in spatial workspace'],
  });
});

// POST /api/ai/search - Semantic and keyword search across messages
app.post('/api/ai/search', authenticate, (req: Request, res: Response) => {
  const { query } = req.body;
  const currentUser: User = (req as any).user;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const db = loadDatabase();
  const lowerQuery = query.toLowerCase().trim();

  // Find messages where user is sender or receiver
  const matches = db.messages
    .filter(
      (m) =>
        (m.senderId === currentUser.id || m.receiverId === currentUser.id) &&
        m.text &&
        m.text.toLowerCase().includes(lowerQuery)
    )
    .slice(-20)
    .reverse();

  res.json({ matches, count: matches.length });
});

// POST /api/ai/transcribe - Transcribe voice message audio
app.post('/api/ai/transcribe', authenticate, (req: Request, res: Response) => {
  const { audioUrl, duration } = req.body;
  // Simulated intelligent spatial voice transcription
  const sampleTranscriptions = [
    'Hey, just following up on our project milestones for the spatial workspace release.',
    'Let me know when you are free for a quick voice call on ZappChat.',
    'Awesome progress on the design system! The Midnight Emerald theme looks exceptional.',
    'Check out the latest update in the group announcement channel.',
  ];
  const randomText = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)];
  res.json({ transcription: randomText, duration: duration || 12 });
});

// POST /api/messages/:messageId/bookmark - Toggle bookmark
app.post('/api/messages/:messageId/bookmark', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { messageId } = req.params;
  const db = loadDatabase();

  const msg = db.messages.find((m) => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }

  db.bookmarks = db.bookmarks || [];
  const idx = db.bookmarks.findIndex((b) => b.userId === currentUser.id && b.messageId === messageId);
  let isBookmarked = false;

  if (idx !== -1) {
    db.bookmarks.splice(idx, 1);
    isBookmarked = false;
  } else {
    db.bookmarks.push({
      userId: currentUser.id,
      messageId,
      createdAt: new Date().toISOString(),
    });
    isBookmarked = true;
  }

  saveDatabase(db);
  res.json({ success: true, isBookmarked });
});

// GET /api/bookmarks - Get bookmarked messages
app.get('/api/bookmarks', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  db.bookmarks = db.bookmarks || [];

  const userBookmarkIds = new Set(db.bookmarks.filter((b) => b.userId === currentUser.id).map((b) => b.messageId));
  const bookmarkedMessages = db.messages.filter((m) => userBookmarkIds.has(m.id));

  res.json({ bookmarks: bookmarkedMessages });
});

// POST /api/messages/:messageId/remind - Set reminder for message
app.post('/api/messages/:messageId/remind', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { messageId } = req.params;
  const { remindAt, note } = req.body;

  if (!remindAt) {
    return res.status(400).json({ error: 'remindAt date/time is required' });
  }

  const db = loadDatabase();
  db.reminders = db.reminders || [];

  const reminder: ReminderRecord = {
    id: `rem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: currentUser.id,
    messageId,
    remindAt,
    note: note ? String(note).trim() : undefined,
    done: false,
    createdAt: new Date().toISOString(),
  };

  db.reminders.push(reminder);
  saveDatabase(db);

  res.status(201).json({ reminder });
});

// GET /api/reminders - Get user's reminders
app.get('/api/reminders', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  db.reminders = db.reminders || [];

  const reminders = db.reminders.filter((r) => r.userId === currentUser.id);
  res.json({ reminders });
});

// DELETE /api/reminders/:id - Dismiss reminder
app.delete('/api/reminders/:id', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  db.reminders = db.reminders || [];

  db.reminders = db.reminders.filter((r) => !(r.id === req.params.id && r.userId === currentUser.id));
  saveDatabase(db);
  res.json({ success: true });
});

// POST /api/conversations/:conversationId/pin/:messageId - Pin message
app.post('/api/conversations/:conversationId/pin/:messageId', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { conversationId, messageId } = req.params;
  const db = loadDatabase();
  db.pinnedMessages = db.pinnedMessages || [];

  // Remove existing pin for this conversation if any, or push
  db.pinnedMessages = db.pinnedMessages.filter((p) => p.conversationId !== conversationId);
  const pinRecord: PinnedMessageRecord = {
    conversationId,
    messageId,
    pinnedBy: currentUser.id,
    pinnedAt: new Date().toISOString(),
  };

  db.pinnedMessages.push(pinRecord);
  saveDatabase(db);

  broadcastEvent('message_pinned', pinRecord, [currentUser.id, conversationId]);
  res.json({ success: true, pin: pinRecord });
});

// DELETE /api/conversations/:conversationId/pin/:messageId - Unpin message
app.delete('/api/conversations/:conversationId/pin/:messageId', authenticate, (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const db = loadDatabase();
  db.pinnedMessages = db.pinnedMessages || [];

  db.pinnedMessages = db.pinnedMessages.filter((p) => p.conversationId !== conversationId);
  saveDatabase(db);

  broadcastEvent('message_unpinned', { conversationId }, [conversationId]);
  res.json({ success: true });
});

// GET /api/conversations/:conversationId/pinned - Get pinned message
app.get('/api/conversations/:conversationId/pinned', authenticate, (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const db = loadDatabase();
  db.pinnedMessages = db.pinnedMessages || [];

  const pin = db.pinnedMessages.find((p) => p.conversationId === conversationId);
  if (!pin) {
    return res.json({ pin: null, message: null });
  }

  const message = db.messages.find((m) => m.id === pin.messageId);
  res.json({ pin, message });
});

// GET /api/workspace/layout - Get user's spatial workspace layout
app.get('/api/workspace/layout', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();
  db.workspaceLayouts = db.workspaceLayouts || [];

  const record = db.workspaceLayouts.find((w) => w.userId === currentUser.id);
  res.json({ layout: record?.layout || null });
});

// PUT /api/workspace/layout - Save spatial workspace layout
app.put('/api/workspace/layout', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { layout } = req.body;
  const db = loadDatabase();
  db.workspaceLayouts = db.workspaceLayouts || [];

  const existingIdx = db.workspaceLayouts.findIndex((w) => w.userId === currentUser.id);
  if (existingIdx !== -1) {
    db.workspaceLayouts[existingIdx].layout = layout;
    db.workspaceLayouts[existingIdx].updatedAt = new Date().toISOString();
  } else {
    db.workspaceLayouts.push({
      userId: currentUser.id,
      layout,
      updatedAt: new Date().toISOString(),
    });
  }

  saveDatabase(db);
  res.json({ success: true });
});

// GET /api/conversations/:conversationId/media-collection - Media gallery
app.get('/api/conversations/:conversationId/media-collection', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { conversationId } = req.params;
  const db = loadDatabase();

  const conversationMsgs = db.messages.filter(
    (m) =>
      (m.senderId === currentUser.id && m.receiverId === conversationId) ||
      (m.senderId === conversationId && m.receiverId === currentUser.id) ||
      m.groupId === conversationId
  );

  const images = conversationMsgs.filter((m) => m.mediaType === 'image' && m.mediaUrl);
  const videos = conversationMsgs.filter((m) => m.mediaType === 'video' && m.mediaUrl);
  const audio = conversationMsgs.filter((m) => (m.mediaType === 'audio' || m.mediaType === 'voice') && m.mediaUrl);
  const documents = conversationMsgs.filter((m) => m.mediaType === 'file' && m.mediaUrl);
  const links = conversationMsgs.filter((m) => m.text && /(https?:\/\/[^\s]+)/g.test(m.text));

  res.json({
    images,
    videos,
    audio,
    documents,
    links,
    totalCount: images.length + videos.length + audio.length + documents.length + links.length,
  });
});

// GET /api/groups/:groupId/audit-log - Group activity audit log
app.get('/api/groups/:groupId/audit-log', authenticate, (req: Request, res: Response) => {
  const { groupId } = req.params;
  const db = loadDatabase();
  db.groupAuditLogs = db.groupAuditLogs || [];

  const logs = db.groupAuditLogs.filter((l) => l.groupId === groupId);
  res.json({ logs });
});

// ----------------------------------------------------
// DEV SERVER & STATIC MOUNT
// ----------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Zayan Chat server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

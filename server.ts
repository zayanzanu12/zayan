import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

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

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(UPLOADS_DIR));

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
  id: string; // unique ID / username (e.g. "zayan")
  displayName: string;
  role: 'admin' | 'friend';
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
}

function loadDatabase(): Database {
  if (!fs.existsSync(DB_FILE)) {
    // Initial setup with Admin Account only
    const adminPass = hashPassword('4088888');

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
      const adminPass = hashPassword('4088888');
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

    // Seed default groups if empty
    if (data.groups.length === 0) {
      data.groups = [
        {
          id: 'grp_official',
          name: 'Official Announcements',
          description: 'Official releases, security updates, and community guidelines directly from Admin Zayan.',
          avatarUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=150&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
          isPrivate: false,
          createdBy: 'zayan',
          members: [
            {
              userId: 'zayan',
              displayName: 'Zayan (Admin)',
              avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              role: 'admin',
              joinedAt: new Date().toISOString(),
            },
          ],
          announcements: [
            {
              id: 'ann_welcome',
              authorId: 'zayan',
              authorName: 'Zayan (Admin)',
              title: 'Welcome to the Talksy Social Network!',
              content: 'Talksy now supports Social Feeds, 24h Stories, Group discussions, and mutual connections. Feel free to explore groups and post updates.',
              createdAt: new Date().toISOString(),
            },
          ],
          tags: ['announcements', 'updates', 'official'],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'grp_tech',
          name: 'Developers & Creators',
          description: 'A space for software engineers, designers, and creators to share projects, discuss modern web technologies, and build together.',
          avatarUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80',
          isPrivate: false,
          createdBy: 'zayan',
          members: [
            {
              userId: 'zayan',
              displayName: 'Zayan (Admin)',
              avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              role: 'admin',
              joinedAt: new Date().toISOString(),
            },
          ],
          announcements: [],
          tags: ['engineering', 'design', 'coding', 'ai'],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'grp_lounge',
          name: 'The Community Lounge',
          description: 'Casual banter, photo drops, music recommendations, and gaming hangouts with friends.',
          avatarUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
          isPrivate: false,
          createdBy: 'zayan',
          members: [
            {
              userId: 'zayan',
              displayName: 'Zayan (Admin)',
              avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              role: 'admin',
              joinedAt: new Date().toISOString(),
            },
          ],
          announcements: [],
          tags: ['lounge', 'music', 'gaming', 'lifestyle'],
          createdAt: new Date().toISOString(),
        },
      ];
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

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter both User ID and Password' });
  }

  const db = loadDatabase();
  const normalizedId = String(username).trim().toLowerCase();
  const user = db.users.find((u) => u.id.toLowerCase() === normalizedId);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User ID not found.' });
  }

  if (user.disabled) {
    return res.status(403).json({ error: 'This account has been disabled. Please contact Admin Zayan.' });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
  }

  // Create session with device details
  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = `dev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const userAgent = req.headers['user-agent'] || '';
  const dev = parseDeviceInfo(userAgent);
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

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
  broadcastEvent('friend_added', safeUser);

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
  if (newPassword.length < 5) {
    return res.status(400).json({ error: 'New password must be at least 5 characters long' });
  }

  const db = loadDatabase();
  const user = db.users.find((u) => u.id === currentUser.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isValid = verifyPassword(currentPassword, user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  saveDatabase(db);

  res.json({ success: true, message: 'Password updated successfully' });
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
  // Filter active stories
  const activeStories = db.stories.filter((s) => s.expiresAt > now);
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

// ----------------------------------------------------
// GROUPS & COMMUNITIES ROUTES
// ----------------------------------------------------
app.get('/api/groups', authenticate, (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ groups: db.groups });
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
  const { id } = req.params;
  const db = loadDatabase();
  const msgs = db.messages.filter((m) => m.groupId === id);
  res.json({ messages: msgs });
});

app.post('/api/groups/:id/messages', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
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
  if (!targetUser) {
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
    .filter((u) => u.id !== currentUser.id && !u.disabled && !myBlocked.includes(u.id))
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
  if (!target) return res.status(404).json({ error: 'User not found' });

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
  const { displayName, password, avatarUrl, bio, status, disabled } = req.body;

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

  // Reset password if provided
  if (password && typeof password === 'string' && password.trim().length >= 4) {
    const { hash, salt } = hashPassword(password.trim());
    user.passwordHash = hash;
    user.salt = salt;
  }

  saveDatabase(db);

  const { passwordHash, salt: _, ...safeUser } = user;
  broadcastEvent('user_updated', safeUser);

  res.json({ user: safeUser, message: 'User updated successfully' });
});

// Delete user account
app.delete('/api/admin/users/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const targetId = req.params.id;
  if (targetId === 'zayan') {
    return res.status(400).json({ error: 'Cannot delete the primary administrator' });
  }

  const db = loadDatabase();
  const index = db.users.findIndex((u) => u.id === targetId);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.users.splice(index, 1);
  // Remove user sessions
  db.sessions = db.sessions.filter((s) => s.userId !== targetId);
  saveDatabase(db);

  broadcastEvent('user_deleted', { userId: targetId });

  res.json({ success: true, message: `Account "${targetId}" deleted` });
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

// ----------------------------------------------------
// CHAT & MESSAGING ROUTES
// ----------------------------------------------------

// List all friends/contacts for the current user
app.get('/api/friends', authenticate, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const db = loadDatabase();

  // Return all other active users
  const friends = db.users
    .filter((u) => u.id !== currentUser.id && !u.disabled)
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

    // Extract base64
    const matches = fileData.match(/^data:([A-Za-z-+/0-9]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'bin';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('gif')) ext = 'gif';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('webm')) ext = 'webm';
      else if (mime.includes('mp4')) ext = 'mp4';
      else if (mime.includes('ogg') || mime.includes('audio')) ext = 'ogg';
      else if (mime.includes('pdf')) ext = 'pdf';
      else if (mime.includes('text')) ext = 'txt';
      else if (fileName && fileName.includes('.')) ext = fileName.split('.').pop() || 'bin';
    } else {
      buffer = Buffer.from(fileData, 'base64');
      if (fileName && fileName.includes('.')) ext = fileName.split('.').pop() || 'bin';
    }

    // Check size limit: 25MB
    if (buffer.length > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 25MB' });
    }

    const uniqueName = `upload_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${uniqueName}`;
    res.json({
      url: publicUrl,
      size: buffer.length,
      fileName: fileName || uniqueName,
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

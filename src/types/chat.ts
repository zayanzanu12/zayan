export interface User {
  id: string;
  displayName: string;
  role: 'admin' | 'friend';
  avatarUrl: string;
  coverUrl?: string;
  bio: string;
  status: string;
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
  lastSeen: string;
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string; // can be userId or groupId
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

export interface FriendContact extends User {
  unreadCount: number;
  lastMessage: Message | null;
  mutualFriendsCount?: number;
  isFriend?: boolean;
  isFollowing?: boolean;
  hasPendingRequest?: boolean;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUser?: User;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
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
  expiresAt: string; // 24 hours from creation
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

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  type: 'friend_request' | 'friend_accepted' | 'like' | 'comment' | 'mention' | 'group_invite' | 'group_announcement';
  title: string;
  body: string;
  targetId?: string; // e.g. postId, groupId
  read: boolean;
  createdAt: string;
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

export interface LinkedDevice {
  id: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'browser';
  browser: string;
  os: string;
  ip?: string;
  location?: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface PairingCodeResponse {
  code: string;
  qrPayload: string;
  expiresInSeconds: number;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: 'auth' | 'chat' | 'webrtc' | 'database' | 'system';
  message: string;
  details?: any;
}

export interface SystemDiagnostics {
  status: string;
  timestamp: string;
  system: {
    uptime: number;
    nodeVersion: string;
    memoryRssMb: string;
    memoryHeapUsedMb: string;
    platform: string;
  };
  database: {
    status: string;
    totalUsers: number;
    activeUsers: number;
    totalMessages: number;
    totalGroups: number;
    totalPosts: number;
    pendingReports: number;
  };
  realtime: {
    activeSSEClients: number;
    webrtcSignaling: string;
    ratchetE2EEStatus: string;
  };
  logs: SystemLogEntry[];
}


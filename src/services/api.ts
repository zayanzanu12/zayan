import {
  User,
  Message,
  FriendContact,
  Report,
  Reaction,
  LinkedDevice,
  PairingCodeResponse,
  Post,
  PostComment,
  Story,
  Group,
  GroupAnnouncement,
  FriendRequest,
  NotificationItem,
  SystemDiagnostics,
} from '../types/chat';

const TOKEN_KEY = 'zayan_chat_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// Request wrapper with auth headers
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  async register(username: string, displayName: string, password: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, displayName, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      removeStoredToken();
    }
  },

  async getMe(): Promise<User> {
    const data = await request<{ user: User }>('/api/auth/me');
    return data.user;
  },

  async updateProfile(updates: Partial<Pick<User, 'displayName' | 'bio' | 'status' | 'avatarUrl'>>): Promise<User> {
    const data = await request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async getRecoverInfo(): Promise<{ adminId: string; adminEmail: string; message: string }> {
    return request('/api/auth/recover-info');
  },

  // Linked Devices
  async getLinkedDevices(): Promise<LinkedDevice[]> {
    const res = await request<{ devices: LinkedDevice[] }>('/api/devices');
    return res.devices;
  },

  async unlinkDevice(id: string): Promise<{ success: boolean; isCurrent: boolean }> {
    return request<{ success: boolean; isCurrent: boolean }>(`/api/devices/${id}`, {
      method: 'DELETE',
    });
  },

  async unlinkAllOtherDevices(): Promise<{ success: boolean; count: number }> {
    return request<{ success: boolean; count: number }>('/api/devices/logout-all', {
      method: 'POST',
    });
  },

  async getPairingCode(): Promise<PairingCodeResponse> {
    return request<PairingCodeResponse>('/api/devices/pair-code', {
      method: 'POST',
    });
  },

  async confirmPairing(code: string, deviceName?: string): Promise<{ token: string; user: User }> {
    return request<{ token: string; user: User }>('/api/devices/pair-confirm', {
      method: 'POST',
      body: JSON.stringify({ code, deviceName }),
    });
  },

  async linkSimulatedDevice(preset: 'iphone' | 'macbook' | 'ipad' | 'windows' | 'android'): Promise<{ device: LinkedDevice }> {
    return request<{ device: LinkedDevice }>('/api/devices/link-simulated', {
      method: 'POST',
      body: JSON.stringify({ preset }),
    });
  },

  // Friends & Messaging
  async getFriends(): Promise<FriendContact[]> {
    const data = await request<{ friends: FriendContact[] }>('/api/friends');
    return data.friends;
  },

  async getMessages(otherUserId: string): Promise<Message[]> {
    const data = await request<{ messages: Message[] }>(`/api/messages/${encodeURIComponent(otherUserId)}`);
    return data.messages;
  },

  async sendMessage(payload: {
    receiverId: string;
    text?: string;
    mediaUrl?: string;
    mediaType?: Message['mediaType'];
    fileName?: string;
    fileSize?: number;
    voiceDuration?: number;
    replyToId?: string;
  }): Promise<Message> {
    const data = await request<{ message: Message }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.message;
  },

  async editMessage(messageId: string, text: string): Promise<Message> {
    const data = await request<{ message: Message }>(`/api/messages/${encodeURIComponent(messageId)}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
    return data.message;
  },

  async deleteMessage(messageId: string): Promise<void> {
    await request(`/api/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    });
  },

  async reactMessage(messageId: string, emoji: string): Promise<Reaction[]> {
    const data = await request<{ reactions: Reaction[] }>(`/api/messages/${encodeURIComponent(messageId)}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
    return data.reactions;
  },

  async markAsRead(otherUserId: string): Promise<void> {
    await request(`/api/messages/${encodeURIComponent(otherUserId)}/read`, {
      method: 'POST',
    });
  },

  async sendTyping(toUserId: string, isTyping: boolean): Promise<void> {
    await request('/api/presence/typing', {
      method: 'POST',
      body: JSON.stringify({ toUserId, isTyping }),
    });
  },

  async sendHeartbeat(): Promise<void> {
    await request('/api/presence/heartbeat', {
      method: 'POST',
    });
  },

  async reportMessage(messageId: string, reason: string): Promise<void> {
    await request('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ messageId, reason }),
    });
  },

  async uploadFile(fileData: string, fileName?: string, fileType?: string): Promise<{ url: string; size: number; fileName: string }> {
    return request('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ fileData, fileName, fileType }),
    });
  },

  // Admin
  async adminGetUsers(): Promise<User[]> {
    const data = await request<{ users: User[] }>('/api/admin/users');
    return data.users;
  },

  async adminCreateUser(params: {
    id: string;
    displayName: string;
    password: string;
    avatarUrl?: string;
    bio?: string;
    status?: string;
  }): Promise<User> {
    const data = await request<{ user: User }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return data.user;
  },

  async adminUpdateUser(id: string, updates: {
    displayName?: string;
    password?: string;
    avatarUrl?: string;
    bio?: string;
    status?: string;
    disabled?: boolean;
  }): Promise<User> {
    const data = await request<{ user: User }>(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.user;
  },

  async adminDeleteUser(id: string): Promise<void> {
    await request(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async adminGetReports(): Promise<Report[]> {
    const data = await request<{ reports: Report[] }>('/api/admin/reports');
    return data.reports;
  },

  async adminResolveReport(id: string): Promise<void> {
    await request(`/api/admin/reports/${encodeURIComponent(id)}/resolve`, {
      method: 'PUT',
    });
  },

  // Calling & WebRTC Signaling
  async getIceServers(): Promise<{ urls: string }[]> {
    const data = await request<{ iceServers: { urls: string }[] }>('/api/calls/ice-servers');
    return data.iceServers;
  },

  async initiateCall(receiverId: string, callType: 'voice' | 'video'): Promise<{ callId: string; callType: 'voice' | 'video'; receiverId: string; status: string }> {
    return request('/api/calls/initiate', {
      method: 'POST',
      body: JSON.stringify({ receiverId, callType }),
    });
  },

  async sendCallSignal(callId: string, toUserId: string, type: 'offer' | 'answer' | 'ice-candidate', signalData: any): Promise<void> {
    await request(`/api/calls/${encodeURIComponent(callId)}/signal`, {
      method: 'POST',
      body: JSON.stringify({ toUserId, type, signalData }),
    });
  },

  async acceptCall(callId: string): Promise<void> {
    await request(`/api/calls/${encodeURIComponent(callId)}/accept`, {
      method: 'POST',
    });
  },

  async rejectCall(callId: string, reason?: string): Promise<void> {
    await request(`/api/calls/${encodeURIComponent(callId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async endCall(callId: string, durationSeconds?: number): Promise<void> {
    await request(`/api/calls/${encodeURIComponent(callId)}/end`, {
      method: 'POST',
      body: JSON.stringify({ durationSeconds }),
    });
  },

  // ----------------------------------------------------
  // SOCIAL FEED & POSTS
  // ----------------------------------------------------
  async getPosts(filter?: { tag?: string; authorId?: string; savedOnly?: boolean }): Promise<Post[]> {
    const params = new URLSearchParams();
    if (filter?.tag) params.append('tag', filter.tag);
    if (filter?.authorId) params.append('authorId', filter.authorId);
    if (filter?.savedOnly) params.append('savedOnly', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await request<{ posts: Post[] }>(`/api/posts${qs}`);
    return data.posts;
  },

  async createPost(payload: {
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    tags?: string[];
  }): Promise<Post> {
    const data = await request<{ post: Post }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.post;
  },

  async likePost(postId: string): Promise<{ post: Post; liked: boolean }> {
    return request<{ post: Post; liked: boolean }>(`/api/posts/${encodeURIComponent(postId)}/like`, {
      method: 'POST',
    });
  },

  async commentPost(postId: string, text: string): Promise<{ post: Post; comment: PostComment }> {
    return request<{ post: Post; comment: PostComment }>(`/api/posts/${encodeURIComponent(postId)}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async savePost(postId: string): Promise<{ post: Post; isSaved: boolean }> {
    return request<{ post: Post; isSaved: boolean }>(`/api/posts/${encodeURIComponent(postId)}/save`, {
      method: 'POST',
    });
  },

  async deletePost(postId: string): Promise<void> {
    await request(`/api/posts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
    });
  },

  // ----------------------------------------------------
  // STORIES (24H EPHEMERAL)
  // ----------------------------------------------------
  async getStories(): Promise<Story[]> {
    const data = await request<{ stories: Story[] }>('/api/stories');
    return data.stories;
  },

  async createStory(payload: { mediaUrl?: string; text?: string; bgColor?: string }): Promise<Story> {
    const data = await request<{ story: Story }>('/api/stories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.story;
  },

  async viewStory(storyId: string): Promise<void> {
    await request(`/api/stories/${encodeURIComponent(storyId)}/view`, {
      method: 'POST',
    });
  },

  // ----------------------------------------------------
  // GROUPS & COMMUNITIES
  // ----------------------------------------------------
  async getGroups(): Promise<Group[]> {
    const data = await request<{ groups: Group[] }>('/api/groups');
    return data.groups;
  },

  async createGroup(payload: {
    name: string;
    description?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    isPrivate?: boolean;
    tags?: string[];
  }): Promise<Group> {
    const data = await request<{ group: Group }>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.group;
  },

  async joinGroup(groupId: string): Promise<{ group: Group; isMember: boolean }> {
    return request<{ group: Group; isMember: boolean }>(`/api/groups/${encodeURIComponent(groupId)}/join`, {
      method: 'POST',
    });
  },

  async leaveGroup(groupId: string): Promise<{ group: Group; isMember: boolean }> {
    return request<{ group: Group; isMember: boolean }>(`/api/groups/${encodeURIComponent(groupId)}/leave`, {
      method: 'POST',
    });
  },

  async postGroupAnnouncement(groupId: string, title: string, content: string): Promise<{ group: Group; announcement: GroupAnnouncement }> {
    return request<{ group: Group; announcement: GroupAnnouncement }>(`/api/groups/${encodeURIComponent(groupId)}/announcement`, {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  },

  async getGroupMessages(groupId: string): Promise<Message[]> {
    const data = await request<{ messages: Message[] }>(`/api/groups/${encodeURIComponent(groupId)}/messages`);
    return data.messages;
  },

  async sendGroupMessage(groupId: string, payload: {
    text?: string;
    mediaUrl?: string;
    mediaType?: Message['mediaType'];
    voiceDuration?: number;
  }): Promise<Message> {
    const data = await request<{ message: Message }>(`/api/groups/${encodeURIComponent(groupId)}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.message;
  },

  // ----------------------------------------------------
  // FRIENDS & SUGGESTIONS
  // ----------------------------------------------------
  async getFriendRequests(): Promise<{ incoming: (FriendRequest & { fromUser?: User })[]; outgoing: FriendRequest[] }> {
    return request<{ incoming: (FriendRequest & { fromUser?: User })[]; outgoing: FriendRequest[] }>('/api/friends/requests');
  },

  async sendFriendRequest(toUserId: string): Promise<{ request: FriendRequest }> {
    return request<{ request: FriendRequest }>('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ toUserId }),
    });
  },

  async acceptFriendRequest(requestId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/friends/request/${encodeURIComponent(requestId)}/accept`, {
      method: 'POST',
    });
  },

  async declineFriendRequest(requestId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/friends/request/${encodeURIComponent(requestId)}/decline`, {
      method: 'POST',
    });
  },

  async getFriendSuggestions(): Promise<FriendContact[]> {
    const data = await request<{ suggestions: FriendContact[] }>('/api/friends/suggestions');
    return data.suggestions;
  },

  async toggleFollow(userId: string): Promise<{ isFollowing: boolean; followersCount: number }> {
    return request<{ isFollowing: boolean; followersCount: number }>(`/api/friends/follow/${encodeURIComponent(userId)}`, {
      method: 'POST',
    });
  },

  async toggleBlock(userId: string): Promise<{ isBlocked: boolean; blockedUsers: string[] }> {
    return request<{ isBlocked: boolean; blockedUsers: string[] }>(`/api/friends/block/${encodeURIComponent(userId)}`, {
      method: 'POST',
    });
  },

  // ----------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------
  async getNotifications(): Promise<NotificationItem[]> {
    const data = await request<{ notifications: NotificationItem[] }>('/api/notifications');
    return data.notifications;
  },

  async markNotificationRead(id: string): Promise<void> {
    await request(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PUT',
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    await request('/api/notifications/read-all', {
      method: 'PUT',
    });
  },

  // ----------------------------------------------------
  // USER PROFILES, PRIVACY & 2FA
  // ----------------------------------------------------
  async getUserProfile(userId: string): Promise<{
    user: User;
    posts: Post[];
    mutualsCount: number;
    isFollowing: boolean;
  }> {
    return request<{
      user: User;
      posts: Post[];
      mutualsCount: number;
      isFollowing: boolean;
    }>(`/api/users/${encodeURIComponent(userId)}/profile`);
  },

  async updatePrivacySettings(settings: {
    profileVisibility?: 'public' | 'friends' | 'private';
    allowMessagesFrom?: 'everyone' | 'friends';
    showOnlineStatus?: boolean;
  }): Promise<{ privacySettings: NonNullable<User['privacySettings']> }> {
    return request<{ privacySettings: NonNullable<User['privacySettings']> }>('/api/user/privacy', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async toggle2FA(): Promise<{ twoFactorEnabled: boolean; backupCodes: string[] }> {
    return request<{ twoFactorEnabled: boolean; backupCodes: string[] }>('/api/user/2fa/toggle', {
      method: 'POST',
    });
  },

  // ----------------------------------------------------
  // INVITE CODES (ADMIN ZAYAN)
  // ----------------------------------------------------
  async adminGetInviteCodes(): Promise<{ code: string; createdBy: string; usedBy?: string; createdAt: string }[]> {
    const data = await request<{ inviteCodes: { code: string; createdBy: string; usedBy?: string; createdAt: string }[] }>('/api/admin/invite-codes');
    return data.inviteCodes;
  },

  async adminGenerateInviteCode(): Promise<{ code: string; createdBy: string; createdAt: string }> {
    const data = await request<{ inviteCode: { code: string; createdBy: string; createdAt: string } }>('/api/admin/invite-codes', {
      method: 'POST',
    });
    return data.inviteCode;
  },

  // ----------------------------------------------------
  // DIAGNOSTICS & SYSTEM LOGS (RESTRICTED ADMIN)
  // ----------------------------------------------------
  async adminGetDiagnostics(): Promise<SystemDiagnostics> {
    return request<SystemDiagnostics>('/api/admin/diagnostics');
  },
};



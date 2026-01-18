/**
 * Household / Family Mode Module
 * 
 * Manages household groups, member permissions, and activity logging.
 */

import type {
  Household,
  HouseholdMember,
  HouseholdInvite,
  HouseholdRole,
  ActivityLog,
} from "@shared/schema";
import { randomUUID } from "crypto";

// In-memory storage
const households: Map<string, Household> = new Map();
const members: Map<string, HouseholdMember> = new Map();
const invites: Map<string, HouseholdInvite> = new Map();
const activityLogs: ActivityLog[] = [];

// ============================================
// HOUSEHOLD MANAGEMENT
// ============================================

/**
 * Create a new household
 */
export function createHousehold(
  name: string,
  creatorId: string,
  creatorEmail: string,
  creatorName: string
): { household: Household; member: HouseholdMember } {
  const now = new Date().toISOString();
  
  const household: Household = {
    id: randomUUID(),
    name,
    createdBy: creatorId,
    createdAt: now,
    updatedAt: now,
  };
  
  households.set(household.id, household);
  
  // Add creator as owner
  const member: HouseholdMember = {
    id: randomUUID(),
    householdId: household.id,
    userId: creatorId,
    role: "owner",
    email: creatorEmail,
    displayName: creatorName,
    joinedAt: now,
    status: "active",
  };
  
  members.set(member.id, member);
  
  logActivity({
    householdId: household.id,
    userId: creatorId,
    userName: creatorName,
    action: "created",
    resourceType: "household",
    resourceId: household.id,
    details: `Created household "${name}"`,
  });
  
  return { household, member };
}

/**
 * Get all households for a user
 */
export function getUserHouseholds(userId: string): Household[] {
  const userMemberships = Array.from(members.values())
    .filter(m => m.userId === userId && m.status === "active");
  
  return userMemberships
    .map(m => households.get(m.householdId))
    .filter((h): h is Household => h !== undefined);
}

/**
 * Get household by ID
 */
export function getHousehold(id: string): Household | undefined {
  return households.get(id);
}

/**
 * Update household
 */
export function updateHousehold(
  id: string,
  name: string,
  userId: string
): Household | undefined {
  const household = households.get(id);
  if (!household) return undefined;
  
  // Check permission
  if (!hasPermission(id, userId, "editor")) return undefined;
  
  const updated: Household = {
    ...household,
    name,
    updatedAt: new Date().toISOString(),
  };
  
  households.set(id, updated);
  return updated;
}

/**
 * Delete household
 */
export function deleteHousehold(id: string, userId: string): boolean {
  const household = households.get(id);
  if (!household) return false;
  
  // Only owner can delete
  if (!hasPermission(id, userId, "owner")) return false;
  
  // Remove all members
  for (const [memberId, member] of members.entries()) {
    if (member.householdId === id) {
      members.delete(memberId);
    }
  }
  
  // Remove all invites
  for (const [inviteId, invite] of invites.entries()) {
    if (invite.householdId === id) {
      invites.delete(inviteId);
    }
  }
  
  return households.delete(id);
}

// ============================================
// MEMBER MANAGEMENT
// ============================================

/**
 * Get members of a household
 */
export function getHouseholdMembers(householdId: string): HouseholdMember[] {
  return Array.from(members.values())
    .filter(m => m.householdId === householdId)
    .sort((a, b) => {
      const roleOrder = { owner: 0, editor: 1, viewer: 2 };
      return roleOrder[a.role] - roleOrder[b.role];
    });
}

/**
 * Get member by user ID and household
 */
export function getMember(
  householdId: string,
  userId: string
): HouseholdMember | undefined {
  return Array.from(members.values())
    .find(m => m.householdId === householdId && m.userId === userId);
}

/**
 * Update member role
 */
export function updateMemberRole(
  memberId: string,
  newRole: HouseholdRole,
  actorId: string
): HouseholdMember | undefined {
  const member = members.get(memberId);
  if (!member) return undefined;
  
  // Only owner can change roles
  if (!hasPermission(member.householdId, actorId, "owner")) return undefined;
  
  // Cannot demote the only owner
  if (member.role === "owner") {
    const owners = getHouseholdMembers(member.householdId)
      .filter(m => m.role === "owner");
    if (owners.length <= 1) return undefined;
  }
  
  const updated: HouseholdMember = {
    ...member,
    role: newRole,
  };
  
  members.set(memberId, updated);
  return updated;
}

/**
 * Remove member from household
 */
export function removeMember(
  memberId: string,
  actorId: string
): boolean {
  const member = members.get(memberId);
  if (!member) return false;
  
  // Owner can remove anyone, members can remove themselves
  const isOwner = hasPermission(member.householdId, actorId, "owner");
  const isSelf = member.userId === actorId;
  
  if (!isOwner && !isSelf) return false;
  
  // Cannot remove the only owner
  if (member.role === "owner") {
    const owners = getHouseholdMembers(member.householdId)
      .filter(m => m.role === "owner");
    if (owners.length <= 1) return false;
  }
  
  return members.delete(memberId);
}

// ============================================
// INVITE SYSTEM
// ============================================

/**
 * Create an invite
 */
export function createInvite(
  householdId: string,
  email: string,
  role: HouseholdRole,
  invitedBy: string,
  inviterName: string
): HouseholdInvite | undefined {
  // Check permission
  if (!hasPermission(householdId, invitedBy, "owner")) return undefined;
  
  // Check if already a member
  const existingMember = Array.from(members.values())
    .find(m => m.householdId === householdId && m.email === email);
  if (existingMember) return undefined;
  
  // Check for existing pending invite
  const existingInvite = Array.from(invites.values())
    .find(i => i.householdId === householdId && i.email === email && i.status === "pending");
  if (existingInvite) return existingInvite;
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const invite: HouseholdInvite = {
    id: randomUUID(),
    householdId,
    email,
    role,
    invitedBy,
    expiresAt: expiresAt.toISOString(),
    status: "pending",
    createdAt: now.toISOString(),
  };
  
  invites.set(invite.id, invite);
  
  logActivity({
    householdId,
    userId: invitedBy,
    userName: inviterName,
    action: "invited",
    resourceType: "member",
    details: `Invited ${email} as ${role}`,
  });
  
  return invite;
}

/**
 * Get pending invites for a household
 */
export function getHouseholdInvites(householdId: string): HouseholdInvite[] {
  return Array.from(invites.values())
    .filter(i => i.householdId === householdId && i.status === "pending");
}

/**
 * Get invites for an email
 */
export function getInvitesForEmail(email: string): HouseholdInvite[] {
  return Array.from(invites.values())
    .filter(i => i.email === email && i.status === "pending");
}

/**
 * Accept an invite
 */
export function acceptInvite(
  inviteId: string,
  userId: string,
  displayName: string
): HouseholdMember | undefined {
  const invite = invites.get(inviteId);
  if (!invite || invite.status !== "pending") return undefined;
  
  // Check expiration
  if (new Date(invite.expiresAt) < new Date()) {
    invite.status = "expired";
    invites.set(inviteId, invite);
    return undefined;
  }
  
  const now = new Date().toISOString();
  
  const member: HouseholdMember = {
    id: randomUUID(),
    householdId: invite.householdId,
    userId,
    role: invite.role,
    email: invite.email,
    displayName,
    joinedAt: now,
    invitedBy: invite.invitedBy,
    status: "active",
  };
  
  members.set(member.id, member);
  
  invite.status = "accepted";
  invites.set(inviteId, invite);
  
  logActivity({
    householdId: invite.householdId,
    userId,
    userName: displayName,
    action: "joined",
    resourceType: "household",
    details: `Accepted invite and joined as ${invite.role}`,
  });
  
  return member;
}

/**
 * Decline an invite
 */
export function declineInvite(inviteId: string): boolean {
  const invite = invites.get(inviteId);
  if (!invite || invite.status !== "pending") return false;
  
  invite.status = "declined";
  invites.set(inviteId, invite);
  return true;
}

/**
 * Revoke an invite
 */
export function revokeInvite(inviteId: string, actorId: string): boolean {
  const invite = invites.get(inviteId);
  if (!invite) return false;
  
  if (!hasPermission(invite.householdId, actorId, "owner")) return false;
  
  return invites.delete(inviteId);
}

// ============================================
// PERMISSION CHECKING
// ============================================

/**
 * Check if user has required permission level
 */
export function hasPermission(
  householdId: string,
  userId: string,
  requiredRole: HouseholdRole
): boolean {
  const member = getMember(householdId, userId);
  if (!member || member.status !== "active") return false;
  
  const roleHierarchy: Record<HouseholdRole, number> = {
    owner: 3,
    editor: 2,
    viewer: 1,
  };
  
  return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
}

// ============================================
// ACTIVITY LOGGING
// ============================================

/**
 * Log an activity
 */
export function logActivity(data: Omit<ActivityLog, "id" | "timestamp">): void {
  const log: ActivityLog = {
    id: randomUUID(),
    ...data,
    timestamp: new Date().toISOString(),
  };
  
  activityLogs.unshift(log); // Add to beginning
  
  // Keep only last 1000 logs
  if (activityLogs.length > 1000) {
    activityLogs.pop();
  }
}

/**
 * Get activity logs for a household
 */
export function getHouseholdActivity(
  householdId: string,
  limit: number = 50
): ActivityLog[] {
  return activityLogs
    .filter(l => l.householdId === householdId)
    .slice(0, limit);
}

/**
 * Get activity logs for a user
 */
export function getUserActivity(
  userId: string,
  limit: number = 50
): ActivityLog[] {
  return activityLogs
    .filter(l => l.userId === userId)
    .slice(0, limit);
}

// ============================================
// DEMO DATA
// ============================================

function initDemoData() {
  // Create a demo household
  createHousehold(
    "Johnson Family",
    "user-1",
    "john@example.com",
    "John Johnson"
  );
}

initDemoData();

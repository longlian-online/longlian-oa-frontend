import { request } from "@/api/request";
import { getUserId } from "@/lib/session";
import type { JoinByInviteCodeDTO, InviteInfoVO } from "@/types/auth";
import type { OrganizationSimpleInfoVO, UpdateMyInfoDTO, UserInfoVO } from "@/types/user";

const USER_CACHE_TTL = 5 * 60 * 1000;
const USER_CACHE_PREFIX = "user-api-cache";

interface UserCacheEntry<T> {
  expiresAt: number;
  value: T;
}

const memoryCache = new Map<string, UserCacheEntry<unknown>>();
const currentUserRequests = new Map<string, Promise<UserInfoVO>>();
const userOrganizationRequests = new Map<string, Promise<OrganizationSimpleInfoVO[]>>();

function getCacheKey(resource: "profile" | "organizations"): string | null {
  const userId = getUserId();
  return userId ? `${USER_CACHE_PREFIX}:${userId}:${resource}` : null;
}

function readCache<T>(resource: "profile" | "organizations"): T | null {
  const cacheKey = getCacheKey(resource);
  if (!cacheKey) return null;

  const memoryEntry = memoryCache.get(cacheKey) as UserCacheEntry<T> | undefined;
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) return memoryEntry.value;
  memoryCache.delete(cacheKey);

  try {
    const rawEntry = window.sessionStorage.getItem(cacheKey);
    if (!rawEntry) return null;

    const sessionEntry = JSON.parse(rawEntry) as UserCacheEntry<T>;
    if (sessionEntry.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(cacheKey);
      return null;
    }

    memoryCache.set(cacheKey, sessionEntry as UserCacheEntry<unknown>);
    return sessionEntry.value;
  } catch {
    return null;
  }
}

function writeCache<T>(resource: "profile" | "organizations", value: T): void {
  const cacheKey = getCacheKey(resource);
  if (!cacheKey) return;

  const entry: UserCacheEntry<T> = {
    expiresAt: Date.now() + USER_CACHE_TTL,
    value,
  };
  memoryCache.set(cacheKey, entry as UserCacheEntry<unknown>);

  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // 存储空间不可用时仍保留当前页面的内存缓存。
  }
}

function invalidateCache(resource: "profile" | "organizations"): void {
  const cacheKey = getCacheKey(resource);
  if (!cacheKey) return;

  memoryCache.delete(cacheKey);
  try {
    window.sessionStorage.removeItem(cacheKey);
  } catch {
    // sessionStorage 不可用时无需额外处理。
  }
}

export function invalidateCurrentUserCache(): void {
  invalidateCache("profile");
}

export function invalidateUserOrganizationsCache(): void {
  invalidateCache("organizations");
}

export async function getCurrentUser(): Promise<UserInfoVO> {
  const cachedUser = readCache<UserInfoVO>("profile");
  if (cachedUser) return cachedUser;

  const requestKey = getCacheKey("profile") ?? "anonymous-profile";
  const existingRequest = currentUserRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const currentUserRequest = request<UserInfoVO>("/user/").then((user) => {
    writeCache("profile", user);
    return user;
  });
  currentUserRequests.set(requestKey, currentUserRequest);

  try {
    return await currentUserRequest;
  } finally {
    currentUserRequests.delete(requestKey);
  }
}

export async function getUserOrganizations(): Promise<OrganizationSimpleInfoVO[]> {
  const cachedOrganizations = readCache<OrganizationSimpleInfoVO[]>("organizations");
  if (cachedOrganizations) return cachedOrganizations;

  const requestKey = getCacheKey("organizations") ?? "anonymous-organizations";
  const existingRequest = userOrganizationRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const organizationRequest = request<OrganizationSimpleInfoVO[]>("/user/organizations").then(
    (organizations) => {
      writeCache("organizations", organizations);
      return organizations;
    },
  );
  userOrganizationRequests.set(requestKey, organizationRequest);

  try {
    return await organizationRequest;
  } finally {
    userOrganizationRequests.delete(requestKey);
  }
}

export async function updateMyInfo(dto: UpdateMyInfoDTO): Promise<void> {
  await request("/user/", {
    method: "PUT",
    body: JSON.stringify(dto),
  });
  invalidateCurrentUserCache();
}

export async function getInviteInfo(inviteCode: string): Promise<InviteInfoVO> {
  return request(
    `/user/register/join-organization/invite-info?inviteCode=${encodeURIComponent(inviteCode)}`,
    {
      auth: "none",
    },
  );
}

export async function joinOrganizationByInvite(dto: JoinByInviteCodeDTO): Promise<void> {
  await request("/user/organizations/join-by-invite", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  invalidateCurrentUserCache();
  invalidateUserOrganizationsCache();
}

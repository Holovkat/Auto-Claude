/**
 * Rate limit detection utility for Claude CLI/SDK calls.
 * Detects rate limit errors in stdout/stderr output and provides context.
 */

import { existsSync, readFileSync } from 'fs';
import { app } from 'electron';
import path from 'path';

import { getClaudeProfileManager } from './claude-profile-manager';

/**
 * Regex pattern to detect Claude Code rate limit messages
 * Matches: "Limit reached · resets Dec 17 at 6am (Europe/Oslo)"
 */
const RATE_LIMIT_PATTERN = /Limit reached\s*[·•]\s*resets\s+(.+?)(?:\s*$|\n)/im;

/**
 * Additional patterns that might indicate rate limiting
 */
const RATE_LIMIT_INDICATORS = [
  /rate\s*limit/i,
  /usage\s*limit/i,
  /limit\s*reached/i,
  /exceeded.*limit/i,
  /too\s*many\s*requests/i
];

/**
 * Result of rate limit detection
 */
export interface RateLimitDetectionResult {
  /** Whether a rate limit was detected */
  isRateLimited: boolean;
  /** The reset time string if detected (e.g., "Dec 17 at 6am (Europe/Oslo)") */
  resetTime?: string;
  /** Type of limit: 'session' (5-hour) or 'weekly' (7-day) */
  limitType?: 'session' | 'weekly';
  /** The profile ID that hit the limit (if known) */
  profileId?: string;
  /** Best alternative profile to switch to */
  suggestedProfile?: {
    id: string;
    name: string;
  };
  /** Original error message */
  originalError?: string;
}

/**
 * Classify rate limit type based on reset time string
 */
function classifyLimitType(resetTimeStr: string): 'session' | 'weekly' {
  // Weekly limits mention specific dates like "Dec 17" or "Nov 1"
  // Session limits are typically just times like "11:59pm"
  const hasDate = /[A-Za-z]{3}\s+\d+/i.test(resetTimeStr);
  const hasWeeklyIndicator = resetTimeStr.toLowerCase().includes('week');

  return (hasDate || hasWeeklyIndicator) ? 'weekly' : 'session';
}

/**
 * Detect rate limit from output (stdout + stderr combined)
 */
export function detectRateLimit(
  output: string,
  profileId?: string
): RateLimitDetectionResult {
  // Check for the primary rate limit pattern
  const match = output.match(RATE_LIMIT_PATTERN);

  if (match) {
    const resetTime = match[1].trim();
    const limitType = classifyLimitType(resetTime);

    // Record the rate limit event in the profile manager
    const profileManager = getClaudeProfileManager();
    const effectiveProfileId = profileId || profileManager.getActiveProfile().id;

    try {
      profileManager.recordRateLimitEvent(effectiveProfileId, resetTime);
    } catch (err) {
      console.error('[RateLimitDetector] Failed to record rate limit event:', err);
    }

    // Find best alternative profile
    const bestProfile = profileManager.getBestAvailableProfile(effectiveProfileId);

    return {
      isRateLimited: true,
      resetTime,
      limitType,
      profileId: effectiveProfileId,
      suggestedProfile: bestProfile ? {
        id: bestProfile.id,
        name: bestProfile.name
      } : undefined,
      originalError: output
    };
  }

  // Check for secondary rate limit indicators
  for (const pattern of RATE_LIMIT_INDICATORS) {
    if (pattern.test(output)) {
      const profileManager = getClaudeProfileManager();
      const effectiveProfileId = profileId || profileManager.getActiveProfile().id;
      const bestProfile = profileManager.getBestAvailableProfile(effectiveProfileId);

      return {
        isRateLimited: true,
        profileId: effectiveProfileId,
        suggestedProfile: bestProfile ? {
          id: bestProfile.id,
          name: bestProfile.name
        } : undefined,
        originalError: output
      };
    }
  }

  return { isRateLimited: false };
}

/**
 * Check if output contains rate limit error
 */
export function isRateLimitError(output: string): boolean {
  return detectRateLimit(output).isRateLimited;
}

/**
 * Extract reset time from rate limit message
 */
export function extractResetTime(output: string): string | null {
  const match = output.match(RATE_LIMIT_PATTERN);
  return match ? match[1].trim() : null;
}

/**
 * Get environment variables for a specific Claude profile.
 * Uses OAuth token (CLAUDE_CODE_OAUTH_TOKEN) if available, otherwise falls back to CLAUDE_CONFIG_DIR.
 * OAuth tokens are preferred as they provide instant, reliable profile switching.
 * Note: Tokens are decrypted automatically by the profile manager.
 */
export function getProfileEnv(profileId?: string): Record<string, string> {
  const profileManager = getClaudeProfileManager();
  const profile = profileId
    ? profileManager.getProfile(profileId)
    : profileManager.getActiveProfile();

  console.warn('[getProfileEnv] Active profile:', {
    profileId: profile?.id,
    profileName: profile?.name,
    email: profile?.email,
    isDefault: profile?.isDefault,
    hasOAuthToken: !!profile?.oauthToken,
    configDir: profile?.configDir
  });

  // Load global API keys for non-Claude models (ALWAYS load these, regardless of profile)
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  let globalSettings: any = {};
  
  console.warn('[getProfileEnv] Loading settings from:', settingsPath);
  console.warn('[getProfileEnv] Settings file exists:', existsSync(settingsPath));
  
  if (existsSync(settingsPath)) {
    try {
      const content = readFileSync(settingsPath, 'utf-8');
      globalSettings = JSON.parse(content);
      console.warn('[getProfileEnv] Loaded settings keys:', Object.keys(globalSettings));
      console.warn('[getProfileEnv] Has GLM key:', !!globalSettings.globalGLMApiKey);
      console.warn('[getProfileEnv] Has Gemini key:', !!globalSettings.globalGeminiApiKey);
      console.warn('[getProfileEnv] Has Zai URL:', !!globalSettings.globalZaiBaseUrl);
      console.warn('[getProfileEnv] Has Gemini URL:', !!globalSettings.globalGeminiBaseUrl);
      console.warn('[getProfileEnv] Has OpenAI URL:', !!globalSettings.globalOpenAIBaseUrl);
      console.warn('[getProfileEnv] Has Ollama URL:', !!globalSettings.globalOllamaBaseUrl);
    } catch (error) {
      console.warn('[getProfileEnv] Failed to load global settings:', error);
    }
  }

  const env: Record<string, string> = {};

  // Add GLM API key if configured (do this FIRST, before any profile checks)
  if (globalSettings.globalGLMApiKey) {
    env.ZAI_API_KEY = globalSettings.globalGLMApiKey;
    console.warn('[getProfileEnv] Added ZAI_API_KEY to environment');
  }

  // Add GLM/Z.ai base URL if configured
  if (globalSettings.globalZaiBaseUrl) {
    env.ZAI_BASE_URL = globalSettings.globalZaiBaseUrl;
    console.warn('[getProfileEnv] Added ZAI_BASE_URL to environment:', globalSettings.globalZaiBaseUrl);
  }

  // Add Gemini API key if configured (do this FIRST, before any profile checks)
  if (globalSettings.globalGeminiApiKey) {
    env.GEMINI_API_KEY = globalSettings.globalGeminiApiKey;
    console.warn('[getProfileEnv] Added GEMINI_API_KEY to environment');
  }

  // Add Gemini base URL if configured
  if (globalSettings.globalGeminiBaseUrl) {
    env.GEMINI_BASE_URL = globalSettings.globalGeminiBaseUrl;
    console.warn('[getProfileEnv] Added GEMINI_BASE_URL to environment:', globalSettings.globalGeminiBaseUrl);
  }

  // Add OpenAI base URL if configured
  if (globalSettings.globalOpenAIBaseUrl) {
    env.OPENAI_BASE_URL = globalSettings.globalOpenAIBaseUrl;
    console.warn('[getProfileEnv] Added OPENAI_BASE_URL to environment:', globalSettings.globalOpenAIBaseUrl);
  }

  // Add Ollama base URL if configured
  if (globalSettings.globalOllamaBaseUrl) {
    env.OLLAMA_BASE_URL = globalSettings.globalOllamaBaseUrl;
    console.warn('[getProfileEnv] Added OLLAMA_BASE_URL to environment:', globalSettings.globalOllamaBaseUrl);
  }

  // Add Custom CLI token if configured
  if (globalSettings.activeProvider === 'custom' && globalSettings.customCliTokenEnvName && globalSettings.customCliTokenValue) {
    env[globalSettings.customCliTokenEnvName] = globalSettings.customCliTokenValue;
    console.warn(`[getProfileEnv] Added custom CLI token to env: ${globalSettings.customCliTokenEnvName}`);
  }

  // If profile exists, handle Claude auth
  if (profile) {
    // Prefer OAuth token (instant switching, no browser auth needed)
    // Use profile manager to get decrypted token
    if (profile.oauthToken) {
      const decryptedToken = profileId
        ? profileManager.getProfileToken(profileId)
        : profileManager.getActiveProfileToken();

      if (decryptedToken) {
        console.warn('[getProfileEnv] Using OAuth token for profile:', profile.name);
        env.CLAUDE_CODE_OAUTH_TOKEN = decryptedToken;
      } else {
        console.warn('[getProfileEnv] Failed to decrypt token for profile:', profile.name);
      }
    }

    // Fallback: If default profile, no additional env vars needed
    if (profile.isDefault) {
      console.warn('[getProfileEnv] Using default profile');
      return env;
    }

    // Fallback: Use configDir for profiles without OAuth token (legacy)
    if (profile.configDir) {
      console.warn('[getProfileEnv] Using configDir fallback for profile:', profile.name);
      console.warn('[getProfileEnv] WARNING: Profile has no OAuth token. Run "claude setup-token" and save the token to enable instant switching.');
      env.CLAUDE_CONFIG_DIR = profile.configDir;
    }
  } else {
    console.warn('[getProfileEnv] No profile found, using global keys only');
  }

  return env;
}

/**
 * Get the active Claude profile ID
 */
export function getActiveProfileId(): string {
  return getClaudeProfileManager().getActiveProfile().id;
}

/**
 * Information about a rate limit event for the UI
 */
export interface SDKRateLimitInfo {
  /** Source of the rate limit (which feature hit it) */
  source: 'changelog' | 'task' | 'roadmap' | 'ideation' | 'title-generator' | 'other';
  /** Project ID if applicable */
  projectId?: string;
  /** Task ID if applicable */
  taskId?: string;
  /** The reset time string */
  resetTime?: string;
  /** Type of limit */
  limitType?: 'session' | 'weekly';
  /** Profile that hit the limit */
  profileId: string;
  /** Profile name for display */
  profileName?: string;
  /** Suggested alternative profile */
  suggestedProfile?: {
    id: string;
    name: string;
  };
  /** When detected */
  detectedAt: Date;
  /** Original error message */
  originalError?: string;

  // Auto-swap information
  /** Whether this rate limit was automatically handled via account swap */
  wasAutoSwapped?: boolean;
  /** Profile that was swapped to (if auto-swapped) */
  swappedToProfile?: {
    id: string;
    name: string;
  };
  /** Why the swap occurred: 'proactive' (before limit) or 'reactive' (after limit hit) */
  swapReason?: 'proactive' | 'reactive';
}

/**
 * Create SDK rate limit info object for emitting to UI
 */
export function createSDKRateLimitInfo(
  source: SDKRateLimitInfo['source'],
  detection: RateLimitDetectionResult,
  options?: {
    projectId?: string;
    taskId?: string;
  }
): SDKRateLimitInfo {
  const profileManager = getClaudeProfileManager();
  const profile = detection.profileId
    ? profileManager.getProfile(detection.profileId)
    : profileManager.getActiveProfile();

  return {
    source,
    projectId: options?.projectId,
    taskId: options?.taskId,
    resetTime: detection.resetTime,
    limitType: detection.limitType,
    profileId: detection.profileId || profileManager.getActiveProfile().id,
    profileName: profile?.name,
    suggestedProfile: detection.suggestedProfile,
    detectedAt: new Date(),
    originalError: detection.originalError
  };
}

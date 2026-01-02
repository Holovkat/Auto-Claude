/**
 * Model and agent profile constants
 * Claude models, thinking levels, memory backends, and agent profiles
 */

import type { AgentProfile } from '../types/settings';

// ============================================
// Available Models
// ============================================

export const AVAILABLE_MODELS = [
  { value: 'opus', label: 'Claude Opus 4.5' },
  { value: 'sonnet', label: 'Claude Sonnet 4.5' },
  { value: 'sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'haiku', label: 'Claude Haiku 4.5' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview)' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  // Z.ai / GLM Models
  { value: 'GLM-4.7', label: 'GLM-4.7 (Flagship)' },
  { value: 'GLM-4.6', label: 'GLM-4.6 (Z.ai)' },
  { value: 'GLM-4.6V', label: 'GLM-4.6V (Z.ai)' },
  { value: 'GLM-4.6V-Flash', label: 'GLM-4.6V Flash (Z.ai)' },
  { value: 'GLM-4.5', label: 'GLM-4.5 (ARC/Z.ai)' },
  { value: 'GLM-4.5-Air', label: 'GLM-4.5 Air (Z.ai)' },
  { value: 'glm-4-plus', label: 'GLM-4 Plus' },
  { value: 'glm-4-air', label: 'GLM-4 Air' },
  { value: 'glm-4-flash', label: 'GLM-4 Flash' },
  { value: 'glm-4v-plus', label: 'GLM-4V Plus' }
] as const;

// ============================================
// Thinking Levels
// ============================================

// Thinking levels for Claude model (budget token allocation)
export const THINKING_LEVELS = [
  { value: 'none', label: 'None', description: 'No extended thinking' },
  { value: 'low', label: 'Low', description: 'Brief consideration' },
  { value: 'medium', label: 'Medium', description: 'Moderate analysis' },
  { value: 'high', label: 'High', description: 'Deep thinking' },
  { value: 'ultrathink', label: 'Ultra Think', description: 'Maximum reasoning depth' }
] as const;

// ============================================
// Agent Profiles
// ============================================

// Default agent profiles for preset model/thinking configurations
export const DEFAULT_AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'complex',
    name: 'Complex Tasks',
    description: 'For intricate, multi-step implementations requiring deep analysis',
    model: 'opus',
    thinkingLevel: 'ultrathink',
    icon: 'Brain'
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Good balance of speed and quality for most tasks',
    model: 'sonnet',
    thinkingLevel: 'medium',
    icon: 'Scale'
  },
  {
    id: 'quick',
    name: 'Quick Edits',
    description: 'Fast iterations for simple changes and quick fixes',
    model: 'haiku',
    thinkingLevel: 'low',
    icon: 'Zap'
  },
  // GLM/Z.ai Profiles
  {
    id: 'glm-flagship',
    name: 'GLM-4.7 Flagship',
    description: 'High-performance model for complex tasks',
    model: 'GLM-4.7',
    thinkingLevel: 'high',
    icon: 'Sparkles'
  },
  {
    id: 'glm-vision',
    name: 'GLM-4.6V Vision',
    description: 'Vision-capable model for image analysis',
    model: 'GLM-4.6V',
    thinkingLevel: 'medium',
    icon: 'Eye'
  },
  {
    id: 'glm-balanced',
    name: 'GLM-4.5 Balanced',
    description: 'Good balance for most tasks',
    model: 'GLM-4.5',
    thinkingLevel: 'medium',
    icon: 'Scale'
  },
  {
    id: 'glm-quick',
    name: 'GLM-4.5 Air Quick',
    description: 'Fast model for quick iterations',
    model: 'GLM-4.5-Air',
    thinkingLevel: 'low',
    icon: 'Zap'
  },
  // Gemini Profiles
  {
    id: 'gemini-pro',
    name: 'Gemini 2.5 Pro',
    description: 'High-performance Google model',
    model: 'gemini-2.5-pro',
    thinkingLevel: 'high',
    icon: 'Sparkles'
  },
  {
    id: 'gemini-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast Google model for quick tasks',
    model: 'gemini-2.5-flash',
    thinkingLevel: 'low',
    icon: 'Bolt'
  }
];

// ============================================
// Memory Backends
// ============================================

export const MEMORY_BACKENDS = [
  { value: 'file', label: 'File-based (default)' },
  { value: 'graphiti', label: 'Graphiti (FalkorDB)' }
] as const;

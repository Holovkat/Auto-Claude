import type { BrowserWindow } from 'electron';
import path from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { IPC_CHANNELS, getSpecsDir, AUTO_BUILD_PATHS } from '../../shared/constants';
import type {
  SDKRateLimitInfo,
  Task,
  TaskStatus,
  Project,
  ImplementationPlan
} from '../../shared/types';
import { AgentManager } from '../agent';
import type { ProcessType, ExecutionProgressData } from '../agent';
import { titleGenerator } from '../title-generator';
import { fileWatcher } from '../file-watcher';
import { projectStore } from '../project-store';
import { notificationService } from '../notification-service';


/**
 * Register all agent-events-related IPC handlers
 */
export function registerAgenteventsHandlers(
  agentManager: AgentManager,
  getMainWindow: () => BrowserWindow | null
): void {
  // ============================================
  // Agent Manager Events → Renderer
  // ============================================

  agentManager.on('log', (taskId: string, log: string) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.TASK_LOG, taskId, log);
    }
  });

  agentManager.on('error', (taskId: string, error: string) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.TASK_ERROR, taskId, error);
    }
  });

  // Handle SDK rate limit events from agent manager
  agentManager.on('sdk-rate-limit', (rateLimitInfo: SDKRateLimitInfo) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.CLAUDE_SDK_RATE_LIMIT, rateLimitInfo);
    }
  });

  // Handle SDK rate limit events from title generator
  titleGenerator.on('sdk-rate-limit', (rateLimitInfo: SDKRateLimitInfo) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.CLAUDE_SDK_RATE_LIMIT, rateLimitInfo);
    }
  });

  agentManager.on('exit', (taskId: string, code: number | null, processType: ProcessType) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      // Stop file watcher
      fileWatcher.unwatch(taskId);

      // Determine new status based on process type and exit code
      let newStatus: TaskStatus | null = null;

      if (processType === 'task-execution' || processType === 'qa-process') {
        // If process succeeded, it's definitely ready for human review
        if (code === 0) {
          newStatus = 'human_review';
        } else {
          // If it failed, we should check the implementation plan to see how far it got
          // If the plan exists and is marked as complete, we can still move to human review
          // Otherwise, we keep it in the current status (which will appear as 'Stuck')
          newStatus = null; 
        }
      } else if (processType === 'spec-creation') {
        // Stay in backlog/planning
        console.warn(`[Task ${taskId}] Spec creation completed with code ${code}`);
        return;
      }

      // If newStatus is null, we don't want to force a transition
      // This allows the 'Stuck' detection to work correctly in the UI
      if (newStatus === null) {
        console.warn(`[Task ${taskId}] Process exited with code ${code}. Keeping current status.`);
        return;
      }

      // Find task and project for status persistence and notifications
      let task: Task | undefined;
      let project: Project | undefined;

      try {
        const projects = projectStore.getProjects();

        for (const p of projects) {
          const tasks = projectStore.getTasks(p.id);
          task = tasks.find((t) => t.id === taskId || t.specId === taskId);
          if (task) {
            project = p;
            break;
          }
        }

        // Persist status to disk so it survives hot reload
        // This is a backup in case the Python backend didn't sync properly
        if (task && project) {
          const specsBaseDir = getSpecsDir(project.autoBuildPath);
          const specDir = path.join(project.path, specsBaseDir, task.specId);
          const planPath = path.join(specDir, AUTO_BUILD_PATHS.IMPLEMENTATION_PLAN);

          if (existsSync(planPath)) {
            const planContent = readFileSync(planPath, 'utf-8');
            const plan = JSON.parse(planContent);

            // Only update if not already set to a "further along" status
            // (e.g., don't override 'done' with 'human_review')
            const currentStatus = plan.status;
            const shouldUpdate = !currentStatus ||
              currentStatus === 'in_progress' ||
              currentStatus === 'ai_review' ||
              currentStatus === 'backlog' ||
              currentStatus === 'pending';

            if (shouldUpdate) {
              plan.status = newStatus;
              plan.planStatus = 'review';
              plan.updated_at = new Date().toISOString();
              writeFileSync(planPath, JSON.stringify(plan, null, 2));
              console.warn(`[Task ${taskId}] Persisted status '${newStatus}' to implementation_plan.json`);
            }
          }
        }
      } catch (persistError) {
        console.error(`[Task ${taskId}] Failed to persist status:`, persistError);
      }

      // Send notifications based on task completion status
      if (task && project) {
        const taskTitle = task.title || task.specId;

        if (code === 0) {
          // Task completed successfully - ready for review
          notificationService.notifyReviewNeeded(taskTitle, project.id, taskId);
        } else {
          // Task failed
          notificationService.notifyTaskFailed(taskTitle, project.id, taskId);
        }
      }

      mainWindow.webContents.send(
        IPC_CHANNELS.TASK_STATUS_CHANGE,
        taskId,
        newStatus
      );
    }
  });

  agentManager.on('execution-progress', (taskId: string, progress: ExecutionProgressData) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.TASK_EXECUTION_PROGRESS, taskId, progress);

      // Auto-move task to AI Review when entering qa_review phase
      if (progress.phase === 'qa_review') {
        mainWindow.webContents.send(
          IPC_CHANNELS.TASK_STATUS_CHANGE,
          taskId,
          'ai_review'
        );
      }
    }
  });

  // ============================================
  // File Watcher Events → Renderer
  // ============================================

  fileWatcher.on('progress', (taskId: string, plan: ImplementationPlan) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.TASK_PROGRESS, taskId, plan);
    }
  });

  fileWatcher.on('error', (taskId: string, error: string) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.TASK_ERROR, taskId, error);
    }
  });
}

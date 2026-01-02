import { X, Sparkles, TerminalSquare, ChevronDown, Bot } from 'lucide-react';
import type { Task } from '../../../shared/types';
import type { TerminalStatus, AgentType } from '../../stores/terminal-store';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { STATUS_COLORS } from './types';
import { TerminalTitle } from './TerminalTitle';
import { TaskSelector } from './TaskSelector';

interface AgentConfig {
  id: AgentType;
  name: string;
  command: string;
  icon?: string;
  color: string;
}

export const AGENT_CONFIGS: AgentConfig[] = [
  { id: 'claude', name: 'Claude', command: 'claude', color: 'text-orange-400' },
  { id: 'droid', name: 'Droid', command: 'droid', color: 'text-blue-400' },
  { id: 'gemini', name: 'Gemini', command: 'gemini', color: 'text-purple-400' },
  { id: 'codex', name: 'Codex', command: 'codex', color: 'text-green-400' },
  { id: 'qwen', name: 'Qwen', command: 'qwen', color: 'text-cyan-400' },
  { id: 'cursor', name: 'Cursor', command: 'cursor-agent', color: 'text-pink-400' },
];

interface TerminalHeaderProps {
  terminalId: string;
  title: string;
  status: TerminalStatus;
  isClaudeMode: boolean;
  activeAgent?: AgentType;
  tasks: Task[];
  associatedTask?: Task;
  onClose: () => void;
  onInvokeClaude: () => void;
  onInvokeAgent?: (agent: AgentType) => void;
  onTitleChange: (newTitle: string) => void;
  onTaskSelect: (taskId: string) => void;
  onClearTask: () => void;
  onNewTaskClick?: () => void;
}

export function TerminalHeader({
  terminalId,
  title,
  status,
  isClaudeMode,
  activeAgent,
  tasks,
  associatedTask,
  onClose,
  onInvokeClaude,
  onInvokeAgent,
  onTitleChange,
  onTaskSelect,
  onClearTask,
  onNewTaskClick,
}: TerminalHeaderProps) {
  const backlogTasks = tasks.filter((t) => t.status === 'backlog');
  const currentAgentConfig = activeAgent 
    ? AGENT_CONFIGS.find(a => a.id === activeAgent) 
    : AGENT_CONFIGS[0]; // Default to Claude

  return (
    <div className="electron-no-drag flex h-9 items-center justify-between border-b border-border/50 bg-card/30 px-2">
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', STATUS_COLORS[status])} />
        <div className="flex items-center gap-1.5">
          <TerminalSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <TerminalTitle
            title={title}
            associatedTask={associatedTask}
            onTitleChange={onTitleChange}
          />
        </div>
        {isClaudeMode && currentAgentConfig && (
          <span className={cn(
            "flex items-center gap-1 text-[10px] font-medium bg-primary/10 px-1.5 py-0.5 rounded",
            currentAgentConfig.color
          )}>
            {activeAgent === 'claude' ? <Sparkles className="h-2.5 w-2.5" /> : <Bot className="h-2.5 w-2.5" />}
            {currentAgentConfig.name}
          </span>
        )}
        {isClaudeMode && (
          <TaskSelector
            terminalId={terminalId}
            backlogTasks={backlogTasks}
            associatedTask={associatedTask}
            onTaskSelect={onTaskSelect}
            onClearTask={onClearTask}
            onNewTaskClick={onNewTaskClick}
          />
        )}
      </div>
      <div className="flex items-center gap-1">
        {!isClaudeMode && status !== 'exited' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <Bot className="h-3 w-3" />
                Agent
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {AGENT_CONFIGS.map((agent) => (
                <DropdownMenuItem
                  key={agent.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (agent.id === 'claude') {
                      onInvokeClaude();
                    } else if (onInvokeAgent) {
                      onInvokeAgent(agent.id);
                    }
                  }}
                  className={cn("gap-2", agent.color)}
                >
                  {agent.id === 'claude' ? <Sparkles className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  {agent.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

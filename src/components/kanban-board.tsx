'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { Lead } from '@/types';

const STAGES = [
  'New',
  'Qualified',
  'Call_Scheduled',
  'Proposal_Sent',
  'Negotiation',
  'Won',
  'Lost',
];

interface KanbanBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onRefresh: () => void;
  csrfToken: string;
  onMutationError: (message: string | null) => void;
}

export function KanbanBoard({ leads, onLeadClick, onRefresh, csrfToken, onMutationError }: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage);
    return acc;
  }, {} as Record<string, Lead[]>);

  async function handleDrop(stage: string, leadId: string) {
    setDraggingId(null);

    if (!csrfToken) {
      onMutationError('Session is still initializing. Please wait a moment and try again.');
      return;
    }
    
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, csrfToken }),
      });

      if (response.ok) {
        onMutationError(null);
        onRefresh();
      } else {
        onMutationError(`Failed to update stage (${response.status}): ${await getErrorMessage(response)}`);
      }
    } catch (error) {
      onMutationError('Failed to update stage due to a network error.');
      console.error('Failed to update lead stage:', error);
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          leads={leadsByStage[stage] || []}
          onLeadClick={onLeadClick}
          onDrop={handleDrop}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
        />
      ))}
    </div>
  );
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === 'string' && data.error.length > 0) {
      return data.error;
    }
  } catch {
    // Ignore JSON parse errors and fall through.
  }

  return response.statusText || 'Unknown error';
}

interface KanbanColumnProps {
  stage: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDrop: (stage: string, leadId: string) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
}

function KanbanColumn({
  stage,
  leads,
  onLeadClick,
  onDrop,
  draggingId,
  setDraggingId,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  const stageColors: Record<string, { border: string; header: string; badge: string }> = {
    New: { 
      border: 'border-blue-500/30', 
      header: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      badge: 'bg-blue-500/20 text-blue-400'
    },
    Qualified: { 
      border: 'border-sky-500/30', 
      header: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
      badge: 'bg-sky-500/20 text-sky-500'
    },
    Call_Scheduled: { 
      border: 'border-amber-500/30', 
      header: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      badge: 'bg-amber-500/20 text-amber-400'
    },
    Proposal_Sent: { 
      border: 'border-pink-500/30', 
      header: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      badge: 'bg-pink-500/20 text-pink-400'
    },
    Negotiation: { 
      border: 'border-orange-500/30', 
      header: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      badge: 'bg-orange-500/20 text-orange-400'
    },
    Won: { 
      border: 'border-emerald-500/30', 
      header: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      badge: 'bg-emerald-500/20 text-emerald-400'
    },
    Lost: { 
      border: 'border-gray-500/30', 
      header: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
      badge: 'bg-gray-500/20 text-gray-400'
    },
  };

  const colors = stageColors[stage];

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(true);
  }

  function handleDragLeave() {
    setIsOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onDrop(stage, leadId);
    }
  }

  return (
    <div
      className={`min-w-[280px] max-w-[280px] flex-shrink-0 transition-colors ${
        isOver ? 'bg-primary/5' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`rounded-t-lg px-3 py-2.5 font-medium text-sm border ${colors.header} flex items-center justify-between`}
      >
        <span>{stage.replace('_', ' ')}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
          {leads.length}
        </span>
      </div>
      <div
        className={`bg-card/50 border-2 border-t-0 ${colors.border} rounded-b-lg p-2 min-h-[400px] space-y-2`}
      >
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick(lead)}
            onDragStart={() => setDraggingId(lead.id)}
            isDragging={draggingId === lead.id}
          />
        ))}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  lead: Lead;
  onClick: () => void;
  onDragStart: () => void;
  isDragging: boolean;
}

function KanbanCard({ lead, onClick, onDragStart, isDragging }: KanbanCardProps) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', lead.id);
    onDragStart();
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={`bg-card border border-border/50 rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <h4 className="font-medium text-sm text-foreground">{lead.name}</h4>
      {lead.company && (
        <p className="text-xs text-muted-foreground mt-1">{lead.company}</p>
      )}
      {lead.nextAction && (
        <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2">
          {lead.nextAction}
        </p>
      )}
      {lead.nextActionAt && (
        <p className="text-xs text-primary/70 mt-1">
          {format(new Date(lead.nextActionAt), 'MMM d, h:mm a')}
        </p>
      )}
      {lead.value && (
        <p className="mt-2 text-xs font-semibold text-emerald-400">
          ${lead.value.toLocaleString()}
        </p>
      )}
    </div>
  );
}

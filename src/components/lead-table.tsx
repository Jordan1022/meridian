'use client';

import { format } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import type { Lead } from '@/types';

type SortKey = 'name' | 'company' | 'stage' | 'value' | 'nextAction' | 'nextActionAt';
type SortOrder = 'asc' | 'desc';

interface LeadTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export function LeadTable({ leads, onLeadClick }: LeadTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('nextActionAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const sortedLeads = [...leads].sort((a, b) => {
    let comparison = 0;
    
    switch (sortKey) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'company':
        comparison = (a.company || '').localeCompare(b.company || '');
        break;
      case 'stage':
        comparison = a.stage.localeCompare(b.stage);
        break;
      case 'value':
        comparison = (a.value || 0) - (b.value || 0);
        break;
      case 'nextAction':
        comparison = (a.nextAction || '').localeCompare(b.nextAction || '');
        break;
      case 'nextActionAt':
        const aDate = a.nextActionAt ? new Date(a.nextActionAt).getTime() : Infinity;
        const bDate = b.nextActionAt ? new Date(b.nextActionAt).getTime() : Infinity;
        comparison = aDate - bDate;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  }

  const SortHeader = ({ label, sortKey: key }: { label: string; sortKey: SortKey }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => handleSort(key)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === key ? 'text-primary' : 'opacity-30'}`} />
      </div>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-border/50">
            <SortHeader label="Name" sortKey="name" />
            <SortHeader label="Company" sortKey="company" />
            <SortHeader label="Stage" sortKey="stage" />
            <SortHeader label="Value" sortKey="value" />
            <SortHeader label="Next Action" sortKey="nextAction" />
            <SortHeader label="Due Date" sortKey="nextActionAt" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {sortedLeads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onLeadClick(lead)}
              className="hover:bg-primary/5 cursor-pointer transition-colors group"
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{lead.name}</div>
                {lead.email && (
                  <div className="text-xs text-muted-foreground">{lead.email}</div>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm text-foreground/80">{lead.company || '-'}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <StageBadge stage={lead.stage} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm text-emerald-400 font-medium">
                  {lead.value ? `$${lead.value.toLocaleString()}` : '-'}
                </div>
              </td>
              <td className="px-4 py-3">
                {lead.nextAction ? (
                  <div>
                    <div className="text-sm text-foreground/80 line-clamp-1">{lead.nextAction}</div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground/50">-</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {lead.nextActionAt ? (
                  <div className="text-sm text-foreground/70">
                    {format(new Date(lead.nextActionAt), 'MMM d, yyyy')}
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(lead.nextActionAt), 'h:mm a')}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground/50">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sortedLeads.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No leads found. Click &quot;Add Lead&quot; to get started.
        </div>
      )}
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    New: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Qualified: 'bg-sky-500/20 text-sky-500 border-sky-500/30',
    Call_Scheduled: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Proposal_Sent: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    Negotiation: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Won: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Lost: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <span className={`inline-flex text-xs px-2 py-1 rounded-full border ${colors[stage] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
      {stage.replace('_', ' ')}
    </span>
  );
}

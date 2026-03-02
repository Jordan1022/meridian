'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { KanbanBoard } from './kanban-board';
import { LeadTable } from './lead-table';
import { LeadDrawer } from './lead-drawer';
import { Button } from '@/components/ui/button';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { LogOut, Grid3X3, Table as TableIcon, Plus, Clock, AlertCircle, Calendar, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Lead } from '@/types';
import { ThemeToggle } from '@/components/theme-toggle';

const STAGES = [
  'New',
  'Qualified',
  'Call_Scheduled',
  'Proposal_Sent',
  'Negotiation',
  'Won',
  'Lost',
];

export function Dashboard() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dueLeads, setDueLeads] = useState<Lead[]>([]);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [dueError, setDueError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [dueView, setDueView] = useState<'week' | 'month'>('week');
  const [dueOffset, setDueOffset] = useState(0);
  const [dueDateRange, setDueDateRange] = useState<{start: string; end: string} | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    fetchLeads();
    fetchDueLeads();
    fetchCsrfToken();
  }, []);

  useEffect(() => {
    fetchDueLeads();
  }, [dueView, dueOffset]);

  async function fetchCsrfToken() {
    try {
      const response = await fetch('/api/auth/me', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (response.ok) {
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  }

  async function fetchLeads() {
    try {
      const response = await fetch('/api/leads');
      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads);
        setLeadsError(null);
        return;
      }

      const message = await getErrorMessage(response);
      setLeads([]);
      setLeadsError(`Unable to load leads (${response.status}): ${message}`);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      setLeads([]);
      setLeadsError('Unable to load leads due to a network error.');
    }
  }

  async function fetchDueLeads() {
    try {
      const days = dueView === 'month' ? 30 : 7;
      const response = await fetch(`/api/due?days=${days}&offset=${dueOffset}`);
      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setDueLeads(data.leads);
        setDueDateRange({ start: data.startDate, end: data.endDate });
        setDueError(null);
        return;
      }

      const message = await getErrorMessage(response);
      setDueLeads([]);
      setDueDateRange(null);
      setDueError(`Unable to load due actions (${response.status}): ${message}`);
    } catch (error) {
      console.error('Failed to fetch due leads:', error);
      setDueLeads([]);
      setDueDateRange(null);
      setDueError('Unable to load due actions due to a network error.');
    }
  }

  function handlePrevPeriod() {
    const days = dueView === 'month' ? 30 : 7;
    setDueOffset(prev => prev - days);
  }

  function handleNextPeriod() {
    const days = dueView === 'month' ? 30 : 7;
    setDueOffset(prev => prev + days);
  }

  function handleResetToNow() {
    setDueOffset(0);
  }

  async function handleLogout() {
    try {
      await signOut({ redirect: false });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  function handleLeadClick(lead: Lead) {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  }

  function handleAddLead() {
    setSelectedLead(null);
    setIsDrawerOpen(true);
  }

  const overdueCount = dueLeads.filter(l => l.nextActionAt && isPast(new Date(l.nextActionAt)) && !isToday(new Date(l.nextActionAt))).length;
  const todayCount = dueLeads.filter(l => l.nextActionAt && isToday(new Date(l.nextActionAt))).length;
  const upcomingCount = dueLeads.length - overdueCount - todayCount;

  return (
    <div className="min-h-screen mission-control-bg">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-slate-600 flex items-center justify-center">
                  <Grid3X3 className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-slate-500 bg-clip-text text-transparent">
                  Meridian
                </h1>
              </div>
              <div className="hidden sm:flex gap-1 p-1 bg-secondary/50 rounded-lg">
                <Button
                  variant={view === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setView('kanban')}
                  className={view === 'kanban' ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''}
                >
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Kanban
                </Button>
                <Button
                  variant={view === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setView('table')}
                  className={view === 'table' ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''}
                >
                  <TableIcon className="w-4 h-4 mr-2" />
                  Table
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                onClick={handleAddLead}
                size="sm"
                className="bg-primary hover:bg-primary/90"
                disabled={!csrfToken}
                title={!csrfToken ? 'Loading session…' : undefined}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {(leadsError || dueError || mutationError) && (
          <section className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-300">Data sync issue</p>
                {leadsError && <p className="text-sm text-red-200 mt-1">{leadsError}</p>}
                {dueError && <p className="text-sm text-red-200 mt-1">{dueError}</p>}
                {mutationError && <p className="text-sm text-red-200 mt-1">{mutationError}</p>}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setMutationError(null);
                  fetchLeads();
                  fetchDueLeads();
                  fetchCsrfToken();
                }}
              >
                Retry
              </Button>
            </div>
          </section>
        )}

        {/* Due Panel */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Clock className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold">
                Due {dueDateRange ? `${format(new Date(dueDateRange.start), 'MMM d')} - ${format(new Date(dueDateRange.end), 'MMM d')}` : (dueView === 'month' ? 'This Month' : 'This Week')}
              </h2>
              <span className="text-xs text-muted-foreground">
                Subset of leads shown below
              </span>
              <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg ml-2">
                <Button
                  variant={dueView === 'week' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => { setDueView('week'); setDueOffset(0); }}
                  className={dueView === 'week' ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''}
                >
                  <CalendarDays className="w-3 h-3 mr-1.5" />
                  Week
                </Button>
                <Button
                  variant={dueView === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => { setDueView('month'); setDueOffset(0); }}
                  className={dueView === 'month' ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''}
                >
                  <Calendar className="w-3 h-3 mr-1.5" />
                  Month
                </Button>
              </div>
              {/* Prev/Next Navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevPeriod}
                  className="h-8 w-8"
                  title={`Previous ${dueView}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToNow}
                  className={dueOffset === 0 ? 'text-muted-foreground' : 'text-primary'}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextPeriod}
                  className="h-8 w-8"
                  title={`Next ${dueView}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 ml-4">
                {overdueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {overdueCount} Overdue
                  </span>
                )}
                {todayCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                    {todayCount} Today
                  </span>
                )}
                {upcomingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                    {upcomingCount} Upcoming
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {dueLeads.length === 0 ? (
            <div className="bg-card/30 border border-border/50 rounded-xl p-8 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                No actions due this {dueView === 'month' ? 'month' : 'week'}. You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dueLeads.map((lead) => (
                <DueLeadCard 
                  key={lead.id} 
                  lead={lead} 
                  onClick={() => handleLeadClick(lead)} 
                />
              ))}
            </div>
          )}
        </section>

        {/* Pipeline Stats */}
        <section className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {STAGES.map((stage) => {
              const count = leads.filter(l => l.stage === stage).length;
              const totalValue = leads
                .filter(l => l.stage === stage && l.value)
                .reduce((sum, l) => sum + (l.value || 0), 0);
              
              return (
                <StageStatCard 
                  key={stage} 
                  stage={stage} 
                  count={count} 
                  totalValue={totalValue} 
                />
              );
            })}
          </div>
        </section>

        {/* Main View */}
        <section className="bg-card/30 border border-border/50 rounded-xl p-4">
          {view === 'kanban' ? (
            <KanbanBoard
              leads={leads}
              onLeadClick={handleLeadClick}
              onRefresh={fetchLeads}
              csrfToken={csrfToken}
              onMutationError={setMutationError}
            />
          ) : (
            <LeadTable leads={leads} onLeadClick={handleLeadClick} />
          )}
        </section>
      </main>

      {/* Lead Drawer */}
      <LeadDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={() => {
          fetchLeads();
          fetchDueLeads();
        }}
        csrfToken={csrfToken}
        onMutationError={setMutationError}
      />
    </div>
  );
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === 'string' && data.error.length > 0) {
      return data.error;
    }
    if (typeof data?.details === 'string' && data.details.length > 0) {
      return data.details;
    }
  } catch {
    // Ignore non-JSON responses and fall back to status text.
  }

  return response.statusText || 'Unknown error';
}

function DueLeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const isOverdue = lead.nextActionAt && isPast(new Date(lead.nextActionAt)) && !isToday(new Date(lead.nextActionAt));
  const isDueToday = lead.nextActionAt && isToday(new Date(lead.nextActionAt));
  const isDueTomorrow = lead.nextActionAt && isTomorrow(new Date(lead.nextActionAt));

  let urgencyClass = 'border-border/50';
  let dateClass = 'text-muted-foreground';
  
  if (isOverdue) {
    urgencyClass = 'border-red-500/50 bg-red-500/5';
    dateClass = 'text-red-400';
  } else if (isDueToday) {
    urgencyClass = 'border-amber-500/50 bg-amber-500/5';
    dateClass = 'text-amber-400';
  } else if (isDueTomorrow) {
    urgencyClass = 'border-blue-500/50 bg-blue-500/5';
    dateClass = 'text-blue-400';
  }

  return (
    <div
      onClick={onClick}
      className={`bg-card border ${urgencyClass} rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all group`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{lead.name}</h3>
          {lead.company && (
            <p className="text-sm text-muted-foreground">{lead.company}</p>
          )}
        </div>
        <StageBadge stage={lead.stage} />
      </div>
      {lead.nextAction && (
        <div className="mt-3">
          <p className="text-sm text-foreground/80 line-clamp-2">{lead.nextAction}</p>
          {lead.nextActionAt && (
            <p className={`text-xs mt-1 font-medium ${dateClass}`}>
              {isDueToday ? 'Today' : isDueTomorrow ? 'Tomorrow' : format(new Date(lead.nextActionAt), 'MMM d, yyyy')}
              {' · '}
              {format(new Date(lead.nextActionAt), 'h:mm a')}
            </p>
          )}
        </div>
      )}
      {lead.value && (
        <p className="mt-3 text-sm font-semibold text-emerald-400">
          ${lead.value.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function StageStatCard({ stage, count, totalValue }: { stage: string; count: number; totalValue: number }) {
  const stageColors: Record<string, { bg: string; border: string; text: string }> = {
    New: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    Qualified: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-500' },
    Call_Scheduled: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    Proposal_Sent: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
    Negotiation: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    Won: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    Lost: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' },
  };

  const colors = stageColors[stage];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 text-center`}>
      <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{stage.replace('_', ' ')}</p>
      {totalValue > 0 && (
        <p className="text-xs text-foreground/60 mt-1">${(totalValue / 1000).toFixed(0)}k</p>
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
    <span className={`text-xs px-2 py-1 rounded-full border ${colors[stage] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
      {stage.replace('_', ' ')}
    </span>
  );
}

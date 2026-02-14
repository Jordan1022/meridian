'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit2, Save, X, Plus, History, User, Building2, Mail, Tag, DollarSign, FileText, Calendar, CheckCircle2 } from 'lucide-react';
import type { Lead, Touch } from '@/types';

interface LeadDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  csrfToken: string;
}

const STAGES = ['New', 'Qualified', 'Call_Scheduled', 'Proposal_Sent', 'Negotiation', 'Won', 'Lost'];
const CHANNELS = ['email', 'call', 'text', 'dm', 'meeting', 'other'];

const CHANNEL_ICONS: Record<string, string> = {
  email: '✉️',
  call: '📞',
  text: '💬',
  dm: '📱',
  meeting: '🤝',
  other: '📝',
};

export function LeadDrawer({ lead, isOpen, onClose, onRefresh, csrfToken }: LeadDrawerProps) {
  const [touches, setTouches] = useState<Touch[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewLead, setIsNewLead] = useState(false);
  const [isAddingTouch, setIsAddingTouch] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    source: '',
    stage: 'New',
    value: '',
    notes: '',
    nextAction: '',
    nextActionAt: '',
  });

  const [touchForm, setTouchForm] = useState({
    channel: 'email',
    summary: '',
    nextAction: '',
    nextActionAt: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        email: lead.email || '',
        company: lead.company || '',
        source: lead.source || '',
        stage: lead.stage,
        value: lead.value?.toString() || '',
        notes: lead.notes || '',
        nextAction: lead.nextAction || '',
        nextActionAt: lead.nextActionAt ? lead.nextActionAt.slice(0, 16) : '',
      });
      setIsNewLead(false);
      fetchTouches();
    } else if (isOpen) {
      // New lead mode
      setFormData({
        name: '',
        email: '',
        company: '',
        source: '',
        stage: 'New',
        value: '',
        notes: '',
        nextAction: '',
        nextActionAt: '',
      });
      setIsNewLead(true);
      setTouches([]);
    }
  }, [lead, isOpen]);

  async function fetchTouches() {
    if (!lead) return;
    try {
      const response = await fetch(`/api/leads/${lead.id}`);
      if (response.ok) {
        const data = await response.json();
        setTouches(data.lead.touches || []);
      }
    } catch (error) {
      console.error('Failed to fetch touches:', error);
    }
  }

  async function handleSave() {
    try {
      if (isNewLead) {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            value: formData.value ? parseInt(formData.value) : null,
            nextActionAt: formData.nextActionAt || null,
            csrfToken,
          }),
        });

        if (response.ok) {
          onRefresh();
          onClose();
        }
      } else if (lead) {
        const response = await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            value: formData.value ? parseInt(formData.value) : null,
            nextActionAt: formData.nextActionAt || null,
            csrfToken,
          }),
        });

        if (response.ok) {
          onRefresh();
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Failed to save lead:', error);
    }
  }

  async function handleAddTouch() {
    if (!lead) return;

    try {
      const response = await fetch(`/api/leads/${lead.id}/touches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: touchForm.channel,
          summary: touchForm.summary,
          nextAction: touchForm.nextAction || null,
          nextActionAt: touchForm.nextActionAt || null,
          csrfToken,
        }),
      });

      if (response.ok) {
        setTouchForm({ channel: 'email', summary: '', nextAction: '', nextActionAt: '' });
        setIsAddingTouch(false);
        fetchTouches();
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to add touch:', error);
    }
  }

  const stageColors: Record<string, string> = {
    New: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Qualified: 'bg-sky-500/20 text-sky-500 border-sky-500/30',
    Call_Scheduled: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Proposal_Sent: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    Negotiation: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Won: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Lost: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-foreground">
              {isNewLead ? 'Add New Lead' : isEditing ? 'Edit Lead' : lead?.name}
            </DialogTitle>
            {!isNewLead && !isEditing && lead && (
              <span className={`text-xs px-3 py-1 rounded-full border ${stageColors[lead.stage]}`}>
                {lead.stage.replace('_', ' ')}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Lead Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField icon={<User className="w-4 h-4" />} label="Name">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing && !isNewLead}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  placeholder="Lead name"
                />
              </FormField>
              <FormField icon={<Mail className="w-4 h-4" />} label="Email">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing && !isNewLead}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  placeholder="email@example.com"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField icon={<Building2 className="w-4 h-4" />} label="Company">
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  disabled={!isEditing && !isNewLead}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  placeholder="Company name"
                />
              </FormField>
              <FormField icon={<Tag className="w-4 h-4" />} label="Source">
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  disabled={!isEditing && !isNewLead}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  placeholder="e.g. Referral, LinkedIn"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField icon={<CheckCircle2 className="w-4 h-4" />} label="Stage">
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                  disabled={!isEditing && !isNewLead}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage} className="text-foreground">
                        {stage.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField icon={<DollarSign className="w-4 h-4" />} label="Value ($)">
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  disabled={!isEditing && !isNewLead}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  placeholder="0"
                />
              </FormField>
            </div>

            <FormField icon={<FileText className="w-4 h-4" />} label="Notes">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={!isEditing && !isNewLead}
                rows={3}
                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 resize-none"
                placeholder="Additional notes..."
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField icon={<Calendar className="w-4 h-4" />} label="Next Action">
                <input
                  type="text"
                  value={formData.nextAction}
                  onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                  disabled={!isEditing && !isNewLead}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  placeholder="What needs to be done?"
                />
              </FormField>
              <FormField icon={<Calendar className="w-4 h-4" />} label="Due Date">
                <input
                  type="datetime-local"
                  value={formData.nextActionAt}
                  onChange={(e) => setFormData({ ...formData, nextActionAt: e.target.value })}
                  disabled={!isEditing && !isNewLead}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                />
              </FormField>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            {isNewLead ? (
              <>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Lead
                </Button>
              </>
            ) : isEditing ? (
              <>
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={onClose}>Close</Button>
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Lead
                </Button>
              </>
            )}
          </div>

          {/* Touch History (only for existing leads) */}
          {!isNewLead && (
            <div className="border-t border-border/50 pt-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium text-foreground">Touch History</h3>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {touches.length}
                  </span>
                </div>
                <Button
                  variant={isAddingTouch ? "ghost" : "outline"}
                  size="sm"
                  onClick={() => setIsAddingTouch(!isAddingTouch)}
                >
                  {isAddingTouch ? (
                    <><X className="w-4 h-4 mr-2" />Cancel</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" />Add Touch</>
                  )}
                </Button>
              </div>

              {isAddingTouch && (
                <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 mb-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Channel</label>
                    <Select
                      value={touchForm.channel}
                      onValueChange={(value) => setTouchForm({ ...touchForm, channel: value })}
                    >
                      <SelectTrigger className="bg-secondary/50 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {CHANNELS.map((channel) => (
                          <SelectItem key={channel} value={channel} className="text-foreground">
                            {CHANNEL_ICONS[channel]} {channel.charAt(0).toUpperCase() + channel.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Summary</label>
                    <textarea
                      value={touchForm.summary}
                      onChange={(e) => setTouchForm({ ...touchForm, summary: e.target.value })}
                      rows={3}
                      className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="What happened?"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Next Action (optional)</label>
                      <input
                        type="text"
                        value={touchForm.nextAction}
                        onChange={(e) => setTouchForm({ ...touchForm, nextAction: e.target.value })}
                        className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Follow-up task"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Due Date (optional)</label>
                      <input
                        type="datetime-local"
                        value={touchForm.nextActionAt}
                        onChange={(e) => setTouchForm({ ...touchForm, nextActionAt: e.target.value })}
                        className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddTouch} size="sm" className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Log Touch
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {touches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-lg">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No touches recorded yet.</p>
                  </div>
                ) : (
                  touches.map((touch) => (
                    <div key={touch.id} className="bg-secondary/20 border border-border/30 rounded-lg p-4 hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{CHANNEL_ICONS[touch.channel]}</span>
                          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                            {touch.channel}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(touch.createdAt), 'MMM d, yyyy · h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90">{touch.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

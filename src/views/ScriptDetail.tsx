import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  Loader2,
  UploadCloud,
  FileText,
  CheckCircle2,
  Film,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  Undo2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Bot,
  FileDown,
  AlertTriangle,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { CONTENT_STATUSES, type ContentItem, type ContentStatus } from '@/types';
import { saveUploadedFile } from '@/hooks/useFiles';
import { extractTextFromFile } from '@/lib/docx';
import {
  generateResearchBriefPrompt,
  generateScriptwriterHandoff,
  generateZeinityOutline,
  generateZeinityFullScript,
  formatExternalOutlinePrompt,
  formatExternalScriptingPrompt,
  calculateTargetWords,
  runSpokenAudit,
  runVisualCueAnnotation,
  generateThumbnailPrompt,
  generateAlternativeTitles,
  formatStructuredPrompt,
  type ProviderConfig,
} from '@/lib/gemini';
import { useAlert, parseAIError } from '@/components/AlertModal';
import { useTerminal } from '@/components/Terminal';

import {
  type DraftSnapshot,
  getDraftSnapshots as fetchDraftSnapshots,
  saveDraftSnapshot as persistDraftSnapshot,
} from '@/lib/draftSnapshots';

const DRAFT_HISTORY_PREFIX = 'zeinity_draft_history_';

export type { DraftSnapshot };

const getDraftSnapshots = fetchDraftSnapshots;
const saveDraftSnapshot = persistDraftSnapshot;

// eslint-disable-next-line react-refresh/only-export-components
export { DRAFT_HISTORY_PREFIX, getDraftSnapshots, saveDraftSnapshot };

interface ScriptDetailProps {
  item: ContentItem;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<ContentItem>) => Promise<ContentItem>;
  providerConfig: ProviderConfig;
  identityText: string;
  onNavigateSettings?: () => void;
}

const formatPromptText = formatStructuredPrompt;

export default function ScriptDetail({
  item,
  onBack,
  onUpdate,
  providerConfig,
  identityText,
  onNavigateSettings,
}: ScriptDetailProps) {
  const { showAlert, showError, showWarning } = useAlert();
  const { startActivity, addLog, finishActivity, errorActivity } = useTerminal();
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingResearch, setGeneratingResearch] = useState(false);
  const [generatingHandoff, setGeneratingHandoff] = useState(false);
  const [generatingAudit, setGeneratingAudit] = useState(false);
  const [generatingVisualCue, setGeneratingVisualCue] = useState(false);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [uploadedResearchFileName, setUploadedResearchFileName] = useState<string | null>(null);
  const [uploadedScriptFileName, setUploadedScriptFileName] = useState<string | null>(null);
  const [isDraggingResearch, setIsDraggingResearch] = useState(false);
  const [isDraggingScript, setIsDraggingScript] = useState(false);

  // Local state for textareas & prompts
  const [researchOutput, setResearchOutput] = useState(item.external_research_output || '');
  const [scriptOutput, setScriptOutput] = useState(item.external_script_output || '');
  const [researchBriefPrompt, setResearchBriefPrompt] = useState(item.research_brief_prompt || '');
  const [handoffPrompt, setHandoffPrompt] = useState(item.scriptwriter_brief_prompt || '');
  const [thumbnailPrompt, setThumbnailPrompt] = useState(item.generated_thumbnail_prompt || '');

  // AI Actions state
  const [auditFindings, setAuditFindings] = useState(item.audit_spoken_prompt || '');
  const [auditRevisedDraft, setAuditRevisedDraft] = useState('');
  const [showAuditResults, setShowAuditResults] = useState(Boolean(item.audit_spoken_prompt));

  const [annotatedScript, setAnnotatedScript] = useState(item.visual_cue_prompt || '');
  const [showVisualCueResults, setShowVisualCueResults] = useState(Boolean(item.visual_cue_prompt));

  // AI Summary Card state
  const [auditSummary, setAuditSummary] = useState<string | null>(null);
  const [visualCueSummary, setVisualCueSummary] = useState<string | null>(null);
  const [handoffSummary, setHandoffSummary] = useState<string | null>(null);

  // Apply to Draft feedback & Maximize state
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const [isDraftHighlighted, setIsDraftHighlighted] = useState(false);
  const [isScriptMaximized, setIsScriptMaximized] = useState(false);
  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save and persistence status
  const [researchSaveStatus, setResearchSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [scriptSaveStatus, setScriptSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');

  // Draft Versioning & Alternative Titles states
  const [draftHistory, setDraftHistory] = useState<DraftSnapshot[]>(() => getDraftSnapshots(item.id));
  const [showDraftHistoryModal, setShowDraftHistoryModal] = useState(false);
  const [titleA, setTitleA] = useState(item.generated_title_a || '');
  const [titleB, setTitleB] = useState(item.generated_title_b || '');
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [showTitleCard, setShowTitleCard] = useState(Boolean(item.generated_title_a || item.generated_title_b));
  const [isThumbnailScriptCollapsed, setIsThumbnailScriptCollapsed] = useState(false);

  // Pre-Flight & Dual-Track Scriptwriter state
  const [productionTrack, setProductionTrack] = useState<'in_app' | 'external'>(
    item.script_production_track || 'in_app'
  );
  const [targetDuration, setTargetDuration] = useState<string>(
    item.script_target_duration || '5-8m'
  );
  const [customMode, setCustomMode] = useState<'words' | 'minutes'>('words');
  const [customWordsInput, setCustomWordsInput] = useState<number>(
    item.script_target_words || 1400
  );
  const [customMinutesInput, setCustomMinutesInput] = useState<number>(9);
  const [angleNotes, setAngleNotes] = useState<string>(
    item.script_angle_notes || ''
  );
  const [outlineText, setOutlineText] = useState<string>(
    item.script_outline || ''
  );
  const previousOutlineRef = useRef<string | null>(null);
  const [isOutlineApproved, setIsOutlineApproved] = useState<boolean>(
    Boolean(item.script_outline_approved)
  );
  const [revisionNoteInput, setRevisionNoteInput] = useState<string>('');
  const [generatingOutline, setGeneratingOutline] = useState<boolean>(false);
  const [generatingFullScript, setGeneratingFullScript] = useState<boolean>(false);

  // Modals for Track Switch & Overwrite Guard
  const [showSwitchTrackModal, setShowSwitchTrackModal] = useState<boolean>(false);
  const [pendingTrack, setPendingTrack] = useState<'in_app' | 'external' | null>(null);
  const [showOverwriteDraftModal, setShowOverwriteDraftModal] = useState<boolean>(false);

  const lastSavedResearchRef = useRef<string>(item.external_research_output || '');
  const lastSavedScriptRef = useRef<string>(item.external_script_output || '');
  const lastSavedOutlineRef = useRef<string>(item.script_outline || '');
  const lastSavedAngleNotesRef = useRef<string>(item.script_angle_notes || '');
  const researchOutputRef = useRef<string>(researchOutput);
  researchOutputRef.current = researchOutput;
  const scriptOutputRef = useRef<string>(scriptOutput);
  scriptOutputRef.current = scriptOutput;
  const outlineTextRef = useRef<string>(outlineText);
  outlineTextRef.current = outlineText;
  const angleNotesRef = useRef<string>(angleNotes);
  angleNotesRef.current = angleNotes;
  const itemRef = useRef(item);
  itemRef.current = item;

  const currentItemIdRef = useRef(item.id);

  // Sync state if item changes or on initial load
  useEffect(() => {
    // If switching to a different content item, always reset to the new item's state to prevent state leakage
    if (currentItemIdRef.current !== item.id) {
      const prevId = currentItemIdRef.current;
      // Flush unsaved changes of previous item to prevent data loss
      if (researchOutputRef.current !== lastSavedResearchRef.current) {
        onUpdate(prevId, { external_research_output: researchOutputRef.current });
      }
      if (scriptOutputRef.current !== lastSavedScriptRef.current) {
        onUpdate(prevId, { external_script_output: scriptOutputRef.current });
      }
      if (outlineTextRef.current !== lastSavedOutlineRef.current) {
        onUpdate(prevId, { script_outline: outlineTextRef.current });
      }
      if (angleNotesRef.current !== lastSavedAngleNotesRef.current) {
        onUpdate(prevId, { script_angle_notes: angleNotesRef.current });
      }

      currentItemIdRef.current = item.id;
      setResearchOutput(item.external_research_output || '');
      setScriptOutput(item.external_script_output || '');
      lastSavedResearchRef.current = item.external_research_output || '';
      lastSavedScriptRef.current = item.external_script_output || '';
      lastSavedOutlineRef.current = item.script_outline || '';
      lastSavedAngleNotesRef.current = item.script_angle_notes || '';
      setResearchSaveStatus('idle');
      setScriptSaveStatus('idle');

      // Cleanly reset AI prompt & action outputs for the new item
      setResearchBriefPrompt(item.research_brief_prompt || '');
      setHandoffPrompt(item.scriptwriter_brief_prompt || '');
      setThumbnailPrompt(item.generated_thumbnail_prompt || '');

      setAuditFindings(item.audit_spoken_prompt || '');
      setAuditRevisedDraft('');
      setShowAuditResults(Boolean(item.audit_spoken_prompt));

      setAnnotatedScript(item.visual_cue_prompt || '');
      setShowVisualCueResults(Boolean(item.visual_cue_prompt));

      setAuditSummary(null);
      setVisualCueSummary(null);
      setHandoffSummary(null);
      setAppliedKey(null);
      setIsDraftHighlighted(false);
      setIsScriptMaximized(false);
      setUploadedResearchFileName(null);
      setUploadedScriptFileName(null);
      setGeneratingResearch(false);
      setGeneratingHandoff(false);
      setGeneratingAudit(false);
      setGeneratingVisualCue(false);
      setGeneratingThumbnail(false);
      setCopied(null);

      setTitleA(item.generated_title_a || '');
      setTitleB(item.generated_title_b || '');
      setShowTitleCard(Boolean(item.generated_title_a || item.generated_title_b));
      setDraftHistory(getDraftSnapshots(item.id));
      setShowDraftHistoryModal(false);
      setGeneratingTitles(false);
      setIsThumbnailScriptCollapsed(false);

      setProductionTrack(item.script_production_track || 'in_app');
      setTargetDuration(item.script_target_duration || '5-8m');
      setCustomWordsInput(item.script_target_words || 1400);
      setAngleNotes(item.script_angle_notes || '');
      setOutlineText(item.script_outline || '');
      previousOutlineRef.current = null;
      setIsOutlineApproved(Boolean(item.script_outline_approved));
      setRevisionNoteInput('');
      setGeneratingOutline(false);
      setGeneratingFullScript(false);
      setShowSwitchTrackModal(false);
      setShowOverwriteDraftModal(false);
      setPendingTrack(null);
      return;
    }

    // If on the same item, ONLY adopt external prop updates if user has NO local in-flight or unsaved edits
    if (
      item.external_script_output !== undefined &&
      item.external_script_output !== lastSavedScriptRef.current &&
      scriptOutputRef.current === lastSavedScriptRef.current
    ) {
      setScriptOutput(item.external_script_output || '');
      lastSavedScriptRef.current = item.external_script_output || '';
    }

    if (
      item.external_research_output !== undefined &&
      item.external_research_output !== lastSavedResearchRef.current &&
      researchOutputRef.current === lastSavedResearchRef.current
    ) {
      setResearchOutput(item.external_research_output || '');
      lastSavedResearchRef.current = item.external_research_output || '';
    }

    // Keep prompts in sync with parent updates for the current item
    if (item.research_brief_prompt !== undefined) {
      setResearchBriefPrompt(item.research_brief_prompt || '');
    }
    if (item.scriptwriter_brief_prompt !== undefined) {
      setHandoffPrompt(item.scriptwriter_brief_prompt || '');
    }
    if (item.generated_thumbnail_prompt !== undefined) {
      setThumbnailPrompt(item.generated_thumbnail_prompt || '');
    }
    if (item.audit_spoken_prompt !== undefined) {
      setAuditFindings(item.audit_spoken_prompt || '');
      setShowAuditResults(Boolean(item.audit_spoken_prompt));
    }
    if (item.visual_cue_prompt !== undefined) {
      setAnnotatedScript(item.visual_cue_prompt || '');
      setShowVisualCueResults(Boolean(item.visual_cue_prompt));
    }
    if (item.generated_title_a !== undefined) {
      setTitleA(item.generated_title_a || '');
    }
    if (item.generated_title_b !== undefined) {
      setTitleB(item.generated_title_b || '');
    }
    if (item.generated_title_a || item.generated_title_b) {
      setShowTitleCard(true);
    }
    if (
      item.script_outline !== undefined &&
      item.script_outline !== lastSavedOutlineRef.current &&
      outlineTextRef.current === lastSavedOutlineRef.current
    ) {
      setOutlineText(item.script_outline || '');
      lastSavedOutlineRef.current = item.script_outline || '';
    }
    if (item.script_outline_approved !== undefined) {
      setIsOutlineApproved(Boolean(item.script_outline_approved));
    }
    if (item.script_production_track !== undefined) {
      setProductionTrack(item.script_production_track || 'in_app');
    }
    if (item.script_target_duration !== undefined) {
      setTargetDuration(item.script_target_duration || '5-8m');
    }
    if (item.script_target_words !== undefined && item.script_target_words !== null) {
      setCustomWordsInput(item.script_target_words);
    }
    if (
      item.script_angle_notes !== undefined &&
      item.script_angle_notes !== lastSavedAngleNotesRef.current &&
      angleNotesRef.current === lastSavedAngleNotesRef.current
    ) {
      setAngleNotes(item.script_angle_notes || '');
      lastSavedAngleNotesRef.current = item.script_angle_notes || '';
    }
  }, [
    item.id,
    item.external_research_output,
    item.external_script_output,
    item.research_brief_prompt,
    item.scriptwriter_brief_prompt,
    item.generated_thumbnail_prompt,
    item.audit_spoken_prompt,
    item.visual_cue_prompt,
    item.generated_title_a,
    item.generated_title_b,
    item.script_outline,
    item.script_outline_approved,
    item.script_production_track,
    item.script_target_duration,
    item.script_target_words,
    item.script_angle_notes,
    onUpdate,
  ]);

  // Debounced auto-save for researchOutput (~900ms)
  useEffect(() => {
    if (researchOutput === lastSavedResearchRef.current) return;

    setResearchSaveStatus('unsaved');
    const timer = setTimeout(async () => {
      setResearchSaveStatus('saving');
      const textToSave = researchOutput;
      try {
        await onUpdate(item.id, { external_research_output: textToSave });
        lastSavedResearchRef.current = textToSave;
        if (researchOutputRef.current === textToSave) {
          setResearchSaveStatus('saved');
          setTimeout(() => {
            setResearchSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
          }, 2500);
        } else {
          setResearchSaveStatus('unsaved');
        }
      } catch (err) {
        console.error('Failed to auto-save research output:', err);
        setResearchSaveStatus('unsaved');
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [researchOutput, item.id, onUpdate]);

  // Debounced auto-save for scriptOutput (~900ms)
  useEffect(() => {
    if (scriptOutput === lastSavedScriptRef.current) return;

    setScriptSaveStatus('unsaved');
    const timer = setTimeout(async () => {
      setScriptSaveStatus('saving');
      const textToSave = scriptOutput;
      try {
        await onUpdate(item.id, { external_script_output: textToSave });
        lastSavedScriptRef.current = textToSave;
        if (scriptOutputRef.current === textToSave) {
          setScriptSaveStatus('saved');
          setTimeout(() => {
            setScriptSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
          }, 2500);
        } else {
          setScriptSaveStatus('unsaved');
        }
      } catch (err) {
        console.error('Failed to auto-save script output:', err);
        setScriptSaveStatus('unsaved');
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [scriptOutput, item.id, onUpdate]);

  // Debounced auto-save for outlineText (~900ms)
  useEffect(() => {
    if (outlineText === lastSavedOutlineRef.current) return;

    const timer = setTimeout(async () => {
      const textToSave = outlineText;
      try {
        await onUpdate(item.id, {
          script_outline: textToSave,
          script_outline_approved: isOutlineApproved,
        });
        lastSavedOutlineRef.current = textToSave;
      } catch (err) {
        console.error('Failed to auto-save outline:', err);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [outlineText, isOutlineApproved, item.id, onUpdate]);

  // Debounced auto-save for angleNotes (~900ms)
  useEffect(() => {
    if (angleNotes === lastSavedAngleNotesRef.current) return;

    const timer = setTimeout(async () => {
      const notesToSave = angleNotes;
      try {
        await onUpdate(item.id, { script_angle_notes: notesToSave });
        lastSavedAngleNotesRef.current = notesToSave;
      } catch (err) {
        console.error('Failed to auto-save angle notes:', err);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [angleNotes, item.id, onUpdate]);

  // Flush unsaved changes on unmount or before window unload
  useEffect(() => {
    const flushPending = () => {
      if (researchOutputRef.current !== lastSavedResearchRef.current) {
        onUpdate(itemRef.current.id, { external_research_output: researchOutputRef.current });
        lastSavedResearchRef.current = researchOutputRef.current;
      }
      if (scriptOutputRef.current !== lastSavedScriptRef.current) {
        onUpdate(itemRef.current.id, { external_script_output: scriptOutputRef.current });
        lastSavedScriptRef.current = scriptOutputRef.current;
      }
      if (outlineTextRef.current !== lastSavedOutlineRef.current) {
        onUpdate(itemRef.current.id, { script_outline: outlineTextRef.current });
        lastSavedOutlineRef.current = outlineTextRef.current;
      }
      if (angleNotesRef.current !== lastSavedAngleNotesRef.current) {
        onUpdate(itemRef.current.id, { script_angle_notes: angleNotesRef.current });
        lastSavedAngleNotesRef.current = angleNotesRef.current;
      }
    };

    window.addEventListener('beforeunload', flushPending);
    return () => {
      window.removeEventListener('beforeunload', flushPending);
      flushPending();
    };
  }, [onUpdate]);

  const renderSaveIndicator = (status: 'idle' | 'unsaved' | 'saving' | 'saved') => {
    const baseStyle = {
      fontSize: '0.75rem',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontWeight: 500,
      minWidth: '95px',
    };
    
    if (status === 'saving') {
      return (
        <span
          style={{
            ...baseStyle,
            color: 'var(--cyan, #38bdf8)',
          }}
          title="Menyimpan perubahan otomatis..."
        >
          <Loader2 size={12} className="animate-spin" />
          <span>Menyimpan...</span>
        </span>
      );
    }
    if (status === 'saved') {
      return (
        <span
          style={{
            ...baseStyle,
            color: '#10b981',
          }}
          title="Semua perubahan tersimpan ke database"
        >
          <Check size={12} />
          <span>Tersimpan</span>
        </span>
      );
    }
    if (status === 'unsaved') {
      return (
        <span
          style={{
            ...baseStyle,
            color: '#f59e0b',
          }}
          title="Mengetik draft baru..."
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              display: 'inline-block',
            }}
          />
          <span>Mengetik...</span>
        </span>
      );
    }
    return (
      <span style={{ ...baseStyle, visibility: 'hidden' }}>
        <Check size={12} />
        <span>Tersimpan</span>
      </span>
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isScriptMaximized) setIsScriptMaximized(false);
        if (showDraftHistoryModal) setShowDraftHistoryModal(false);
        if (showSwitchTrackModal) setShowSwitchTrackModal(false);
        if (showOverwriteDraftModal) setShowOverwriteDraftModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScriptMaximized, showDraftHistoryModal, showSwitchTrackModal, showOverwriteDraftModal]);

  const hasGeneratedScriptBrief = Boolean(
    (item.scriptwriter_brief_prompt && item.scriptwriter_brief_prompt.trim()) ||
    (handoffPrompt && handoffPrompt.trim())
  );

  const hasGeneratedThumbnail = Boolean(
    (item.generated_thumbnail_prompt && item.generated_thumbnail_prompt.trim()) ||
    (thumbnailPrompt && thumbnailPrompt.trim())
  );

  const isHandoffVisible = Boolean(
    item.status === 'Scripting' ||
    item.status === 'Thumbnailing' ||
    item.status === 'Published' ||
    hasGeneratedScriptBrief
  );

  // Dynamic collapse state: when Handoff is visible, Research Brief automatically shrinks into a compact rectangular card
  const [isResearchCollapsed, setIsResearchCollapsed] = useState<boolean>(() => isHandoffVisible);
  const [isHandoffCollapsed, setIsHandoffCollapsed] = useState<boolean>(false);
  const prevHandoffVisibleRef = useRef(isHandoffVisible);
  const prevItemIdRef = useRef(item.id);

  // Dynamic collapse states for Draft Studio (right column)
  const [isScriptInputCollapsed, setIsScriptInputCollapsed] = useState<boolean>(() => Boolean(item.audit_spoken_prompt || item.visual_cue_prompt));
  const [isAuditResultsCollapsed, setIsAuditResultsCollapsed] = useState<boolean>(false);
  const [isVisualCueResultsCollapsed, setIsVisualCueResultsCollapsed] = useState<boolean>(false);

  // Auto-collapse Research Brief when Scriptwriter Handoff is newly generated or appears
  useEffect(() => {
    if (!prevHandoffVisibleRef.current && isHandoffVisible) {
      setIsResearchCollapsed(true);
    }
    prevHandoffVisibleRef.current = isHandoffVisible;
  }, [isHandoffVisible]);

  // Sync state when switching to another content item
  useEffect(() => {
    if (prevItemIdRef.current !== item.id) {
      prevItemIdRef.current = item.id;
      setIsResearchCollapsed(isHandoffVisible);
      setIsHandoffCollapsed(false);
      setIsScriptInputCollapsed(Boolean(item.audit_spoken_prompt || item.visual_cue_prompt));
      setIsAuditResultsCollapsed(false);
      setIsVisualCueResultsCollapsed(false);
    }
  }, [item.id, isHandoffVisible, item.audit_spoken_prompt, item.visual_cue_prompt]);

  const copyText = (text: string, key: string) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
          fallbackCopyText(text);
        });
      } else {
        fallbackCopyText(text);
      }
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      fallbackCopyText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      // ignore
    }
  };

  const handleApplyToDraft = async (newText: string, key: string) => {
    if (!newText) return;

    // Save snapshot of current draft before overwriting with AI revision
    if (scriptOutput.trim()) {
      const label = key === 'audit' ? 'Sebelum Revisi AI Spoken Audit' : 'Sebelum Anotasi Visual Cue';
      const updatedHistory = saveDraftSnapshot(item.id, scriptOutput, label);
      setDraftHistory(updatedHistory);
    }

    // Expand the script input editor so user sees the newly applied text
    setIsScriptInputCollapsed(false);

    // Auto-collapse the source result card to direct user focus to editor
    if (key === 'audit') {
      setIsAuditResultsCollapsed(true);
    } else if (key === 'visual') {
      setIsVisualCueResultsCollapsed(true);
    }

    setScriptOutput(newText);
    lastSavedScriptRef.current = newText;
    setScriptSaveStatus('saved');
    await onUpdate(item.id, { external_script_output: newText });
    setAppliedKey(key);
    setIsDraftHighlighted(true);

    // Smooth scroll to script editor textarea
    if (scriptTextareaRef.current) {
      scriptTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        scriptTextareaRef.current?.focus();
      }, 450);
    }

    setTimeout(() => {
      setAppliedKey(null);
    }, 3500);

    setTimeout(() => {
      setIsDraftHighlighted(false);
    }, 2400);
  };

  const handleRestoreSnapshot = async (snapshot: DraftSnapshot) => {
    if (!snapshot?.content) return;
    if (scriptOutput.trim() && scriptOutput.trim() !== snapshot.content.trim()) {
      saveDraftSnapshot(item.id, scriptOutput, 'Sebelum Memulihkan Draf Lama');
    }

    setScriptOutput(snapshot.content);
    lastSavedScriptRef.current = snapshot.content;
    setScriptSaveStatus('saved');
    await onUpdate(item.id, { external_script_output: snapshot.content });
    setDraftHistory(getDraftSnapshots(item.id));
    setShowDraftHistoryModal(false);
    showAlert({
      type: 'success',
      title: 'Draf Berhasil Dipulihkan',
      message: `Draf "${snapshot.label}" (${snapshot.wordCount} kata) berhasil dipulihkan ke editor naskah.`,
    });
  };

  const handleUndoLatestAiRevision = async () => {
    if (draftHistory.length === 0) return;
    const target = draftHistory.find((s) => s.content.trim() !== scriptOutput.trim()) || draftHistory[0];
    if (target.content.trim() === scriptOutput.trim()) {
      showAlert({
        type: 'info',
        title: 'Draf Sudah Sesuai',
        message: 'Teks di editor naskah saat ini sudah sama dengan snapshot riwayat terakhir.',
      });
      return;
    }
    await handleRestoreSnapshot(target);
  };

  const handleMdFileUpload = async (file: File, isResearch = true) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = ['md', 'markdown', 'docx', 'txt'];
    if (!allowed.includes(ext)) {
      showWarning(
        'Format Berkas Tidak Sesuai',
        `Berkas "${file.name}" tidak dapat diproses. Sistem mendukung berkas berformat .docx (Word), .md (Markdown), atau .txt.`
      );
      return;
    }

    startActivity('File Processor Log', `Menerima berkas "${file.name}"...`);
    addLog(`Mengekstrak isi berkas (${ext.toUpperCase()})...`, 25);

    try {
      const extraction = await extractTextFromFile(file);
      const trimmed = extraction.text.trim();
      addLog(`Memuat ${trimmed.length.toLocaleString('id-ID')} karakter ke editor workspace...`, 55);

      if (isResearch) {
        setResearchOutput(trimmed);
        lastSavedResearchRef.current = trimmed;
        setResearchSaveStatus('saved');
        await onUpdate(item.id, { external_research_output: trimmed });
        setUploadedResearchFileName(file.name);
      } else {
        if (scriptOutput.trim()) {
          const updated = saveDraftSnapshot(item.id, scriptOutput, `Sebelum Upload Berkas (${file.name})`);
          setDraftHistory(updated);
        }
        setScriptOutput(trimmed);
        lastSavedScriptRef.current = trimmed;
        setScriptSaveStatus('saved');
        await onUpdate(item.id, { external_script_output: trimmed });
        setUploadedScriptFileName(file.name);
      }

      addLog('Membuat cadangan otomatis berkas...', 85);

      // Otomatis simpan sebagai backup permanen via saveUploadedFile (dengan fallback offline)
      try {
        await saveUploadedFile({
          filename: file.name,
          file_path: isResearch ? `/research_uploads/${file.name}` : `/script_uploads/${file.name}`,
          file_type: ext === 'docx' ? 'docx' : 'md',
          extracted_text: trimmed,
        });
      } catch (backupErr) {
        console.warn('Backup via saveUploadedFile error:', backupErr);
      }

      finishActivity(`Berkas "${file.name}" berhasil dimuat & di-backup (${trimmed.length.toLocaleString('id-ID')} karakter)!`);
    } catch (err: unknown) {
      errorActivity(`Berkas "${file.name}" tidak dapat dibaca.`);
      showError(
        'Gagal Membaca Berkas',
        `Berkas "${file.name}" tidak dapat diekstrak: ${err instanceof Error ? err.message : 'Pastikan berkas tidak rusak.'}`
      );
    }
  };

  const handleRegenerateResearchPrompt = async () => {
    if (!providerConfig.apiKey?.trim() && providerConfig.provider !== 'ollama') {
      showError(
        'Kunci API Belum Dikonfigurasi',
        `API Key untuk provider ${providerConfig.provider.toUpperCase()} belum diatur di menu Settings.`,
        {
          solution: 'Buka menu Settings dan masukkan API Key Anda, lalu klik Simpan.',
          actionButton: onNavigateSettings
            ? { label: 'Buka Settings', onClick: onNavigateSettings }
            : undefined,
        }
      );
      return;
    }

    setGeneratingResearch(true);
    startActivity('AI Research Brief Log', `Menghubungkan ke ${providerConfig.provider.toUpperCase()}...`);
    addLog('Menyusun ulang Research Brief Prompt berdasarkan identitas channel & 10 Narrative Assets...', 60);

    try {
      const res = await generateResearchBriefPrompt(
        providerConfig,
        item.title,
        item.category || 'Umum',
        identityText,
        item.research_text
      );
      setResearchBriefPrompt(res);
      await onUpdate(item.id, {
        research_brief_prompt: res,
        ai_output: 'Research Brief siap.',
      });
      finishActivity('Research Brief Prompt berhasil diperbarui!');
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal memperbarui Research Brief: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingResearch(false);
    }
  };

  const handleGenerateHandoff = async (advanceToScripting = false) => {
    if (!providerConfig.apiKey?.trim() && providerConfig.provider !== 'ollama') {
      showError(
        'Kunci API Belum Dikonfigurasi',
        `API Key untuk provider ${providerConfig.provider.toUpperCase()} belum diatur di menu Settings.`,
        {
          solution: 'Buka menu Settings dan masukkan API Key Anda, lalu klik Simpan.',
          actionButton: onNavigateSettings
            ? { label: 'Buka Settings', onClick: onNavigateSettings }
            : undefined,
        }
      );
      return;
    }
    if (!researchOutput.trim()) {
      showWarning(
        'Data Riset Masih Kosong',
        'Silakan masukkan hasil riset ke dalam kotak teks atau unggah file .md sebelum membuat Scriptwriter Handoff.'
      );
      return;
    }

    setGeneratingHandoff(true);
    setLoading(true);
    startActivity(
      'Scriptwriter Handoff Log',
      `Menghubungkan ke ${providerConfig.provider.toUpperCase()}...`
    );
    addLog(`Membaca data riset (${researchOutput.length.toLocaleString('id-ID')} karakter)...`, 30);
    addLog('Menyusun Kerangka 5 Tahap Zeinity berdasarkan riset aktual...', 60);
    addLog('Menggabungkan dengan panduan Spoken-First + TTS...', 85);

    try {
      await onUpdate(item.id, { external_research_output: researchOutput });

      const handoff = await generateScriptwriterHandoff(
        providerConfig,
        item.title,
        researchOutput,
        identityText
      );
      setHandoffPrompt(handoff);

      const sectionCount = (handoff.match(/##+ (HOOK|OBVIOUS|HIDDEN|COMPLICATION|SYNTHESIS)/gi) || []).length;
      setHandoffSummary(`Outline ${sectionCount || 5} Tahap Zeinity berhasil disusun berdasarkan riset aktual. Panduan Spoken-First & TTS terpadu.`);

      const updates: Partial<ContentItem> = {
        scriptwriter_brief_prompt: handoff,
        script_outline: null,
        ai_output: 'Scriptwriter Handoff siap.',
      };

      if (advanceToScripting) {
        updates.status = 'Scripting';
      }

      await onUpdate(item.id, updates);
      finishActivity('Scriptwriter Handoff berhasil dibuat dan disimpan!');
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal membuat Scriptwriter Handoff: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingHandoff(false);
      setLoading(false);
    }
  };

  const handleProceedToScripting = async () => {
    try {
      await onUpdate(item.id, {
        status: 'Scripting',
        external_research_output: researchOutput,
      });
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      showError(parsed.title, parsed.message);
    }
  };

  const handleStatusChange = async (newStatus: ContentStatus) => {
    if (newStatus === item.status) return;
    showAlert({
      type: 'warning',
      title: 'Konfirmasi Perubahan Status',
      message: `Yakin ingin mengembalikan status ke ${newStatus}? Perubahan ini tidak dapat dibatalkan secara otomatis.`,
      confirmText: 'Ya, Kembalikan Status',
      cancelText: 'Batal',
      onConfirm: async () => {
        try {
          startActivity('Pipeline Status Log', `Mengubah alur status pipeline dari "${item.status}" ke "${newStatus}"...`);
          addLog(`Sinkronisasi status pipeline "${newStatus}" ke database...`, 50);
          await onUpdate(item.id, {
            status: newStatus,
            ...(newStatus === 'Scripting' ? { external_research_output: researchOutput } : {}),
            ...(newStatus === 'Thumbnailing' ? { external_script_output: scriptOutput } : {}),
          });
          finishActivity(`Status pipeline berhasil diubah menjadi ${newStatus}!`);
        } catch (err: unknown) {
          const parsed = parseAIError(err);
          errorActivity(`Gagal mengubah status: ${parsed.title}`);
          showError(parsed.title, parsed.message);
        }
      }
    });
  };

  const handleRunAudit = async () => {
    if (!providerConfig.apiKey?.trim() && providerConfig.provider !== 'ollama') {
      showError(
        'Kunci API Belum Dikonfigurasi',
        `API Key untuk provider ${providerConfig.provider.toUpperCase()} belum diatur di menu Settings.`,
        {
          solution: 'Buka menu Settings dan masukkan API Key Anda, lalu klik Simpan.',
          actionButton: onNavigateSettings
            ? { label: 'Buka Settings', onClick: onNavigateSettings }
            : undefined,
        }
      );
      return;
    }
    if (!scriptOutput.trim()) {
      showWarning(
        'Draf Naskah Masih Kosong',
        'Silakan masukkan atau unggah draf naskah video sebelum menjalankan audit Spoken & TTS.'
      );
      return;
    }

    setGeneratingAudit(true);
    startActivity(
      'Audit Spoken & TTS Log',
      `Menghubungkan ke ${providerConfig.provider.toUpperCase()}...`
    );
    addLog(`Membaca draf naskah (${scriptOutput.length.toLocaleString('id-ID')} karakter)...`, 25);
    addLog('Menganalisis 4 dimensi: Struktur Kalimat, Prosodi TTS, Naturalitas Lisan, Larangan VO...', 60);
    addLog('Menyusun laporan temuan & menyiapkan draft revisi...', 85);

    try {
      await onUpdate(item.id, { external_script_output: scriptOutput });

      const result = await runSpokenAudit(providerConfig, item.title, scriptOutput);
      setAuditFindings(result.findings);
      setAuditRevisedDraft(result.revisedDraft);
      setShowAuditResults(true);
      setAuditSummary(result.summary);
      setIsScriptInputCollapsed(true);
      setIsAuditResultsCollapsed(false);
      setIsVisualCueResultsCollapsed(true);

      await onUpdate(item.id, {
        audit_spoken_prompt: result.findings,
        ai_output: 'Audit Spoken & TTS selesai.',
      });

      finishActivity(`Audit selesai! ${result.summary}`);

      showAlert({
        type: 'success',
        title: 'Audit Selesai — Draft Revisi Tersedia',
        message: `${result.summary}\n\nApakah Anda ingin menerapkan draft revisi ke kotak input? Draft asli tidak akan hilang dari riwayat.`,
        confirmText: 'Terapkan ke Draft',
        cancelText: 'Nanti Saja',
        onConfirm: () => {
          handleApplyToDraft(result.revisedDraft, 'audit');
        },
      });
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal menjalankan Audit: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingAudit(false);
    }
  };

  const handleRunVisualCueAnnotation = async () => {
    if (!providerConfig.apiKey?.trim() && providerConfig.provider !== 'ollama') {
      showError(
        'Kunci API Belum Dikonfigurasi',
        `API Key untuk provider ${providerConfig.provider.toUpperCase()} belum diatur di menu Settings.`,
        {
          solution: 'Buka menu Settings dan masukkan API Key Anda, lalu klik Simpan.',
          actionButton: onNavigateSettings
            ? { label: 'Buka Settings', onClick: onNavigateSettings }
            : undefined,
        }
      );
      return;
    }
    if (!scriptOutput.trim()) {
      showWarning(
        'Draf Naskah Masih Kosong',
        'Silakan masukkan atau unggah draf naskah video sebelum anotasi Visual Cue.'
      );
      return;
    }

    setGeneratingVisualCue(true);
    startActivity(
      'Visual Cue Annotation Log',
      `Menghubungkan ke ${providerConfig.provider.toUpperCase()}...`
    );
    addLog(`Membaca alur narasi (${scriptOutput.length.toLocaleString('id-ID')} karakter) untuk identifikasi momen visual...`, 40);
    addLog('Menyisipkan tags [BUKTI], [JELASKAN], [KONTEKS], [TEKANKAN], [RITME]...', 75);

    try {
      await onUpdate(item.id, { external_script_output: scriptOutput });

      const result = await runVisualCueAnnotation(providerConfig, item.title, scriptOutput);
      setAnnotatedScript(result.annotatedScript);
      setShowVisualCueResults(true);
      setVisualCueSummary(result.summary);
      setIsScriptInputCollapsed(true);
      setIsVisualCueResultsCollapsed(false);
      setIsAuditResultsCollapsed(true);

      await onUpdate(item.id, {
        visual_cue_prompt: result.annotatedScript,
        ai_output: 'Anotasi Visual Cue selesai.',
      });

      finishActivity(`Anotasi selesai! ${result.summary}`);
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal menganotasi Visual Cue: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingVisualCue(false);
    }
  };

  const handleGenerateThumbnail = async (advanceToThumbnailing = false) => {
    if (!providerConfig.apiKey?.trim() && providerConfig.provider !== 'ollama') {
      showError(
        'Kunci API Belum Dikonfigurasi',
        `API Key untuk provider ${providerConfig.provider.toUpperCase()} belum diatur di menu Settings.`,
        {
          solution: 'Buka menu Settings dan masukkan API Key Anda, lalu klik Simpan.',
          actionButton: onNavigateSettings
            ? { label: 'Buka Settings', onClick: onNavigateSettings }
            : undefined,
        }
      );
      return;
    }
    if (!scriptOutput.trim()) {
      showWarning(
        'Naskah Belum Diisi',
        'Silakan masukkan naskah video sebelum membuat Thumbnail Prompt.'
      );
      return;
    }

    setGeneratingThumbnail(true);
    setLoading(true);
    startActivity(
      'AI Thumbnail Generator Log',
      `Menghubungkan ke ${providerConfig.provider.toUpperCase()}...`
    );
    addLog('Menganalisis judul & naskah untuk menemukan inti emosional...', 45);
    addLog('Merumuskan ide teks thumbnail berkonversi tinggi (CTR-focused)...', 75);

    try {
      await onUpdate(item.id, { external_script_output: scriptOutput });

      const thumbRes = await generateThumbnailPrompt(providerConfig, item.title, scriptOutput);
      setThumbnailPrompt(thumbRes);

      const updates: Partial<ContentItem> = {
        generated_thumbnail_prompt: thumbRes,
        ai_output: 'Thumbnail Prompt siap.',
      };

      if (advanceToThumbnailing) {
        updates.status = 'Thumbnailing';
      }

      await onUpdate(item.id, updates);

      finishActivity('Thumbnail Prompt berhasil dibuat!');
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal membuat Thumbnail: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingThumbnail(false);
      setLoading(false);
    }
  };

  const handleProceedToThumbnailing = async () => {
    try {
      await onUpdate(item.id, {
        status: 'Thumbnailing',
        external_research_output: researchOutput,
        external_script_output: scriptOutput,
        script_outline: outlineText,
        script_target_duration: targetDuration,
        script_target_words: computedTargetWords,
        script_angle_notes: angleNotes,
        script_production_track: productionTrack,
        script_outline_approved: isOutlineApproved,
      });
      lastSavedResearchRef.current = researchOutput;
      lastSavedScriptRef.current = scriptOutput;
      lastSavedOutlineRef.current = outlineText;
      lastSavedAngleNotesRef.current = angleNotes;
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      showError(parsed.title, parsed.message);
    }
  };

  const computedTargetWords = calculateTargetWords(
    targetDuration,
    customMode,
    customMode === 'words' ? customWordsInput : customMinutesInput
  );

  const handleSelectTrack = (track: 'in_app' | 'external') => {
    if (track === productionTrack) return;
    if (outlineText.trim().length > 0) {
      setPendingTrack(track);
      setShowSwitchTrackModal(true);
    } else {
      setProductionTrack(track);
      onUpdate(item.id, { script_production_track: track });
    }
  };

  const handleConfirmSwitchTrack = async (keepOutline: boolean) => {
    if (!pendingTrack) return;
    const newTrack = pendingTrack;
    setProductionTrack(newTrack);
    setShowSwitchTrackModal(false);
    setPendingTrack(null);

    const updates: Partial<ContentItem> = {
      script_production_track: newTrack,
    };
    if (!keepOutline) {
      setOutlineText('');
      setIsOutlineApproved(false);
      previousOutlineRef.current = null;
      lastSavedOutlineRef.current = '';
      updates.script_outline = null;
      updates.script_outline_approved = false;
    } else {
      lastSavedOutlineRef.current = outlineText;
      updates.script_outline = outlineText;
      updates.script_outline_approved = isOutlineApproved;
    }
    await onUpdate(item.id, updates);
  };

  const handleGenerateOutline = async (isRegenerate = false) => {
    if (!providerConfig.apiKey?.trim() && providerConfig.provider !== 'ollama') {
      showError(
        'Kunci API Belum Dikonfigurasi',
        `API Key untuk provider ${providerConfig.provider.toUpperCase()} belum diatur di menu Settings.`,
        {
          solution: 'Buka menu Settings dan masukkan API Key Anda, lalu klik Simpan.',
          actionButton: onNavigateSettings
            ? { label: 'Buka Settings', onClick: onNavigateSettings }
            : undefined,
        }
      );
      return;
    }

    setGeneratingOutline(true);
    startActivity(
      'Outline Studio Log',
      `Menghubungkan ke ${providerConfig.provider.toUpperCase()}...`
    );
    addLog(
      isRegenerate
        ? 'Meregenerasi Kerangka 5 Tahap Zeinity dengan catatan revisi...'
        : 'Menyusun Kerangka 5 Tahap Zeinity berdasarkan riset & angle khusus...',
      50
    );

    try {
      if (isRegenerate && outlineText.trim()) {
        previousOutlineRef.current = outlineText;
      }

      const generated = await generateZeinityOutline(
        providerConfig,
        item.title,
        researchOutput,
        item.category,
        item.research_text,
        angleNotes,
        computedTargetWords,
        targetDuration,
        isRegenerate ? revisionNoteInput : null
      );

      setOutlineText(generated);
      lastSavedOutlineRef.current = generated;
      setIsOutlineApproved(false);
      setRevisionNoteInput('');

      await onUpdate(item.id, {
        script_outline: generated,
        script_outline_approved: false,
        script_target_duration: targetDuration,
        script_target_words: computedTargetWords,
        script_angle_notes: angleNotes,
        script_production_track: productionTrack,
      });

      finishActivity(
        isRegenerate
          ? 'Kerangka 5 Tahap Zeinity berhasil diregenerasi!'
          : 'Kerangka 5 Tahap Zeinity berhasil disusun!'
      );
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal membuat outline: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleUndoOutline = async () => {
    if (!previousOutlineRef.current) return;
    const restored = previousOutlineRef.current;
    previousOutlineRef.current = null;
    setOutlineText(restored);
    lastSavedOutlineRef.current = restored;
    await onUpdate(item.id, { script_outline: restored });
    showAlert({
      type: 'info',
      title: 'Outline Berhasil Dipulihkan',
      message: 'Kerangka sebelum regenerasi terakhir telah dipulihkan.',
    });
  };

  const executeGenerateFullScript = async () => {
    if (!providerConfig.apiKey?.trim() && providerConfig.provider !== 'ollama') {
      showError(
        'Kunci API Belum Dikonfigurasi',
        `API Key untuk provider ${providerConfig.provider.toUpperCase()} belum diatur di menu Settings.`,
        {
          solution: 'Buka menu Settings dan masukkan API Key Anda, lalu klik Simpan.',
          actionButton: onNavigateSettings
            ? { label: 'Buka Settings', onClick: onNavigateSettings }
            : undefined,
        }
      );
      return;
    }

    setIsOutlineApproved(true);
    setGeneratingFullScript(true);
    startActivity(
      'AI Scriptwriter Log',
      `Menghubungkan ke ${providerConfig.provider.toUpperCase()}...`
    );
    addLog('Membaca Kerangka 5 Tahap Zeinity yang telah disetujui...', 30);
    addLog(`Menulis naskah narasi lisan utuh (~${computedTargetWords} kata, spoken-first, siap TTS)...`, 65);

    try {
      // Save current draft to snapshot before overwriting
      if (scriptOutput.trim()) {
        const updated = saveDraftSnapshot(item.id, scriptOutput, 'Sebelum Penimpaan AI Scriptwriter');
        setDraftHistory(updated);
      }

      lastSavedOutlineRef.current = outlineText;
      await onUpdate(item.id, {
        script_outline: outlineText,
        script_outline_approved: true,
        script_target_duration: targetDuration,
        script_target_words: computedTargetWords,
        script_angle_notes: angleNotes,
      });

      const fullScript = await generateZeinityFullScript(
        providerConfig,
        item.title,
        outlineText,
        researchOutput,
        identityText,
        computedTargetWords,
        angleNotes,
        item.category,
        item.research_text
      );

      setScriptOutput(fullScript);
      lastSavedScriptRef.current = fullScript;
      setScriptSaveStatus('saved');

      const updatedHistory = saveDraftSnapshot(item.id, fullScript, 'Draft AI Scriptwriter Utuh');
      setDraftHistory(updatedHistory);

      await onUpdate(item.id, {
        external_script_output: fullScript,
      });

      setIsDraftHighlighted(true);
      if (scriptTextareaRef.current) {
        scriptTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => scriptTextareaRef.current?.focus(), 450);
      }
      setTimeout(() => setIsDraftHighlighted(false), 2400);

      finishActivity(`Naskah narasi lengkap berhasil ditulis (${fullScript.split(/\s+/).filter(Boolean).length} kata)!`);
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal menulis naskah: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingFullScript(false);
    }
  };

  const handleApproveAndGenerateScript = async () => {
    if (!outlineText.trim()) {
      showWarning(
        'Kerangka Belum Tersedia',
        'Silakan buat kerangka (outline) terlebih dahulu sebelum menulis naskah.'
      );
      return;
    }

    if (scriptOutput.trim().length > 0) {
      setShowOverwriteDraftModal(true);
      return;
    }

    await executeGenerateFullScript();
  };

  const handleApproveExternalOutline = async () => {
    if (!outlineText.trim()) {
      showWarning(
        'Outline Masih Kosong',
        'Silakan tempel (paste) outline dari ChatGPT / Claude ke dalam kotak teks sebelum menyetujui.'
      );
      return;
    }
    lastSavedOutlineRef.current = outlineText;
    setIsOutlineApproved(true);
    await onUpdate(item.id, {
      script_outline: outlineText,
      script_outline_approved: true,
      script_target_duration: targetDuration,
      script_target_words: computedTargetWords,
      script_angle_notes: angleNotes,
      script_production_track: 'external',
    });
    showAlert({
      type: 'success',
      title: 'Outline Berhasil Disetujui',
      message: 'Kerangka disetujui. Prompt Naskah Instan siap disalin ke ChatGPT / Claude!',
    });
  };

  const getSmartReminderText = () => {
    const isAuditDone = Boolean(auditFindings || auditSummary || item.audit_spoken_prompt);
    const isVisualDone = Boolean(annotatedScript || visualCueSummary || item.visual_cue_prompt);
    const isTitleDone = Boolean(titleA || titleB || item.generated_title_a || item.generated_title_b);

    if (isAuditDone && isVisualDone && isTitleDone) {
      return 'Seluruh checklist pemolesan naskah lengkap! Naskah Anda siap untuk tahap pembuatan thumbnail.';
    }
    if (isAuditDone && isVisualDone && !isTitleDone) {
      return 'Audit Spoken & Anotasi Visual Cue telah selesai! Buat Judul A/B untuk melengkapi paket naskah sebelum beralih ke Thumbnail.';
    }
    if (isAuditDone && !isVisualDone && isTitleDone) {
      return 'Audit Spoken & Judul A/B telah selesai! Lengkapi dengan Anotasi Visual Cue agar video siap produksi.';
    }
    if (!isAuditDone && isVisualDone && isTitleDone) {
      return 'Anotasi Visual Cue & Judul A/B telah selesai! Jalankan Audit Spoken & TTS untuk memvalidasi kelayakan tutur lisan.';
    }
    if (isAuditDone && !isVisualDone && !isTitleDone) {
      return 'Audit Spoken telah selesai! Lanjutkan dengan Anotasi Visual Cue & Judul A/B agar video siap produksi.';
    }
    if (!isAuditDone && isVisualDone && !isTitleDone) {
      return 'Anotasi Visual Cue telah selesai! Lanjutkan dengan Audit Spoken & TTS serta Judul A/B agar naskah makin matang.';
    }
    if (!isAuditDone && !isVisualDone && isTitleDone) {
      return 'Judul A/B telah dibuat! Lanjutkan dengan Audit Spoken & TTS serta Anotasi Visual Cue untuk memoles naskah.';
    }
    if (isOutlineApproved || scriptOutput.trim().length > 0) {
      return 'Draf naskah siap dipoles! Mulai dengan "Audit Spoken & TTS" untuk memeriksa kelayakan tutur lisan dan prosodi AI TTS.';
    }
    return 'Susun dan setujui kerangka naskah terlebih dahulu untuk memulai penulisan naskah.';
  };

  const handleGenerateTitles = async () => {
    if (!providerConfig.apiKey?.trim() && providerConfig.provider !== 'ollama') {
      showError(
        'Kunci API Belum Dikonfigurasi',
        `API Key untuk provider ${providerConfig.provider.toUpperCase()} belum diatur di menu Settings.`,
        {
          solution: 'Buka menu Settings dan masukkan API Key Anda, lalu klik Simpan.',
          actionButton: onNavigateSettings
            ? { label: 'Buka Settings', onClick: onNavigateSettings }
            : undefined,
        }
      );
      return;
    }

    setGeneratingTitles(true);
    startActivity('AI Title Generator Log', `Menghubungkan ke ${providerConfig.provider.toUpperCase()}...`);
    addLog('Menganalisis topik & konteks narasi naskah...', 35);
    addLog('Merumuskan Mode A (Curiosity & Mobile 5–8 kata) & Mode B (SEO Keyword & Authority)...', 75);

    try {
      const res = await generateAlternativeTitles(
        providerConfig,
        item.title,
        item.category || 'Umum',
        scriptOutput || researchOutput || item.research_text
      );

      setTitleA(res.titleA);
      setTitleB(res.titleB);
      setShowTitleCard(true);

      await onUpdate(item.id, {
        generated_title_a: res.titleA,
        generated_title_b: res.titleB,
      });

      finishActivity('Judul alternatif Mode A & Mode B berhasil dibuat!');
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal membuat judul alternatif: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingTitles(false);
    }
  };

  const handleApplyTitleAsMain = async (newTitle: string) => {
    try {
      await onUpdate(item.id, { title: newTitle });
      showAlert({
        type: 'success',
        title: 'Judul Utama Diperbarui',
        message: `Judul konten berhasil diubah menjadi:\n"${newTitle}"`,
      });
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      showError(parsed.title, parsed.message);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    startActivity('Content Publishing Log', `Mempublikasikan konten: "${item.title.slice(0, 32)}..."`);
    addLog('Menyimpan status publikasi dan menginisialisasi metrik video...', 60);

    try {
      await onUpdate(item.id, {
        status: 'Published',
        published_at: new Date().toISOString(),
        views: item.views ?? 0,
        likes: item.likes ?? 0,
        comments: item.comments ?? 0,
        ai_output: 'Konten berhasil dipublikasikan.',
      });
      finishActivity('Konten berhasil dipublikasikan ke YouTube pipeline!');
      showAlert({
        type: 'success',
        title: 'Publikasi Berhasil',
        message: 'Konten berhasil dipublikasikan! Cek di tab Published.',
        onConfirm: () => onBack(),
      });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Gagal mempublikasikan konten.';
      errorActivity(`Gagal publikasi: ${raw}`);
      showError('Gagal Publikasi Konten', raw);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (researchOutputRef.current !== lastSavedResearchRef.current) {
      onUpdate(itemRef.current.id, { external_research_output: researchOutputRef.current });
      lastSavedResearchRef.current = researchOutputRef.current;
    }
    if (scriptOutputRef.current !== lastSavedScriptRef.current) {
      onUpdate(itemRef.current.id, { external_script_output: scriptOutputRef.current });
      lastSavedScriptRef.current = scriptOutputRef.current;
    }
    if (outlineTextRef.current !== lastSavedOutlineRef.current) {
      onUpdate(itemRef.current.id, { script_outline: outlineTextRef.current });
      lastSavedOutlineRef.current = outlineTextRef.current;
    }
    if (angleNotesRef.current !== lastSavedAngleNotesRef.current) {
      onUpdate(itemRef.current.id, { script_angle_notes: angleNotesRef.current });
      lastSavedAngleNotesRef.current = angleNotesRef.current;
    }
    onBack();
  };

  const handleDownloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="main-content">
      {copied && (
        <span aria-live="polite" role="status" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Teks berhasil disalin ke clipboard
        </span>
      )}
      <button
        className="btn btn-secondary"
        type="button"
        onClick={handleBack}
        style={{ marginBottom: 18 }}
      >
        <ArrowLeft size={18} /> Kembali ke Pipeline
      </button>

      <section className="hero">
        <div>
          <p className="eyebrow">Human-in-the-Loop Workspace</p>
          <h1>{item.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p className="subtitle" style={{ margin: 0 }}>
                Status: <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{item.status}</span>
              </p>
              {item.source === 'Telegram' ? (
                item.telegram_message_id ? (
                  <span
                    className="source-verified-bot"
                    title={`Verified Bot — Telegram (Bot): dikirim otomatis via Telegram Bot API${item.telegram_sender_username ? ` • @${item.telegram_sender_username}` : ''} • Msg ID: ${item.telegram_message_id}`}
                  >
                    <Bot size={11} /> Telegram (Bot)
                  </span>
                ) : (
                  <span
                    className="source source-telegram-manual"
                    title="Telegram (Manual) — Dicatat manual oleh user di web app"
                  >
                    Telegram (Manual)
                  </span>
                )
              ) : (
                <span className={`source ${item.source.toLowerCase()}`}>{item.source}</span>
              )}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="pipelineStatusSelect" style={{ fontSize: '0.8rem', color: '#7890af' }}>
                Koreksi Status:
              </label>
              <select
                id="pipelineStatusSelect"
                className="status-selector-dropdown"
                value={item.status}
                onChange={(e) => handleStatusChange(e.target.value as ContentStatus)}
                style={{
                  background: '#0d1526',
                  border: '1px solid #1a2942',
                  color: 'var(--cyan)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Pilih status untuk melompat atau mengoreksi alur pipeline"
              >
                {CONTENT_STATUSES.map((st) => (
                  <option key={st} value={st} style={{ background: '#0d1526', color: '#e2edff' }}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {item.status === 'Scripting' ? (
        <div className="scripting-workspace-stretched" style={{ width: '100%', maxWidth: '100%' }}>
          {/* ==================== 1. PRE-FLIGHT CONFIGURATION (FULL WIDTH) ==================== */}
          <div
            className="preflight-config-container"
            style={{
              background: '#0c1526',
              border: '1px solid #1d304f',
              borderRadius: 14,
              padding: '16px 20px',
              marginBottom: 20,
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Title Bar */}
            <div
              style={{
                background: '#111d33',
                borderRadius: 6,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.3px' }}>
                1. PRE-FLIGHT CONFIGURATION: PILIH JALUR, TARGET DURASI/KATA, &amp; SINKRONISASI KONTEKS IDE
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {/* Col A: Mode Switcher */}
              <div
                style={{
                  background: '#101c30',
                  border: '1px solid #1d3356',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>
                  A. PILIH SATU JALUR PRODUKSI (BISA DI-RESET):
                </div>

                {/* Option 1: In-App AI */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectTrack('in_app')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSelectTrack('in_app');
                  }}
                  style={{
                    background: productionTrack === 'in_app' ? 'rgba(56, 189, 248, 0.16)' : '#0a1220',
                    border: `1.5px solid ${productionTrack === 'in_app' ? 'var(--cyan)' : '#1b2a42'}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: productionTrack === 'in_app' ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: productionTrack === 'in_app' ? 'var(--cyan)' : 'transparent',
                      border: `1.5px solid ${productionTrack === 'in_app' ? 'var(--cyan)' : '#94a3b8'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0b1322',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                    }}
                  >
                    {productionTrack === 'in_app' ? '✓' : ''}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: productionTrack === 'in_app' ? '#f8fafc' : '#94a3b8' }}>
                      ⚡ In-App AI Scriptwriter {productionTrack === 'in_app' && '(Aktif)'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: productionTrack === 'in_app' ? 'var(--cyan)' : '#7890af' }}>
                      Otomatis penuh di web app: Outline ➔ Naskah Jadi
                    </div>
                  </div>
                </div>

                {/* Option 2: AI Eksternal */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectTrack('external')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSelectTrack('external');
                  }}
                  style={{
                    background: productionTrack === 'external' ? 'rgba(56, 189, 248, 0.16)' : '#0a1220',
                    border: `1.5px solid ${productionTrack === 'external' ? 'var(--cyan)' : '#1b2a42'}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: productionTrack === 'external' ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: productionTrack === 'external' ? 'var(--cyan)' : 'transparent',
                      border: `1.5px solid ${productionTrack === 'external' ? 'var(--cyan)' : '#94a3b8'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0b1322',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                    }}
                  >
                    {productionTrack === 'external' ? '✓' : ''}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: productionTrack === 'external' ? '#f8fafc' : '#94a3b8' }}>
                      📋 AI Eksternal (ChatGPT / Claude) {productionTrack === 'external' && '(Aktif)'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: productionTrack === 'external' ? 'var(--cyan)' : '#7890af' }}>
                      Prompt Outline ➔ Prompt Naskah Instan (0 Token AI)
                    </div>
                  </div>
                </div>
              </div>

              {/* Col B: Target Duration & Custom Sub-panel */}
              <div
                style={{
                  background: '#101c30',
                  border: '1px solid #1d3356',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>
                    B. TARGET DURASI &amp; AKSI AKSESIBILITAS KATA:
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--green)' }}>
                    ~{computedTargetWords.toLocaleString('id-ID')} kata
                  </span>
                </div>

                {/* Preset Pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: '60s', label: '60s' },
                    { key: '1-3m', label: '1–3m' },
                    { key: '5-8m', label: '5–8m (Default)' },
                    { key: '8-12m', label: '8–12m' },
                    { key: 'custom', label: 'Custom' },
                  ].map((p) => {
                    const isActive = targetDuration === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          setTargetDuration(p.key);
                          onUpdate(item.id, {
                            script_target_duration: p.key,
                            script_target_words: calculateTargetWords(
                              p.key,
                              customMode,
                              customMode === 'words' ? customWordsInput : customMinutesInput
                            ),
                          });
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: isActive ? 700 : 500,
                          background: isActive
                            ? p.key === 'custom'
                              ? 'rgba(56, 189, 248, 0.2)'
                              : 'rgba(52, 211, 153, 0.18)'
                            : '#162640',
                          border: `1px solid ${isActive ? (p.key === 'custom' ? 'var(--cyan)' : 'var(--green)') : '#253c61'}`,
                          color: isActive ? (p.key === 'custom' ? 'var(--cyan)' : 'var(--green)') : '#cbd5e1',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Sub-panel */}
                {targetDuration === 'custom' && (
                  <div
                    style={{
                      background: '#080f1c',
                      border: '1px solid #23395d',
                      borderRadius: 8,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1' }}>
                      Pilih Parameter Input Custom:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                      {/* Custom Option 1: Target Kata */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setCustomMode('words')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setCustomMode('words');
                        }}
                        style={{
                          background: customMode === 'words' ? 'rgba(52, 211, 153, 0.12)' : '#101929',
                          border: `1px solid ${customMode === 'words' ? 'var(--green)' : '#1d2e47'}`,
                          borderRadius: 6,
                          padding: '6px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: customMode === 'words' ? 'var(--green)' : 'transparent',
                              border: `1.5px solid ${customMode === 'words' ? 'var(--green)' : '#94a3b8'}`,
                            }}
                          />
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f8fafc' }}>
                            Target Kata (Disarankan)
                          </span>
                        </div>
                        <input
                          type="number"
                          min={100}
                          max={10000}
                          step={50}
                          value={customWordsInput}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setCustomWordsInput(val);
                          }}
                          onBlur={() => {
                            onUpdate(item.id, {
                              script_target_words: customWordsInput,
                              script_target_duration: 'custom',
                            });
                          }}
                          disabled={customMode !== 'words'}
                          style={{
                            width: '100%',
                            marginTop: 6,
                            padding: '4px 8px',
                            background: '#0a101d',
                            border: '1px solid #1a2942',
                            borderRadius: 4,
                            color: '#e2edff',
                            fontSize: '0.78rem',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                          }}
                          placeholder="Misal: 1400 kata"
                        />
                      </div>

                      {/* Custom Option 2: Ketik Durasi Menit */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setCustomMode('minutes')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setCustomMode('minutes');
                        }}
                        style={{
                          background: customMode === 'minutes' ? 'rgba(52, 211, 153, 0.12)' : '#101929',
                          border: `1px solid ${customMode === 'minutes' ? 'var(--green)' : '#1d2e47'}`,
                          borderRadius: 6,
                          padding: '6px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: customMode === 'minutes' ? 'var(--green)' : 'transparent',
                              border: `1.5px solid ${customMode === 'minutes' ? 'var(--green)' : '#94a3b8'}`,
                            }}
                          />
                          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: customMode === 'minutes' ? '#f8fafc' : '#94a3b8' }}>
                            Ketik Durasi Menit
                          </span>
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          step={1}
                          value={customMinutesInput}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setCustomMinutesInput(val);
                          }}
                          onBlur={() => {
                            onUpdate(item.id, {
                              script_target_words: calculateTargetWords('custom', 'minutes', customMinutesInput),
                              script_target_duration: 'custom',
                            });
                          }}
                          disabled={customMode !== 'minutes'}
                          style={{
                            width: '100%',
                            marginTop: 6,
                            padding: '4px 8px',
                            background: '#0a101d',
                            border: '1px solid #1a2942',
                            borderRadius: 4,
                            color: '#e2edff',
                            fontSize: '0.78rem',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                          }}
                          placeholder="Misal: 9 menit"
                        />
                        <div style={{ fontSize: '0.68rem', color: '#7890af', marginTop: 4 }}>
                          Auto: {customMinutesInput}m ≈ {calculateTargetWords('custom', 'minutes', customMinutesInput).toLocaleString('id-ID')} kata
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Col C: Idea Context & Extra Angle Binding */}
              <div
                style={{
                  background: '#101c30',
                  border: '1px solid #1d3356',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>
                  C. KONTEKS IDE &amp; INFO TAMBAHAN KARTU IDE:
                </div>

                <div
                  style={{
                    background: '#080e1a',
                    border: '1px solid #1b2a40',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontSize: '0.76rem',
                    color: '#cbd5e1',
                  }}
                >
                  <div style={{ color: 'var(--cyan)', fontWeight: 700, marginBottom: 2 }}>
                    ✓ Terhubung ke Kartu Ide Tabel:
                  </div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9' }}>
                    "{item.title}"
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#7890af', marginTop: 2 }}>
                    Pilar: {item.category || 'Umum'} {item.research_text ? '• Catatan Ide tersinkronisasi' : ''}
                  </div>
                </div>

                <div>
                  <label htmlFor="angleNotesInput" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Angle Tambahan / Fokus Khusus (Opsional):
                  </label>
                  <input
                    id="angleNotesInput"
                    type="text"
                    value={angleNotes}
                    onChange={(e) => setAngleNotes(e.target.value)}
                    onBlur={() => {
                      lastSavedAngleNotesRef.current = angleNotes;
                      onUpdate(item.id, { script_angle_notes: angleNotes });
                    }}
                    placeholder='Contoh: "Tekankan sisi dopamin loop dari notifikasi merah"'
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: '#080e1a',
                      border: '1px solid #253856',
                      borderRadius: 6,
                      color: '#f1f5f9',
                      fontSize: '0.78rem',
                      fontStyle: 'italic',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ fontSize: '0.68rem', color: '#7890af', marginTop: 3 }}>
                    AI wajib memasukkan angle ini ke Outline &amp; Script
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== 2. WORKSPACE TOP ACTION BAR ==================== */}
          <div
            style={{
              background: '#0e1a2f',
              border: '1px solid #1f3659',
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: 'var(--cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#080d18',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                }}
              >
                ⚡
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.2px' }}>
                WORKSPACE SCRIPTING: JALUR {productionTrack === 'in_app' ? 'IN-APP AI SCRIPTWRITER' : 'AI EKSTERNAL'} (AKTIF STRETCHED)
              </span>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleSelectTrack(productionTrack === 'in_app' ? 'external' : 'in_app')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                padding: '5px 12px',
                color: '#cbd5e1',
              }}
              title="Ganti jalur produksi antara In-App AI Scriptwriter dan AI Eksternal"
            >
              <Undo2 size={13} /> Ganti Jalur Produksi
            </button>
          </div>

          {/* ==================== 3. STRETCHED DUAL-PANE GRID (50% / 50%) ==================== */}
          <div className="scripting-dual-pane-grid">
            {/* PANEL KIRI: PIPELINE KERANGKA (OUTLINE STUDIO) */}
            <section className="detail-card glass" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ borderBottom: '1px solid #1a2942', paddingBottom: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} /> PANEL KIRI: PIPELINE KERANGKA (OUTLINE STUDIO)
                </h3>
                <span className="collapsed-pill" style={{ background: 'rgba(79, 232, 255, 0.12)', color: 'var(--cyan)' }}>
                  Lebar Penuh (Stretch)
                </span>
              </div>

              {productionTrack === 'in_app' ? (
                /* IN-APP TRACK */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Tahap 1: Outline Generator Header */}
                  <div
                    style={{
                      background: '#121f36',
                      border: '1px solid #223b63',
                      borderRadius: 8,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan)' }}>
                      Tahap 1: Susun Kerangka Berdasarkan Riset + Konteks Ide
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                      AI menganalisis data riset aktual &amp; memasukkan angle spesifik ke 5 Babak Zeinity.
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Target: ~{computedTargetWords.toLocaleString('id-ID')} Kata • 0 Token halusinasi • Mempertahankan fakta riset.
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleGenerateOutline(false)}
                        disabled={generatingOutline}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 16px',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                        }}
                      >
                        {generatingOutline ? (
                          <>
                            <RotateCw size={15} className="spin" /> Menyusun Outline...
                          </>
                        ) : (
                          <>
                            ⚡ Generate Outline 5 Tahap
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tahap 2: Human Approval Gate */}
                  <div
                    style={{
                      background: '#0a1322',
                      border: '1.2px solid #294572',
                      borderRadius: 8,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>Tahap 2: Human Approval Gate (Kreator Meninjau Kerangka)</span>
                      </div>
                      <div>
                        {isOutlineApproved ? (
                          <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)', borderColor: 'rgba(52, 211, 153, 0.4)' }}>
                            ✅ [Disetujui]
                          </span>
                        ) : outlineText.trim() ? (
                          <span className="collapsed-pill" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--amber)', borderColor: 'rgba(251, 191, 36, 0.4)' }}>
                            ⚠️ [Menunggu Review]
                          </span>
                        ) : (
                          <span className="collapsed-pill" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.4)' }}>
                            ⚪ [Belum Dibuat]
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Outline Textarea */}
                    <textarea
                      value={outlineText}
                      onChange={(e) => {
                        setOutlineText(e.target.value);
                        setIsOutlineApproved(false);
                      }}
                      onBlur={() => {
                        lastSavedOutlineRef.current = outlineText;
                        onUpdate(item.id, {
                          script_outline: outlineText,
                          script_outline_approved: isOutlineApproved,
                        });
                      }}
                      placeholder="Kerangka 5 Babak Zeinity akan muncul di sini setelah Anda mengklik 'Generate Outline 5 Tahap', atau Anda dapat mengetik/menempel kerangka secara manual..."
                      style={{
                        width: '100%',
                        minHeight: 280,
                        background: '#070d18',
                        border: '1px solid #1d3050',
                        color: '#e2edff',
                        padding: 12,
                        borderRadius: 8,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        lineHeight: 1.6,
                        boxSizing: 'border-box',
                        fontSize: '0.84rem',
                      }}
                    />

                    {/* Catatan Revisi bar */}
                    <div>
                      <label htmlFor="revisionNoteInput" style={{ fontSize: '0.74rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
                        Catatan Revisi Regenerasi (Jika belum sesuai):
                      </label>
                      <input
                        id="revisionNoteInput"
                        type="text"
                        value={revisionNoteInput}
                        onChange={(e) => setRevisionNoteInput(e.target.value)}
                        placeholder='Ketik catatan revisi: "Perbanyak data riset di babak II..."'
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          background: '#0e1728',
                          border: '1px solid #253a5e',
                          borderRadius: 6,
                          color: '#f1f5f9',
                          fontSize: '0.8rem',
                          fontStyle: 'italic',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Action Controls */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleGenerateOutline(true)}
                        disabled={generatingOutline || !outlineText.trim()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '8px 12px' }}
                        title="Regenerasi kerangka berdasarkan catatan revisi di atas"
                      >
                        <RotateCw size={14} className={generatingOutline ? 'spin' : ''} />
                        <span>{generatingOutline ? 'Memproses...' : '🔄 Regenerate Outline'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleUndoOutline}
                        disabled={!previousOutlineRef.current}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '8px 12px', color: previousOutlineRef.current ? '#fcd34d' : undefined }}
                        title="Kembalikan kerangka sebelum regenerasi terakhir"
                      >
                        <RotateCcw size={14} />
                        <span>↩️ Undo Terakhir</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleApproveAndGenerateScript}
                        disabled={generatingFullScript || !outlineText.trim()}
                        style={{
                          marginLeft: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          padding: '9px 16px',
                          background: 'var(--green)',
                          borderColor: 'var(--green)',
                          color: '#041a10',
                        }}
                        title="Setujui kerangka ini dan mulai tulis naskah narasi video"
                      >
                        {generatingFullScript ? (
                          <>
                            <Loader2 size={15} className="spin" /> Menulis Naskah Utuh...
                          </>
                        ) : (
                          <>
                            <Check size={16} /> ✅ Setujui & Tulis Naskah
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* EXTERNAL TRACK */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Tahap 1: Salin Prompt Outline */}
                  <div
                    style={{
                      background: '#121f36',
                      border: '1px solid #223b63',
                      borderRadius: 8,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan)' }}>
                        Tahap 1: Salin Prompt Outline untuk ChatGPT / Claude
                      </div>
                      <button
                        type="button"
                        className={`copy-action-btn ${copied === 'extOutlinePrompt' ? 'copied' : ''}`}
                        onClick={() => {
                          const p = formatExternalOutlinePrompt(
                            item.title,
                            researchOutput,
                            item.category,
                            item.research_text,
                            angleNotes,
                            computedTargetWords,
                            targetDuration
                          );
                          copyText(p, 'extOutlinePrompt');
                        }}
                      >
                        {copied === 'extOutlinePrompt' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied === 'extOutlinePrompt' ? 'Tersalin' : 'Salin Prompt Outline'}</span>
                      </button>
                    </div>
                    <div className="prompt-display-box" style={{ maxHeight: 160, overflowY: 'auto' }}>
                      <pre className="prompt-pre" style={{ fontSize: '0.76rem' }}>
                        {formatExternalOutlinePrompt(
                          item.title,
                          researchOutput,
                          item.category,
                          item.research_text,
                          angleNotes,
                          computedTargetWords,
                          targetDuration
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Tahap 2: Tempel & Setujui Kerangka */}
                  <div
                    style={{
                      background: '#0a1322',
                      border: '1.2px solid #294572',
                      borderRadius: 8,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24' }}>
                        Tahap 2: Tempel &amp; Tinjau Kerangka dari AI Eksternal
                      </div>
                      <div>
                        {isOutlineApproved ? (
                          <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)', borderColor: 'rgba(52, 211, 153, 0.4)' }}>
                            ✅ [Disetujui]
                          </span>
                        ) : outlineText.trim() ? (
                          <span className="collapsed-pill" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--amber)', borderColor: 'rgba(251, 191, 36, 0.4)' }}>
                            ⚠️ [Menunggu Review]
                          </span>
                        ) : (
                          <span className="collapsed-pill" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.4)' }}>
                            ⚪ [Tempel Kerangka]
                          </span>
                        )}
                      </div>
                    </div>

                    <textarea
                      value={outlineText}
                      onChange={(e) => {
                        setOutlineText(e.target.value);
                        setIsOutlineApproved(false);
                      }}
                      onBlur={() => {
                        lastSavedOutlineRef.current = outlineText;
                        onUpdate(item.id, {
                          script_outline: outlineText,
                          script_outline_approved: isOutlineApproved,
                        });
                      }}
                      placeholder="Tempel kerangka 5 babak dari ChatGPT atau Claude di sini..."
                      style={{
                        width: '100%',
                        minHeight: 220,
                        background: '#070d18',
                        border: '1px solid #1d3050',
                        color: '#e2edff',
                        padding: 12,
                        borderRadius: 8,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        lineHeight: 1.6,
                        boxSizing: 'border-box',
                        fontSize: '0.84rem',
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleApproveExternalOutline}
                        disabled={!outlineText.trim()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          padding: '8px 16px',
                          background: 'var(--green)',
                          borderColor: 'var(--green)',
                          color: '#041a10',
                        }}
                      >
                        <Check size={16} /> ✅ Setujui Outline Eksternal
                      </button>
                    </div>
                  </div>

                  {/* Tahap 3: Prompt Naskah Instan Siap Salin */}
                  {isOutlineApproved && (
                    <div
                      style={{
                        background: '#0d1b2a',
                        border: '1.2px solid rgba(52, 211, 153, 0.4)',
                        borderRadius: 8,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--green)' }}>
                          Tahap 3: Prompt Naskah Instan Siap Salin (0 Token AI)
                        </div>
                        <button
                          type="button"
                          className={`copy-action-btn ${copied === 'extScriptPrompt' ? 'copied' : ''}`}
                          onClick={() => {
                            const p = formatExternalScriptingPrompt(
                              item.title,
                              outlineText,
                              identityText,
                              computedTargetWords,
                              angleNotes
                            );
                            copyText(p, 'extScriptPrompt');
                          }}
                        >
                          {copied === 'extScriptPrompt' ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copied === 'extScriptPrompt' ? 'Tersalin' : 'Salin Prompt Naskah Utuh'}</span>
                        </button>
                      </div>
                      <div className="prompt-display-box" style={{ maxHeight: 180, overflowY: 'auto' }}>
                        <pre className="prompt-pre" style={{ fontSize: '0.76rem' }}>
                          {formatExternalScriptingPrompt(
                            item.title,
                            outlineText,
                            identityText,
                            computedTargetWords,
                            angleNotes
                          )}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* PANEL KANAN: DRAFT STUDIO (RUANG KERJA PRODUKSI) */}
            <section className="detail-card glass" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ borderBottom: '1px solid #1a2942', paddingBottom: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} /> PANEL KANAN: DRAFT STUDIO (RUANG KERJA PRODUKSI)
                </h3>
                <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.12)', color: 'var(--green)' }}>
                  Stretched Full View
                </span>
              </div>

              {/* Live Script Textarea Box */}
              <div
                style={{
                  background: '#070d18',
                  border: '1.2px solid #223a61',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {/* Textarea Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid #14233c', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
                      Draf Naskah Narasi Video:
                    </span>
                    <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.12)', color: 'var(--green)', borderColor: 'rgba(52, 211, 153, 0.3)' }}>
                      {scriptOutput.trim() ? scriptOutput.trim().split(/\s+/).filter(Boolean).length.toLocaleString('id-ID') : 0} kata / ~{computedTargetWords.toLocaleString('id-ID')} target
                    </span>
                    {renderSaveIndicator(scriptSaveStatus)}
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {draftHistory.length > 0 && (
                      <button
                        type="button"
                        className="editor-maximize-btn"
                        onClick={handleUndoLatestAiRevision}
                        title="Undo revisi AI terakhir dan kembalikan draf sebelum revisi"
                        style={{ color: '#fcd34d' }}
                      >
                        <Undo2 size={13} />
                        <span>Undo Revisi AI</span>
                      </button>
                    )}
                    {draftHistory.length > 0 && (
                      <button
                        type="button"
                        className="editor-maximize-btn"
                        onClick={() => setShowDraftHistoryModal(true)}
                        title="Lihat riwayat snapshot draf"
                      >
                        <Clock size={13} />
                        <span>Riwayat Draf ({draftHistory.length})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="editor-maximize-btn"
                      onClick={() => setIsScriptMaximized(true)}
                      title="Perbesar / Maximize Editor Naskah"
                    >
                      <Maximize2 size={13} />
                      <span>Maximize</span>
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  ref={scriptTextareaRef}
                  className={`script-input-textarea ${isDraftHighlighted ? 'draft-highlight-pulse' : ''}`}
                  value={scriptOutput}
                  onChange={(e) => setScriptOutput(e.target.value)}
                  onBlur={() => {
                    if (scriptOutput !== lastSavedScriptRef.current) {
                      const textToSave = scriptOutput;
                      setScriptSaveStatus('saving');
                      onUpdate(item.id, { external_script_output: textToSave })
                        .then(() => {
                          lastSavedScriptRef.current = textToSave;
                          if (scriptOutputRef.current === textToSave) {
                            setScriptSaveStatus('saved');
                            setTimeout(() => {
                              setScriptSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
                            }, 2500);
                          } else {
                            setScriptSaveStatus('unsaved');
                          }
                        })
                        .catch(() => {
                          setScriptSaveStatus('unsaved');
                        });
                    }
                  }}
                  placeholder="Draf naskah video Anda akan mengalir di sini setelah AI Scriptwriter menulis naskah, atau Anda dapat mengetik/menempel draf secara langsung..."
                  style={{
                    width: '100%',
                    minHeight: 280,
                    background: 'transparent',
                    border: 'none',
                    color: '#e2edff',
                    padding: 8,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* ==================== SMART PRODUCTION CHECKLIST TOOLBAR ==================== */}
              <div
                style={{
                  background: '#101a2c',
                  border: '1.2px solid #233a5e',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Checklist Header */}
                <div style={{ background: '#15243d', borderRadius: 5, padding: '6px 12px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--cyan)' }}>
                    SMART CHECKLIST PEMOLESAN NASKAH (FLEKSIBEL DENGAN INDIKATOR STATUS):
                  </span>
                </div>

                {/* 3 Interactive Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                  {/* Card 1: Spoken Audit */}
                  {(() => {
                    const isDone = Boolean(auditFindings || auditSummary || item.audit_spoken_prompt);
                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={handleRunAudit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleRunAudit();
                        }}
                        className="checklist-card-interactive"
                        style={{
                          background: isDone ? 'rgba(52, 211, 153, 0.1)' : '#131e30',
                          border: `1.5px solid ${isDone ? 'var(--green)' : '#253854'}`,
                          borderRadius: 8,
                          padding: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          boxShadow: isDone ? '0 0 10px rgba(52, 211, 153, 0.2)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: isDone ? 'var(--green)' : 'transparent',
                              border: `1.5px solid ${isDone ? 'var(--green)' : '#94a3b8'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#061c12',
                              fontSize: '0.62rem',
                              fontWeight: 900,
                            }}
                          >
                            {isDone ? '✓' : ''}
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDone ? 'var(--green)' : '#cbd5e1' }}>
                            {generatingAudit ? 'Mengaudit...' : 'Audit Spoken & TTS'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Hilangkan em dash &amp; klise
                        </span>
                        <div style={{ marginTop: 2 }}>
                          <span
                            className="collapsed-pill"
                            style={{
                              padding: '1px 6px',
                              fontSize: '0.65rem',
                              background: isDone ? '#042013' : '#0d1522',
                              color: isDone ? 'var(--green)' : '#94a3b8',
                              borderColor: isDone ? 'rgba(52, 211, 153, 0.4)' : '#253854',
                            }}
                          >
                            {isDone ? '● SELESAI' : '⚪ BELUM'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card 2: Visual Cue */}
                  {(() => {
                    const isDone = Boolean(annotatedScript || visualCueSummary || item.visual_cue_prompt);
                    const isSuggested = !isDone && Boolean(auditFindings || auditSummary || item.audit_spoken_prompt);
                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={handleRunVisualCueAnnotation}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleRunVisualCueAnnotation();
                        }}
                        className="checklist-card-interactive"
                        style={{
                          background: isDone
                            ? 'rgba(52, 211, 153, 0.1)'
                            : isSuggested
                              ? 'rgba(192, 132, 252, 0.12)'
                              : '#131e30',
                          border: `1.5px solid ${isDone ? 'var(--green)' : isSuggested ? '#c084fc' : '#253854'}`,
                          borderRadius: 8,
                          padding: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          boxShadow: isSuggested ? '0 0 10px rgba(192, 132, 252, 0.3)' : isDone ? '0 0 10px rgba(52, 211, 153, 0.2)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: isDone ? 'var(--green)' : 'transparent',
                              border: `1.5px solid ${isDone ? 'var(--green)' : isSuggested ? '#c084fc' : '#94a3b8'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#061c12',
                              fontSize: '0.62rem',
                              fontWeight: 900,
                            }}
                          >
                            {isDone ? '✓' : ''}
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDone ? 'var(--green)' : isSuggested ? '#c084fc' : '#cbd5e1' }}>
                            {generatingVisualCue ? 'Menganotasi...' : 'Anotasi Visual Cue'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Sematkan tag B-roll [BUKTI]
                        </span>
                        <div style={{ marginTop: 2 }}>
                          <span
                            className="collapsed-pill"
                            style={{
                              padding: '1px 6px',
                              fontSize: '0.65rem',
                              background: isDone ? '#042013' : isSuggested ? '#1f1035' : '#0d1522',
                              color: isDone ? 'var(--green)' : isSuggested ? '#c084fc' : '#94a3b8',
                              borderColor: isDone ? 'rgba(52, 211, 153, 0.4)' : isSuggested ? 'rgba(192, 132, 252, 0.4)' : '#253854',
                            }}
                          >
                            {isDone ? '● SELESAI' : isSuggested ? '⚡ DISARANKAN' : '⚪ BELUM'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card 3: Alternative Titles */}
                  {(() => {
                    const isDone = Boolean(titleA || titleB || item.generated_title_a || item.generated_title_b);
                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={handleGenerateTitles}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleGenerateTitles();
                        }}
                        className="checklist-card-interactive"
                        style={{
                          background: isDone ? 'rgba(52, 211, 153, 0.1)' : '#131e30',
                          border: `1.5px solid ${isDone ? 'var(--green)' : '#253854'}`,
                          borderRadius: 8,
                          padding: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          boxShadow: isDone ? '0 0 10px rgba(52, 211, 153, 0.2)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: isDone ? 'var(--green)' : 'transparent',
                              border: `1.5px solid ${isDone ? 'var(--green)' : '#94a3b8'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#061c12',
                              fontSize: '0.62rem',
                              fontWeight: 900,
                            }}
                          >
                            {isDone ? '✓' : ''}
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDone ? 'var(--green)' : '#cbd5e1' }}>
                            {generatingTitles ? 'Membuat Judul...' : 'Buat Judul A/B'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          2 Formula Hook Zeinity
                        </span>
                        <div style={{ marginTop: 2 }}>
                          <span
                            className="collapsed-pill"
                            style={{
                              padding: '1px 6px',
                              fontSize: '0.65rem',
                              background: isDone ? '#042013' : '#0d1522',
                              color: isDone ? 'var(--green)' : '#94a3b8',
                              borderColor: isDone ? 'rgba(52, 211, 153, 0.4)' : '#253854',
                            }}
                          >
                            {isDone ? '● SELESAI' : '⚪ BELUM'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Smart Reminder Banner */}
                <div className="smart-reminder-banner">
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#061224', fontSize: '0.75rem', fontWeight: 900 }}>
                    i
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--cyan)' }}>
                      💡 Pengingat Cerdas Workflow:
                    </span>{' '}
                    <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                      "{getSmartReminderText()}"
                    </span>
                  </div>
                </div>

                {/* Proceed CTA Button */}
                <div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleProceedToThumbnailing}
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                    }}
                  >
                    <span>Lanjut ke Pipeline Berikutnya: Generate Thumbnail ➔</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 400, color: '#b9e6fe', marginTop: 2 }}>
                      (Bisa langsung lanjut kapan pun jika kreator merasa naskah sudah cukup)
                    </span>
                  </button>
                </div>
              </div>

              {/* Downstream Results Panels */}
              {/* Audit Results Panel */}
              {showAuditResults && auditFindings && (
                <div
                  className={`audit-results-panel collapsible-section ${isAuditResultsCollapsed ? 'collapsed' : ''}`}
                  onDoubleClick={() => setIsAuditResultsCollapsed((prev) => !prev)}
                  style={{ marginTop: 14 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      background: 'rgba(83, 242, 173, 0.07)',
                      borderBottom: isAuditResultsCollapsed ? 'none' : '1px solid rgba(83, 242, 173, 0.15)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)' }}>
                        <CheckCircle2 size={16} /> Hasil Audit Spoken &amp; TTS
                      </h4>
                      {auditSummary && (
                        <span className="ai-summary-badge" style={{ margin: 0, padding: '2px 10px', fontSize: '0.74rem' }}>
                          <CheckCircle2 size={13} />
                          <span>{auditSummary}</span>
                        </span>
                      )}
                      {isAuditResultsCollapsed && (
                        <span className="collapsed-pill">Ringkas</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`copy-action-btn ${copied === 'findings' ? 'copied' : ''}`}
                        onClick={() => copyText(auditFindings, 'findings')}
                        title="Salin Laporan Temuan"
                      >
                        {copied === 'findings' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied === 'findings' ? 'Tersalin' : 'Copy'}</span>
                      </button>
                      {auditRevisedDraft && (
                        <button
                          type="button"
                          className={`copy-action-btn ${appliedKey === 'audit' ? 'copied' : ''}`}
                          onClick={() => handleApplyToDraft(auditRevisedDraft, 'audit')}
                          title="Terapkan draft revisi ke editor naskah"
                        >
                          <Check size={14} />
                          <span>{appliedKey === 'audit' ? 'Diterapkan' : 'Terapkan'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="copy-action-btn"
                        onClick={() => setIsAuditResultsCollapsed((prev) => !prev)}
                        title={isAuditResultsCollapsed ? 'Buka Hasil Audit' : 'Susutkan Hasil Audit'}
                      >
                        {isAuditResultsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        <span>{isAuditResultsCollapsed ? 'Buka' : 'Susut'}</span>
                      </button>
                    </div>
                  </div>

                  {!isAuditResultsCollapsed && (
                    <>
                      <div className="audit-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <h5 style={{ margin: 0 }}>📋 Laporan Temuan</h5>
                          <button
                            type="button"
                            className={`copy-action-btn ${copied === 'findings' ? 'copied' : ''}`}
                            onClick={() => copyText(auditFindings, 'findings')}
                            title="Salin Laporan Temuan"
                          >
                            {copied === 'findings' ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copied === 'findings' ? 'Tersalin' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="audit-pre">{auditFindings}</pre>
                      </div>

                      {auditRevisedDraft && (
                        <div className="audit-section">
                          <h5>✍️ Draft Revisi</h5>
                          <pre className="audit-pre">{auditRevisedDraft}</pre>
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button
                              type="button"
                              className={`btn ${appliedKey === 'audit' ? 'btn-applied' : 'btn-primary'}`}
                              onClick={() => handleApplyToDraft(auditRevisedDraft, 'audit')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '8px 14px' }}
                            >
                              <Check size={15} /> {appliedKey === 'audit' ? 'Sudah Diterapkan' : 'Terapkan ke Draft'}
                            </button>
                            <button
                              type="button"
                              className={`copy-action-btn ${copied === 'revised' ? 'copied' : ''}`}
                              onClick={() => copyText(auditRevisedDraft, 'revised')}
                              title="Salin Draft Revisi"
                            >
                              {copied === 'revised' ? <Check size={15} /> : <Copy size={15} />}
                              <span>{copied === 'revised' ? 'Tersalin' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Visual Cue Results Section */}
              {showVisualCueResults && annotatedScript && (
                <div
                  className={`audit-results-panel visual-results-panel collapsible-section ${isVisualCueResultsCollapsed ? 'collapsed' : ''}`}
                  onDoubleClick={() => setIsVisualCueResultsCollapsed((prev) => !prev)}
                  style={{ marginTop: 14 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      background: 'rgba(79, 232, 255, 0.07)',
                      borderBottom: isVisualCueResultsCollapsed ? 'none' : '1px solid rgba(79, 232, 255, 0.15)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cyan)' }}>
                        <Film size={16} /> Naskah Teranotasi (Visual Cue &amp; B-Roll)
                      </h4>
                      {visualCueSummary && (
                        <span className="ai-summary-badge visual" style={{ margin: 0, padding: '2px 10px', fontSize: '0.74rem' }}>
                          <Film size={13} />
                          <span>{visualCueSummary}</span>
                        </span>
                      )}
                      {isVisualCueResultsCollapsed && (
                        <span className="collapsed-pill">Ringkas</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`copy-action-btn ${copied === 'vcannot' ? 'copied' : ''}`}
                        onClick={() => copyText(annotatedScript, 'vcannot')}
                        title="Salin Naskah Teranotasi"
                      >
                        {copied === 'vcannot' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied === 'vcannot' ? 'Tersalin' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        className={`copy-action-btn ${appliedKey === 'visual' ? 'copied' : ''}`}
                        onClick={() => handleApplyToDraft(annotatedScript, 'visual')}
                        title="Terapkan naskah teranotasi ke editor naskah"
                      >
                        <Check size={14} />
                        <span>{appliedKey === 'visual' ? 'Diterapkan' : 'Terapkan'}</span>
                      </button>
                      <button
                        type="button"
                        className="copy-action-btn"
                        onClick={() => setIsVisualCueResultsCollapsed((prev) => !prev)}
                        title={isVisualCueResultsCollapsed ? 'Buka Anotasi Visual' : 'Susutkan Anotasi Visual'}
                      >
                        {isVisualCueResultsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        <span>{isVisualCueResultsCollapsed ? 'Buka' : 'Susut'}</span>
                      </button>
                    </div>
                  </div>

                  {!isVisualCueResultsCollapsed && (
                    <div className="audit-section">
                      <pre className="audit-pre">{annotatedScript}</pre>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          type="button"
                          className={`btn ${appliedKey === 'visual' ? 'btn-applied' : 'btn-primary'}`}
                          onClick={() => handleApplyToDraft(annotatedScript, 'visual')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '8px 14px' }}
                        >
                          <Check size={15} /> {appliedKey === 'visual' ? 'Sudah Diterapkan' : 'Terapkan ke Draft'}
                        </button>
                        <button
                          type="button"
                          className={`copy-action-btn ${copied === 'vcannot' ? 'copied' : ''}`}
                          onClick={() => copyText(annotatedScript, 'vcannot')}
                          title="Salin Naskah Teranotasi"
                        >
                          {copied === 'vcannot' ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copied === 'vcannot' ? 'Tersalin' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rekomendasi Judul YouTube (Mode A & Mode B) */}
              {(showTitleCard || titleA || titleB) && (
                <div
                  className="audit-results-panel collapsible-section"
                  style={{ borderColor: 'rgba(249, 199, 79, 0.35)', marginTop: 14 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      background: 'rgba(249, 199, 79, 0.08)',
                      borderBottom: '1px solid rgba(249, 199, 79, 0.2)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--amber)' }}>
                        <Sparkles size={16} /> Rekomendasi Judul YouTube (Mode A &amp; Mode B)
                      </h4>
                      <span className="collapsed-pill" style={{ background: 'rgba(249, 199, 79, 0.12)', color: 'var(--amber)', borderColor: 'rgba(249, 199, 79, 0.3)' }}>
                        Standar Komunitas YouTube
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGenerateTitles}
                        disabled={generatingTitles || loading}
                        style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        title="Generate ulang alternatif judul Mode A & Mode B"
                      >
                        <RotateCw size={13} className={generatingTitles ? 'spin' : ''} />
                        <span>{generatingTitles ? 'Membuat...' : 'Generate Ulang'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="audit-section" style={{ padding: 14 }}>
                    <div className="title-comparison">
                      {/* MODE A */}
                      <div className="title-card" style={{ borderColor: 'rgba(79, 232, 255, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="mode-label" style={{ color: 'var(--cyan)' }}>
                            MODE A — CURIOSITY / INTRIGUE
                          </span>
                          <span className="collapsed-pill" style={{ background: 'rgba(79, 232, 255, 0.1)', color: 'var(--cyan)' }}>
                            {titleA ? `${titleA.trim().split(/\s+/).length} kata • 5–8 Aman Mobile` : '5–8 Kata'}
                          </span>
                        </div>
                        <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 10 }}>
                          {titleA || 'Belum di-generate'}
                        </div>
                        {titleA && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`copy-action-btn ${copied === 'titleA' ? 'copied' : ''}`}
                              onClick={() => copyText(titleA, 'titleA')}
                              title="Salin judul Mode A"
                            >
                              {copied === 'titleA' ? <Check size={13} /> : <Copy size={13} />}
                              <span>{copied === 'titleA' ? 'Tersalin' : 'Copy'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleApplyTitleAsMain(titleA)}
                              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                              title="Gunakan sebagai judul utama konten ini"
                            >
                              Gunakan sbg Judul
                            </button>
                          </div>
                        )}
                      </div>

                      {/* MODE B */}
                      <div className="title-card" style={{ borderColor: 'rgba(153, 133, 255, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="mode-label" style={{ color: 'var(--violet)' }}>
                            MODE B — SEO KEYWORD &amp; AUTHORITY
                          </span>
                          <span className="collapsed-pill" style={{ background: 'rgba(153, 133, 255, 0.1)', color: 'var(--violet)' }}>
                            {titleB ? `${titleB.trim().split(/\s+/).length} kata` : 'High Intent Search'}
                          </span>
                        </div>
                        <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 10 }}>
                          {titleB || 'Belum di-generate'}
                        </div>
                        {titleB && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`copy-action-btn ${copied === 'titleB' ? 'copied' : ''}`}
                              onClick={() => copyText(titleB, 'titleB')}
                              title="Salin judul Mode B"
                            >
                              {copied === 'titleB' ? <Check size={13} /> : <Copy size={13} />}
                              <span>{copied === 'titleB' ? 'Tersalin' : 'Copy'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleApplyTitleAsMain(titleB)}
                              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                              title="Gunakan sebagai judul utama konten ini"
                            >
                              Gunakan sbg Judul
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="workspace-grid">
        
        {/* KOLOM KIRI: Pipeline Naskah */}
        <section className="detail-card glass" style={{ margin: 0 }}>
          <h3 style={{ borderBottom: '1px solid #1a2942', paddingBottom: 10, marginBottom: 16 }}>
            Pipeline Naskah
          </h3>
          
          {/* Research Brief */}
          <div
            className={`detail-section collapsible-section ${isResearchCollapsed ? 'collapsed' : ''}`}
            onDoubleClick={() => setIsResearchCollapsed((prev) => !prev)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isResearchCollapsed ? 0 : 8, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ margin: 0, color: '#c8d6ea', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={16} style={{ color: 'var(--cyan)' }} /> Research Brief
                </h4>
                {isResearchCollapsed && (
                  <span className="collapsed-pill" >
                    Ringkas
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                {(item.status === 'Researching' || item.status === 'Idea' || item.status === 'Validating') && (
                  <button
                    type="button"
                    className="copy-action-btn"
                    onClick={handleRegenerateResearchPrompt}
                    disabled={generatingResearch}
                    title="Generate ulang Research Brief"
                  >
                    <RotateCw size={14} className={generatingResearch ? 'spin' : ''} />
                    <span>{generatingResearch ? 'Memproses...' : (item.research_brief_prompt ? 'Regenerate' : 'Generate Brief')}</span>
                  </button>
                )}
                <button
                  type="button"
                  className={`copy-action-btn ${copied === 'rbp' ? 'copied' : ''}`}
                  onClick={() => copyText(formatPromptText(item.research_brief_prompt || researchBriefPrompt) || '', 'rbp')}
                  title="Salin Research Brief"
                >
                  {copied === 'rbp' ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copied === 'rbp' ? 'Tersalin' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  className="copy-action-btn"
                  onClick={() => setIsResearchCollapsed((prev) => !prev)}
                  title={isResearchCollapsed ? 'Buka tampilan Research Brief' : 'Susutkan tampilan Research Brief'}
                >
                  {isResearchCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  <span>{isResearchCollapsed ? 'Buka' : 'Susut'}</span>
                </button>
              </div>
            </div>
            {!isResearchCollapsed && (
              <div className="prompt-display-box">
                <pre className="prompt-pre">
                  {formatPromptText(item.research_brief_prompt || researchBriefPrompt) || 'Research brief belum di-generate.'}
                </pre>
              </div>
            )}
          </div>

          {((item.status as ContentStatus) === 'Scripting' || item.status === 'Thumbnailing' || item.status === 'Published' || hasGeneratedScriptBrief) && (
            <div
              className={`detail-section collapsible-section ${isHandoffCollapsed ? 'collapsed' : ''}`}
              onDoubleClick={() => setIsHandoffCollapsed((prev) => !prev)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isHandoffCollapsed ? 0 : 8, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h4 style={{ margin: 0, color: '#c8d6ea', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <FileText size={16} style={{ color: 'var(--cyan)' }} /> Scriptwriter Handoff
                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(79, 232, 255, 0.12)', color: 'var(--cyan)', border: '1px solid rgba(79, 232, 255, 0.3)' }}>
                      Outline Dinamis
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(83, 242, 173, 0.12)', color: 'var(--green)', border: '1px solid rgba(83, 242, 173, 0.3)' }}>
                      Spoken-First
                    </span>
                    {isHandoffCollapsed && (
                      <span className="collapsed-pill" >
                        Ringkas
                      </span>
                    )}
                  </h4>
                  {!isHandoffCollapsed && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                      Kerangka Spesifik dari Riset + Panduan Scriptwriter Zeinity
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`copy-action-btn ${copied === 'handoff' ? 'copied' : ''}`}
                    onClick={() => copyText(formatPromptText(item.scriptwriter_brief_prompt || handoffPrompt) || '', 'handoff')}
                    title="Salin Scriptwriter Handoff"
                  >
                    {copied === 'handoff' ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copied === 'handoff' ? 'Tersalin' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    className="copy-action-btn"
                    onClick={() => setIsHandoffCollapsed((prev) => !prev)}
                    title={isHandoffCollapsed ? 'Buka tampilan Scriptwriter Handoff' : 'Susutkan tampilan Scriptwriter Handoff'}
                  >
                    {isHandoffCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    <span>{isHandoffCollapsed ? 'Buka' : 'Susut'}</span>
                  </button>
                </div>
              </div>
              {!isHandoffCollapsed && handoffSummary && (
                <div className="ai-summary-badge handoff" style={{ marginBottom: 10, marginTop: 4 }}>
                  <CheckCircle2 size={15} />
                  <span>{handoffSummary}</span>
                </div>
              )}
              {!isHandoffCollapsed && (
                <div className="prompt-display-box">
                  <pre className="prompt-pre">
                    {formatPromptText(item.scriptwriter_brief_prompt || handoffPrompt) || 'Handoff belum di-generate.'}
                  </pre>
                </div>
              )}
            </div>
          )}

          {(item.status === 'Thumbnailing' || item.status === 'Published' || hasGeneratedThumbnail) && (
            <div className="detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <h4 style={{ margin: 0, color: '#c8d6ea', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={16} style={{ color: 'var(--cyan)' }} /> Thumbnail Generator
                </h4>
                <button
                  type="button"
                  className={`copy-action-btn ${copied === 'tp' ? 'copied' : ''}`}
                  onClick={() => copyText(formatPromptText(item.generated_thumbnail_prompt || thumbnailPrompt) || '', 'tp')}
                  title="Salin Thumbnail Generator"
                >
                  {copied === 'tp' ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copied === 'tp' ? 'Tersalin' : 'Copy'}</span>
                </button>
              </div>
              <div className="prompt-display-box">
                <pre className="prompt-pre">
                  {formatPromptText(item.generated_thumbnail_prompt || thumbnailPrompt) || 'Thumbnail belum di-generate.'}
                </pre>
              </div>
            </div>
          )}
        </section>

        {/* KOLOM KANAN: User Input / Draft Studio */}
        <section className="detail-card glass" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ borderBottom: '1px solid #1a2942', paddingBottom: 10, marginBottom: 16 }}>
            Draft Studio
          </h3>

          {(item.status === 'Idea' || item.status === 'Validating') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 260, padding: '24px 12px' }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(79, 232, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                color: 'var(--cyan)'
              }}>
                <Lightbulb size={28} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#e2edff' }}>Tahap Konsep & Ide</h3>
              <p style={{ color: '#7890af', maxWidth: 440, fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 18 }}>
                Konten ini berada pada tahap <strong>{item.status}</strong>. Anda dapat mengulas Research Brief di samping, lalu melanjutkan ke tahap riset komprehensif.
              </p>
              
              {item.research_text && (
                <div style={{
                  width: '100%',
                  maxWidth: 480,
                  textAlign: 'left',
                  background: '#0a101d',
                  border: '1px solid #1a2942',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 20,
                  fontSize: '0.84rem',
                  color: '#c8d6ea'
                }}>
                  <strong style={{ color: 'var(--cyan)', display: 'block', marginBottom: 4 }}>Konteks / Catatan Awal:</strong>
                  {item.research_text}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={onBack}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ArrowLeft size={16} /> Kembali ke Ide
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={async () => {
                    await handleStatusChange('Researching');
                    if (!item.research_brief_prompt) {
                      await handleRegenerateResearchPrompt();
                    }
                  }}
                  disabled={loading || generatingResearch}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px' }}
                  title="Pindah ke tahap riset dan siapkan workspace riset"
                >
                  {generatingResearch ? (
                    <>
                      <Loader2 size={16} className="spin" /> Menyiapkan Riset...
                    </>
                  ) : (
                    <>
                      Mulai Riset (Lanjut ke Researching) <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {item.status === 'Researching' && (
            <>
              <p style={{ fontSize: '0.85rem', color: '#7890af', marginBottom: 12 }}>
                Masukkan hasil riset dari ChatGPT/Claude. Anda dapat mengetik/menempelkan teks langsung atau mengunggah berkas .md (otomatis di-backup):
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {/* Opsi 1: Ketik / Paste Teks */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c8d6ea', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={15} style={{ color: 'var(--cyan)' }} />
                      <span>
                        {uploadedResearchFileName ? 'Pratinjau & Edit Teks Riset:' : 'Opsi 1: Ketik / Paste Teks'}
                      </span>
                    </div>
                    {renderSaveIndicator(researchSaveStatus)}
                  </div>
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: 220,
                      background: '#0a101d',
                      border: '1px solid #1a2942',
                      color: '#c8d6ea',
                      padding: 12,
                      borderRadius: 8,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      lineHeight: 1.6,
                      boxSizing: 'border-box'
                    }}
                    value={researchOutput}
                    onChange={(e) => setResearchOutput(e.target.value)}
                    onBlur={() => {
                      if (researchOutput !== lastSavedResearchRef.current) {
                        const textToSave = researchOutput;
                        setResearchSaveStatus('saving');
                        onUpdate(item.id, { external_research_output: textToSave }).then(() => {
                          lastSavedResearchRef.current = textToSave;
                          if (researchOutputRef.current === textToSave) {
                            setResearchSaveStatus('saved');
                            setTimeout(() => {
                              setResearchSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
                            }, 2500);
                          } else {
                            setResearchSaveStatus('unsaved');
                          }
                        }).catch(() => {
                          setResearchSaveStatus('unsaved');
                        });
                      }
                    }}
                    placeholder="Ketik atau tempel (paste) hasil riset AI eksternal di sini..."
                  />
                </div>

                {/* Opsi 2: Upload Berkas .DOCX / .MD */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c8d6ea', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UploadCloud size={15} style={{ color: 'var(--cyan)' }} />
                    <span>Opsi 2: Upload Berkas (.docx / .md)</span>
                  </div>
                  <label
                    style={{
                      width: '100%',
                      height: 190,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: 16,
                      background: isDraggingResearch ? 'rgba(79, 232, 255, 0.12)' : uploadedResearchFileName ? 'rgba(83, 242, 173, 0.04)' : '#0a101d',
                      border: isDraggingResearch ? '2px dashed var(--cyan)' : uploadedResearchFileName ? '1px solid rgba(83, 242, 173, 0.4)' : '1px dashed #2a3b5c',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: '#c8d6ea',
                      transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
                      transform: isDraggingResearch ? 'scale(1.01)' : 'scale(1)',
                      boxShadow: isDraggingResearch ? '0 0 16px rgba(79, 232, 255, 0.2)' : 'none',
                      boxSizing: 'border-box'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingResearch(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingResearch(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingResearch(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingResearch(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleMdFileUpload(f, true);
                    }}
                    onMouseEnter={(e) => {
                      if (!isDraggingResearch && !uploadedResearchFileName) {
                        e.currentTarget.style.borderColor = 'var(--cyan)';
                        e.currentTarget.style.background = 'rgba(79, 232, 255, 0.04)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDraggingResearch && !uploadedResearchFileName) {
                        e.currentTarget.style.borderColor = '#2a3b5c';
                        e.currentTarget.style.background = '#0a101d';
                      }
                    }}
                  >
                    {uploadedResearchFileName ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: 'rgba(83, 242, 173, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 8,
                          color: 'var(--green)',
                        }}>
                          <CheckCircle2 size={24} />
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2edff', marginBottom: 4, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={uploadedResearchFileName}>
                          {uploadedResearchFileName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--green)', marginBottom: 8 }}>
                          ✓ Berkas Aktif & Ter-backup ke DB
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', textDecoration: 'underline' }}>
                          Klik untuk ganti berkas
                        </span>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: isDraggingResearch ? 'rgba(79, 232, 255, 0.2)' : 'rgba(79, 232, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 10,
                          color: 'var(--cyan)',
                        }}>
                          <UploadCloud size={22} />
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2edff', marginBottom: 4 }}>
                          {isDraggingResearch ? 'Lepaskan Berkas di Sini...' : 'Klik atau Tarik Berkas .docx / .md ke Sini'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#7890af', maxWidth: 220, lineHeight: 1.4 }}>
                          Format didukung <strong>.docx (Word)</strong>, <strong>.md</strong>, atau <strong>.txt</strong>. Otomatis mengisi input & di-backup ke database.
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".docx,.md,.markdown,.txt"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleMdFileUpload(f, true);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Status info & Action bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: '1 1 auto', minWidth: 240 }}>
                  {uploadedResearchFileName && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      background: 'rgba(83, 242, 173, 0.12)',
                      border: '1px solid rgba(83, 242, 173, 0.3)',
                      borderRadius: 6,
                      color: 'var(--green)',
                      fontSize: '0.8rem',
                    }}>
                      <CheckCircle2 size={14} /> Berkas <strong>"{uploadedResearchFileName}"</strong> dimuat & di-backup ke database ({researchOutput.length.toLocaleString('id-ID')} karakter)
                    </div>
                  )}
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary revert-stage-btn"
                    type="button"
                    onClick={() => handleStatusChange('Idea')}
                    disabled={loading || generatingHandoff || generatingResearch}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fcd34d' }}
                    title="Kembalikan status pipeline ke tahap Idea"
                  >
                    <Undo2 size={16} /> Revert ke Idea
                  </button>
                  {hasGeneratedScriptBrief && (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handleGenerateHandoff(false)}
                      disabled={loading || generatingHandoff}
                      style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', fontSize: '0.9rem' }}
                      title="Generate ulang Scriptwriter Handoff berdasarkan data riset terbaru"
                    >
                      <RotateCw size={16} className={generatingHandoff ? 'spin' : ''} />
                      {generatingHandoff ? 'Meregenerasi...' : 'Generate Ulang Handoff'}
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={hasGeneratedScriptBrief ? handleProceedToScripting : () => handleGenerateHandoff(false)}
                    disabled={loading || generatingHandoff}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', fontSize: '0.9rem' }}
                  >
                    {generatingHandoff ? (
                      <>
                        <Loader2 size={16} className="spin" /> Memproses...
                      </>
                    ) : hasGeneratedScriptBrief ? (
                      <>
                        Lanjut ke Scripting <ArrowRight size={16} />
                      </>
                    ) : (
                      <>
                        Lanjut: Generate Scriptwriter Handoff <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {((item.status as ContentStatus) === 'Scripting') && (
            <>
              {/* Area Input Naskah (Collapsible: Opsi 1 & Opsi 2) */}
              {isScriptInputCollapsed ? (
                <div
                  className="collapsible-section collapsed"
                  onDoubleClick={() => setIsScriptInputCollapsed(false)}
                  style={{ marginBottom: 14 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, color: '#c8d6ea', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={16} style={{ color: 'var(--cyan)' }} />
                        <span>Draf Naskah Video</span>
                      </h4>
                      <span className="collapsed-pill" >
                        Ringkas
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#7890af' }}>
                        {scriptOutput.trim().length.toLocaleString('id-ID')} karakter
                        {scriptOutput.trim() ? ` (${scriptOutput.trim().split(/\s+/).filter(Boolean).length.toLocaleString('id-ID')} kata)` : ''}
                      </span>
                      {renderSaveIndicator(scriptSaveStatus)}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="editor-maximize-btn"
                        onClick={() => setIsScriptMaximized(true)}
                        title="Perbesar / Maximize Editor Naskah"
                      >
                        <Maximize2 size={13} />
                        <span>Maximize</span>
                      </button>
                      <button
                        type="button"
                        className="copy-action-btn"
                        onClick={() => setIsScriptInputCollapsed(false)}
                        title="Buka Editor Naskah"
                      >
                        <ChevronDown size={14} />
                        <span>Buka</span>
                      </button>
                    </div>
                  </div>
                  {scriptOutput.trim() ? (
                    <div style={{
                      marginTop: 6,
                      fontSize: '0.82rem',
                      color: '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontStyle: 'italic',
                      opacity: 0.85
                    }}>
                      "{scriptOutput.trim().replace(/\s+/g, ' ').slice(0, 110)}..."
                    </div>
                  ) : (
                    <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>
                      (Draf naskah masih kosong)
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                    <p style={{ fontSize: '0.85rem', color: '#7890af', margin: 0 }}>
                      Masukkan draft naskah (Script) dari ChatGPT/Claude. Anda dapat mengetik/menempelkan teks langsung atau mengunggah berkas .md:
                    </p>
                    {(showAuditResults || showVisualCueResults || scriptOutput.trim().length > 0) && (
                      <button
                        type="button"
                        className="copy-action-btn"
                        onClick={() => setIsScriptInputCollapsed(true)}
                        title="Susutkan Editor Naskah menjadi kartu ringkas"
                      >
                        <ChevronUp size={14} />
                        <span>Susutkan</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    {/* Opsi 1: Ketik / Paste Naskah */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c8d6ea', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={15} style={{ color: 'var(--cyan)' }} />
                          <span>
                            {uploadedScriptFileName ? 'Pratinjau & Edit Teks Naskah:' : 'Opsi 1: Ketik / Paste Naskah'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {renderSaveIndicator(scriptSaveStatus)}
                          {draftHistory.length > 0 && (
                            <button
                              type="button"
                              className="editor-maximize-btn"
                              onClick={handleUndoLatestAiRevision}
                              title="Undo revisi AI terakhir dan kembalikan draf sebelum revisi"
                              style={{ color: '#fcd34d' }}
                            >
                              <Undo2 size={13} />
                              <span>Undo Revisi AI</span>
                            </button>
                          )}
                          {draftHistory.length > 0 && (
                            <button
                              type="button"
                              className="editor-maximize-btn"
                              onClick={() => setShowDraftHistoryModal(true)}
                              title="Lihat riwayat snapshot draf"
                            >
                              <Clock size={13} />
                              <span>Riwayat Draf ({draftHistory.length})</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="editor-maximize-btn"
                            onClick={() => setIsScriptMaximized(true)}
                            title="Perbesar / Maximize Editor Naskah"
                          >
                            <Maximize2 size={13} />
                            <span>Maximize</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        ref={scriptTextareaRef}
                        className={isDraftHighlighted ? 'draft-highlight-pulse' : ''}
                        style={{
                          width: '100%',
                          minHeight: 260,
                          background: '#0a101d',
                          border: '1px solid #1a2942',
                          color: '#c8d6ea',
                          padding: 12,
                          borderRadius: 8,
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          lineHeight: 1.6,
                          boxSizing: 'border-box'
                        }}
                        value={scriptOutput}
                        onChange={(e) => setScriptOutput(e.target.value)}
                        onBlur={() => {
                          if (scriptOutput !== lastSavedScriptRef.current) {
                            const textToSave = scriptOutput;
                            setScriptSaveStatus('saving');
                            onUpdate(item.id, { external_script_output: textToSave }).then(() => {
                              lastSavedScriptRef.current = textToSave;
                              if (scriptOutputRef.current === textToSave) {
                                setScriptSaveStatus('saved');
                                setTimeout(() => {
                                  setScriptSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
                                }, 2500);
                              } else {
                                setScriptSaveStatus('unsaved');
                              }
                            }).catch(() => {
                              setScriptSaveStatus('unsaved');
                            });
                          }
                        }}
                        placeholder="Draft naskah AI eksternal..."
                      />
                    </div>

                    {/* Opsi 2: Upload Berkas .DOCX / .MD Naskah */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c8d6ea', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <UploadCloud size={15} style={{ color: 'var(--cyan)' }} />
                        <span>Opsi 2: Upload Naskah (.docx / .md)</span>
                      </div>
                      <label
                        style={{
                          width: '100%',
                          height: 190,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          padding: 16,
                          background: isDraggingScript ? 'rgba(79, 232, 255, 0.12)' : uploadedScriptFileName ? 'rgba(83, 242, 173, 0.04)' : '#0a101d',
                          border: isDraggingScript ? '2px dashed var(--cyan)' : uploadedScriptFileName ? '1px solid rgba(83, 242, 173, 0.4)' : '1px dashed #2a3b5c',
                          borderRadius: 8,
                          cursor: 'pointer',
                          color: '#c8d6ea',
                          transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
                          transform: isDraggingScript ? 'scale(1.01)' : 'scale(1)',
                          boxShadow: isDraggingScript ? '0 0 16px rgba(79, 232, 255, 0.2)' : 'none',
                          boxSizing: 'border-box'
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingScript(true);
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingScript(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingScript(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingScript(false);
                          const f = e.dataTransfer.files?.[0];
                          if (f) handleMdFileUpload(f, false);
                        }}
                        onMouseEnter={(e) => {
                          if (!isDraggingScript && !uploadedScriptFileName) {
                            e.currentTarget.style.borderColor = 'var(--cyan)';
                            e.currentTarget.style.background = 'rgba(79, 232, 255, 0.04)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDraggingScript && !uploadedScriptFileName) {
                            e.currentTarget.style.borderColor = '#2a3b5c';
                            e.currentTarget.style.background = '#0a101d';
                          }
                        }}
                      >
                        {uploadedScriptFileName ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8 }}>
                            <div style={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              background: 'rgba(83, 242, 173, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: 8,
                              color: 'var(--green)',
                            }}>
                              <CheckCircle2 size={24} />
                            </div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2edff', marginBottom: 4, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={uploadedScriptFileName}>
                              {uploadedScriptFileName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--green)', marginBottom: 8 }}>
                              ✓ Berkas Aktif & Ter-backup ke DB
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', textDecoration: 'underline' }}>
                              Klik untuk ganti berkas
                            </span>
                          </div>
                        ) : (
                          <>
                            <div style={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              background: isDraggingScript ? 'rgba(79, 232, 255, 0.2)' : 'rgba(79, 232, 255, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: 10,
                              color: 'var(--cyan)',
                            }}>
                              <UploadCloud size={22} />
                            </div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2edff', marginBottom: 4 }}>
                              {isDraggingScript ? 'Lepaskan Berkas di Sini...' : 'Klik atau Tarik Berkas .docx / .md ke Sini'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#7890af', maxWidth: 220, lineHeight: 1.4 }}>
                              Format didukung <strong>.docx (Word)</strong>, <strong>.md</strong>, atau <strong>.txt</strong>. Otomatis mengisi input & di-backup ke database.
                            </div>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".docx,.md,.markdown,.txt"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleMdFileUpload(f, false);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Status info & Action bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: '1 1 auto', minWidth: 240 }}>
                  {uploadedScriptFileName && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      background: 'rgba(83, 242, 173, 0.12)',
                      border: '1px solid rgba(83, 242, 173, 0.3)',
                      borderRadius: 6,
                      color: 'var(--green)',
                      fontSize: '0.8rem',
                    }}>
                      <CheckCircle2 size={14} /> Berkas <strong>"{uploadedScriptFileName}"</strong> dimuat & di-backup ke database ({scriptOutput.length.toLocaleString('id-ID')} karakter)
                    </div>
                  )}
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary revert-stage-btn"
                    type="button"
                    onClick={() => handleStatusChange('Researching')}
                    disabled={loading || generatingAudit || generatingVisualCue || generatingThumbnail}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fcd34d' }}
                    title="Kembalikan status pipeline ke tahap Riset (Researching)"
                  >
                    <Undo2 size={16} /> Revert ke Researching
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleRunAudit}
                    disabled={generatingAudit || loading || generatingVisualCue}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Audit kelayakan tutur lisan dan prosodi AI TTS untuk naskah ini"
                  >
                    {generatingAudit ? (
                      <>
                        <Loader2 size={15} className="spin" /> Mengaudit...
                      </>
                    ) : (
                      'Audit Spoken & TTS ✨'
                    )}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleRunVisualCueAnnotation}
                    disabled={generatingVisualCue || loading || generatingAudit}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Anotasi visual cue dan b-roll director secara langsung pada naskah"
                  >
                    {generatingVisualCue ? (
                      <>
                        <Loader2 size={15} className="spin" /> Menganotasi...
                      </>
                    ) : (
                      'Anotasi Visual Cue ✨'
                    )}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleGenerateTitles}
                    disabled={generatingTitles || loading || generatingAudit || generatingVisualCue}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Generate 2 alternatif judul YouTube: Mode A (5-8 kata) & Mode B (SEO Keyword)"
                  >
                    {generatingTitles ? (
                      <>
                        <Loader2 size={15} className="spin" /> Membuat Judul...
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} style={{ color: 'var(--amber)' }} /> Buat Judul A/B ✨
                      </>
                    )}
                  </button>
                  {hasGeneratedThumbnail && (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handleGenerateThumbnail(false)}
                      disabled={loading || generatingThumbnail || generatingAudit || generatingVisualCue}
                      style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', fontSize: '0.9rem' }}
                      title="Generate ulang Thumbnail Copy Prompt berdasarkan naskah terbaru"
                    >
                      <RotateCw size={16} className={generatingThumbnail ? 'spin' : ''} />
                      {generatingThumbnail ? 'Meregenerasi...' : 'Generate Ulang Thumbnail'}
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={hasGeneratedThumbnail ? handleProceedToThumbnailing : () => handleGenerateThumbnail(false)}
                    disabled={loading || generatingAudit || generatingVisualCue || generatingThumbnail}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', fontSize: '0.9rem' }}
                  >
                    {generatingThumbnail ? (
                      <>
                        <Loader2 size={16} className="spin" /> Memproses...
                      </>
                    ) : hasGeneratedThumbnail ? (
                      <>
                        Lanjut ke Thumbnailing <ArrowRight size={16} />
                      </>
                    ) : (
                      <>
                        Lanjut: Generate Thumbnail <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Rekomendasi Judul YouTube (Mode A & Mode B) */}
              {(showTitleCard || titleA || titleB) && (
                <div
                  className="audit-results-panel collapsible-section"
                  style={{ borderColor: 'rgba(249, 199, 79, 0.35)', marginTop: 14 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      background: 'rgba(249, 199, 79, 0.08)',
                      borderBottom: '1px solid rgba(249, 199, 79, 0.2)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--amber)' }}>
                        <Sparkles size={16} /> Rekomendasi Judul YouTube (Mode A & Mode B)
                      </h4>
                      <span className="collapsed-pill" style={{ background: 'rgba(249, 199, 79, 0.12)', color: 'var(--amber)', borderColor: 'rgba(249, 199, 79, 0.3)' }}>
                        Standar Komunitas YouTube
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGenerateTitles}
                        disabled={generatingTitles || loading}
                        style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        title="Generate ulang alternatif judul Mode A & Mode B"
                      >
                        <RotateCw size={13} className={generatingTitles ? 'spin' : ''} />
                        <span>{generatingTitles ? 'Membuat...' : 'Generate Ulang'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="audit-section" style={{ padding: 14 }}>
                    <div className="title-comparison">
                      {/* MODE A */}
                      <div className="title-card" style={{ borderColor: 'rgba(79, 232, 255, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="mode-label" style={{ color: 'var(--cyan)' }}>
                            MODE A — CURIOSITY / INTRIGUE
                          </span>
                          <span className="collapsed-pill" style={{ background: 'rgba(79, 232, 255, 0.1)', color: 'var(--cyan)' }}>
                            {titleA ? `${titleA.trim().split(/\s+/).length} kata • 5–8 Aman Mobile` : '5–8 Kata'}
                          </span>
                        </div>
                        <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 10 }}>
                          {titleA || 'Belum di-generate'}
                        </div>
                        {titleA && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`copy-action-btn ${copied === 'titleA' ? 'copied' : ''}`}
                              onClick={() => copyText(titleA, 'titleA')}
                              title="Salin judul Mode A"
                            >
                              {copied === 'titleA' ? <Check size={13} /> : <Copy size={13} />}
                              <span>{copied === 'titleA' ? 'Tersalin' : 'Copy'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleApplyTitleAsMain(titleA)}
                              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                              title="Gunakan sebagai judul utama konten ini"
                            >
                              Gunakan sbg Judul
                            </button>
                          </div>
                        )}
                      </div>

                      {/* MODE B */}
                      <div className="title-card" style={{ borderColor: 'rgba(153, 133, 255, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="mode-label" style={{ color: 'var(--violet)' }}>
                            MODE B — SEO KEYWORD & AUTHORITY
                          </span>
                          <span className="collapsed-pill" style={{ background: 'rgba(153, 133, 255, 0.1)', color: 'var(--violet)' }}>
                            {titleB ? `${titleB.trim().split(/\s+/).length} kata` : 'High Intent Search'}
                          </span>
                        </div>
                        <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 10 }}>
                          {titleB || 'Belum di-generate'}
                        </div>
                        {titleB && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`copy-action-btn ${copied === 'titleB' ? 'copied' : ''}`}
                              onClick={() => copyText(titleB, 'titleB')}
                              title="Salin judul Mode B"
                            >
                              {copied === 'titleB' ? <Check size={13} /> : <Copy size={13} />}
                              <span>{copied === 'titleB' ? 'Tersalin' : 'Copy'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleApplyTitleAsMain(titleB)}
                              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                              title="Gunakan sebagai judul utama konten ini"
                            >
                              Gunakan sbg Judul
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit Results Section */}
              {showAuditResults && (
                <div
                  className={`audit-results-panel collapsible-section ${isAuditResultsCollapsed ? 'collapsed' : ''}`}
                  onDoubleClick={() => setIsAuditResultsCollapsed((prev) => !prev)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      background: 'rgba(83, 242, 173, 0.07)',
                      borderBottom: isAuditResultsCollapsed ? 'none' : '1px solid rgba(83, 242, 173, 0.15)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)' }}>
                        <CheckCircle2 size={16} /> Hasil Audit Spoken & TTS
                      </h4>
                      {auditSummary && (
                        <span className="ai-summary-badge" style={{ margin: 0, padding: '2px 10px', fontSize: '0.74rem' }}>
                          <CheckCircle2 size={13} />
                          <span>{auditSummary}</span>
                        </span>
                      )}
                      {isAuditResultsCollapsed && (
                        <span className="collapsed-pill" >
                          Ringkas
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`copy-action-btn ${copied === 'findings' ? 'copied' : ''}`}
                        onClick={() => copyText(auditFindings, 'findings')}
                        title="Salin Laporan Temuan"
                      >
                        {copied === 'findings' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied === 'findings' ? 'Tersalin' : 'Copy'}</span>
                      </button>
                      {auditRevisedDraft && (
                        <button
                          type="button"
                          className={`copy-action-btn ${appliedKey === 'audit' ? 'copied' : ''}`}
                          onClick={() => handleApplyToDraft(auditRevisedDraft, 'audit')}
                          title="Terapkan draft revisi ke editor naskah"
                        >
                          <Check size={14} />
                          <span>{appliedKey === 'audit' ? 'Diterapkan' : 'Terapkan'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="copy-action-btn"
                        onClick={() => setIsAuditResultsCollapsed((prev) => !prev)}
                        title={isAuditResultsCollapsed ? 'Buka Hasil Audit' : 'Susutkan Hasil Audit'}
                      >
                        {isAuditResultsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        <span>{isAuditResultsCollapsed ? 'Buka' : 'Susut'}</span>
                      </button>
                    </div>
                  </div>

                  {!isAuditResultsCollapsed && (
                    <>
                      <div className="audit-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <h5 style={{ margin: 0 }}>📋 Laporan Temuan</h5>
                          <button
                            type="button"
                            className={`copy-action-btn ${copied === 'findings' ? 'copied' : ''}`}
                            onClick={() => copyText(auditFindings, 'findings')}
                            title="Salin Laporan Temuan"
                          >
                            {copied === 'findings' ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copied === 'findings' ? 'Tersalin' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="audit-pre">{auditFindings}</pre>
                      </div>

                      {auditRevisedDraft && (
                        <div className="audit-section">
                          <h5>✍️ Draft Revisi</h5>
                          <pre className="audit-pre">{auditRevisedDraft}</pre>
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button
                              type="button"
                              className={`btn ${appliedKey === 'audit' ? 'btn-applied' : 'btn-primary'}`}
                              onClick={() => handleApplyToDraft(auditRevisedDraft, 'audit')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '8px 14px' }}
                            >
                              <Check size={15} /> {appliedKey === 'audit' ? 'Sudah Diterapkan' : 'Terapkan ke Draft'}
                            </button>
                            <button
                              type="button"
                              className={`copy-action-btn ${copied === 'revised' ? 'copied' : ''}`}
                              onClick={() => copyText(auditRevisedDraft, 'revised')}
                              title="Salin Draft Revisi"
                            >
                              {copied === 'revised' ? <Check size={15} /> : <Copy size={15} />}
                              <span>{copied === 'revised' ? 'Tersalin' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Visual Cue Results Section */}
              {showVisualCueResults && (
                <div
                  className={`audit-results-panel visual-results-panel collapsible-section ${isVisualCueResultsCollapsed ? 'collapsed' : ''}`}
                  onDoubleClick={() => setIsVisualCueResultsCollapsed((prev) => !prev)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      background: 'rgba(79, 232, 255, 0.07)',
                      borderBottom: isVisualCueResultsCollapsed ? 'none' : '1px solid rgba(79, 232, 255, 0.15)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cyan)' }}>
                        <Film size={16} /> Naskah Teranotasi (Visual Cue & B-Roll)
                      </h4>
                      {visualCueSummary && (
                        <span className="ai-summary-badge visual" style={{ margin: 0, padding: '2px 10px', fontSize: '0.74rem' }}>
                          <Film size={13} />
                          <span>{visualCueSummary}</span>
                        </span>
                      )}
                      {isVisualCueResultsCollapsed && (
                        <span className="collapsed-pill" >
                          Ringkas
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`copy-action-btn ${copied === 'vcannot' ? 'copied' : ''}`}
                        onClick={() => copyText(annotatedScript, 'vcannot')}
                        title="Salin Naskah Teranotasi"
                      >
                        {copied === 'vcannot' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied === 'vcannot' ? 'Tersalin' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        className={`copy-action-btn ${appliedKey === 'visual' ? 'copied' : ''}`}
                        onClick={() => handleApplyToDraft(annotatedScript, 'visual')}
                        title="Terapkan naskah teranotasi ke editor naskah"
                      >
                        <Check size={14} />
                        <span>{appliedKey === 'visual' ? 'Diterapkan' : 'Terapkan'}</span>
                      </button>
                      <button
                        type="button"
                        className="copy-action-btn"
                        onClick={() => setIsVisualCueResultsCollapsed((prev) => !prev)}
                        title={isVisualCueResultsCollapsed ? 'Buka Anotasi Visual' : 'Susutkan Anotasi Visual'}
                      >
                        {isVisualCueResultsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        <span>{isVisualCueResultsCollapsed ? 'Buka' : 'Susut'}</span>
                      </button>
                    </div>
                  </div>

                  {!isVisualCueResultsCollapsed && (
                    <div className="audit-section">
                      <pre className="audit-pre">{annotatedScript}</pre>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          type="button"
                          className={`btn ${appliedKey === 'visual' ? 'btn-applied' : 'btn-primary'}`}
                          onClick={() => handleApplyToDraft(annotatedScript, 'visual')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '8px 14px' }}
                        >
                          <Check size={15} /> {appliedKey === 'visual' ? 'Sudah Diterapkan' : 'Terapkan ke Draft'}
                        </button>
                        <button
                          type="button"
                          className={`copy-action-btn ${copied === 'vcannot' ? 'copied' : ''}`}
                          onClick={() => copyText(annotatedScript, 'vcannot')}
                          title="Salin Naskah Teranotasi"
                        >
                          {copied === 'vcannot' ? <Check size={15} /> : <Copy size={15} />}
                          <span>{copied === 'vcannot' ? 'Tersalin' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {item.status === 'Thumbnailing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Thumbnail Action Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 12px', background: 'rgba(3, 12, 31, 0.4)', borderRadius: 12, border: '1px solid #1a2942' }}>
                <p style={{ color: '#c8d6ea', marginBottom: 16, fontSize: '0.9rem' }}>
                  Gunakan Thumbnail Prompt di samping untuk membuat gambar thumbnail.<br/>Jika konten sudah selesai dan diupload ke YouTube, tandai sebagai Published.
                </p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    className="btn btn-secondary revert-stage-btn"
                    type="button"
                    onClick={() => handleStatusChange('Scripting')}
                    disabled={loading || generatingThumbnail}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: '0.88rem', color: '#fcd34d' }}
                    title="Kembalikan status pipeline ke tahap Naskah (Scripting)"
                  >
                    <Undo2 size={16} /> Revert ke Scripting
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => handleGenerateThumbnail(false)}
                    disabled={loading || generatingThumbnail}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', fontSize: '0.88rem' }}
                    title="Generate ulang Thumbnail Copy Prompt berdasarkan naskah"
                  >
                    <RotateCw size={15} className={generatingThumbnail ? 'spin' : ''} />
                    {generatingThumbnail ? 'Meregenerasi...' : 'Generate Ulang Thumbnail'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={handleGenerateTitles}
                    disabled={generatingTitles || loading}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: '0.88rem' }}
                    title="Generate atau perbarui judul Mode A & Mode B"
                  >
                    <Sparkles size={15} style={{ color: 'var(--amber)' }} />
                    {generatingTitles ? 'Membuat Judul...' : 'Buat Judul A/B ✨'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handlePublish}
                    disabled={loading || generatingThumbnail}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: '0.88rem' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="spin" /> Memproses...
                      </>
                    ) : (
                      <>
                        Tandai Selesai (Publish) <Check size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Title Card (Mode A & Mode B) in Thumbnailing */}
              {(showTitleCard || titleA || titleB) && (
                <div
                  className="audit-results-panel collapsible-section"
                  style={{ borderColor: 'rgba(249, 199, 79, 0.35)' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      background: 'rgba(249, 199, 79, 0.08)',
                      borderBottom: '1px solid rgba(249, 199, 79, 0.2)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--amber)' }}>
                        <Sparkles size={16} /> Rekomendasi Judul YouTube (Mode A & Mode B)
                      </h4>
                      <span className="collapsed-pill" style={{ background: 'rgba(249, 199, 79, 0.12)', color: 'var(--amber)', borderColor: 'rgba(249, 199, 79, 0.3)' }}>
                        Standar Komunitas YouTube
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGenerateTitles}
                        disabled={generatingTitles || loading}
                        style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        title="Generate ulang alternatif judul Mode A & Mode B"
                      >
                        <RotateCw size={13} className={generatingTitles ? 'spin' : ''} />
                        <span>{generatingTitles ? 'Membuat...' : 'Generate Ulang'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="audit-section" style={{ padding: 14 }}>
                    <div className="title-comparison">
                      {/* MODE A */}
                      <div className="title-card" style={{ borderColor: 'rgba(79, 232, 255, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="mode-label" style={{ color: 'var(--cyan)' }}>
                            MODE A — CURIOSITY / INTRIGUE
                          </span>
                          <span className="collapsed-pill" style={{ background: 'rgba(79, 232, 255, 0.1)', color: 'var(--cyan)' }}>
                            {titleA ? `${titleA.trim().split(/\s+/).length} kata • 5–8 Aman Mobile` : '5–8 Kata'}
                          </span>
                        </div>
                        <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 10 }}>
                          {titleA || 'Belum di-generate'}
                        </div>
                        {titleA && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`copy-action-btn ${copied === 'titleA' ? 'copied' : ''}`}
                              onClick={() => copyText(titleA, 'titleA')}
                              title="Salin judul Mode A"
                            >
                              {copied === 'titleA' ? <Check size={13} /> : <Copy size={13} />}
                              <span>{copied === 'titleA' ? 'Tersalin' : 'Copy'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleApplyTitleAsMain(titleA)}
                              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                              title="Gunakan sebagai judul utama konten ini"
                            >
                              Gunakan sbg Judul
                            </button>
                          </div>
                        )}
                      </div>

                      {/* MODE B */}
                      <div className="title-card" style={{ borderColor: 'rgba(153, 133, 255, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="mode-label" style={{ color: 'var(--violet)' }}>
                            MODE B — SEO KEYWORD & AUTHORITY
                          </span>
                          <span className="collapsed-pill" style={{ background: 'rgba(153, 133, 255, 0.1)', color: 'var(--violet)' }}>
                            {titleB ? `${titleB.trim().split(/\s+/).length} kata` : 'High Intent Search'}
                          </span>
                        </div>
                        <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 10 }}>
                          {titleB || 'Belum di-generate'}
                        </div>
                        {titleB && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`copy-action-btn ${copied === 'titleB' ? 'copied' : ''}`}
                              onClick={() => copyText(titleB, 'titleB')}
                              title="Salin judul Mode B"
                            >
                              {copied === 'titleB' ? <Check size={13} /> : <Copy size={13} />}
                              <span>{copied === 'titleB' ? 'Tersalin' : 'Copy'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleApplyTitleAsMain(titleB)}
                              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                              title="Gunakan sebagai judul utama konten ini"
                            >
                              Gunakan sbg Judul
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Kontinuitas Naskah: Collapsible Read-Only Script Viewer */}
              <div
                className={`audit-results-panel collapsible-section ${isThumbnailScriptCollapsed ? 'collapsed' : ''}`}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    background: 'rgba(79, 232, 255, 0.08)',
                    borderBottom: isThumbnailScriptCollapsed ? 'none' : '1px solid rgba(79, 232, 255, 0.15)',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cyan)' }}>
                      <FileText size={16} /> Naskah Video Final (Read-Only Viewer)
                    </h4>
                    <span className="collapsed-pill">
                      {scriptOutput.trim() ? scriptOutput.trim().split(/\s+/).length.toLocaleString('id-ID') : 0} kata • {scriptOutput.length.toLocaleString('id-ID')} karakter
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`copy-action-btn ${copied === 'thumbScript' ? 'copied' : ''}`}
                      onClick={() => copyText(scriptOutput, 'thumbScript')}
                      title="Salin Naskah Video"
                    >
                      {copied === 'thumbScript' ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied === 'thumbScript' ? 'Tersalin' : 'Copy Naskah'}</span>
                    </button>
                    <button
                      type="button"
                      className="copy-action-btn"
                      onClick={() => handleDownloadFile(scriptOutput, `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`, 'text/markdown')}
                      title="Ekspor sebagai Markdown"
                      disabled={!scriptOutput.trim()}
                    >
                      <FileDown size={14} />
                      <span>Ekspor .md</span>
                    </button>
                    <button
                      type="button"
                      className="copy-action-btn"
                      onClick={() => handleDownloadFile(scriptOutput, `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`, 'text/plain')}
                      title="Ekspor sebagai Teks"
                      disabled={!scriptOutput.trim()}
                    >
                      <FileDown size={14} />
                      <span>Ekspor .txt</span>
                    </button>
                    <button
                      type="button"
                      className="editor-maximize-btn"
                      onClick={() => setIsScriptMaximized(true)}
                      title="Perbesar / Maximize Naskah"
                    >
                      <Maximize2 size={13} />
                      <span>Maximize</span>
                    </button>
                    <button
                      type="button"
                      className="copy-action-btn"
                      onClick={() => setIsThumbnailScriptCollapsed((prev) => !prev)}
                      title={isThumbnailScriptCollapsed ? 'Buka Naskah' : 'Susutkan Naskah'}
                    >
                      {isThumbnailScriptCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      <span>{isThumbnailScriptCollapsed ? 'Buka' : 'Susut'}</span>
                    </button>
                  </div>
                </div>

                {!isThumbnailScriptCollapsed && (
                  <div className="audit-section" style={{ padding: 12 }}>
                    <textarea
                      value={scriptOutput}
                      onChange={(e) => setScriptOutput(e.target.value)}
                      onBlur={() => {
                        if (scriptOutput !== lastSavedScriptRef.current) {
                          const textToSave = scriptOutput;
                          setScriptSaveStatus('saving');
                          onUpdate(item.id, { external_script_output: textToSave }).then(() => {
                            lastSavedScriptRef.current = textToSave;
                            if (scriptOutputRef.current === textToSave) {
                              setScriptSaveStatus('saved');
                              setTimeout(() => {
                                setScriptSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
                              }, 2500);
                            } else {
                              setScriptSaveStatus('unsaved');
                            }
                          }).catch(() => {
                            setScriptSaveStatus('unsaved');
                          });
                        }
                      }}
                      style={{
                        width: '100%',
                        minHeight: 220,
                        background: '#0a101d',
                        border: '1px solid #1a2942',
                        color: '#c8d6ea',
                        padding: 12,
                        borderRadius: 8,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        lineHeight: 1.6,
                        boxSizing: 'border-box'
                      }}
                      placeholder="Belum ada naskah video..."
                    />
                  </div>
                )}
              </div>

              {/* Collapsible Spoken Audit & Visual Cue in Thumbnailing if present */}
              {showAuditResults && (
                <div
                  className={`audit-results-panel collapsible-section ${isAuditResultsCollapsed ? 'collapsed' : ''}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      background: 'rgba(83, 242, 173, 0.07)',
                      borderBottom: isAuditResultsCollapsed ? 'none' : '1px solid rgba(83, 242, 173, 0.15)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)' }}>
                      <CheckCircle2 size={16} /> Arsip Audit Spoken & TTS
                    </h4>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`copy-action-btn ${copied === 'findings' ? 'copied' : ''}`}
                        onClick={() => copyText(auditFindings, 'findings')}
                      >
                        {copied === 'findings' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied === 'findings' ? 'Tersalin' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        className="copy-action-btn"
                        onClick={() => setIsAuditResultsCollapsed((prev) => !prev)}
                      >
                        {isAuditResultsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        <span>{isAuditResultsCollapsed ? 'Buka' : 'Susut'}</span>
                      </button>
                    </div>
                  </div>
                  {!isAuditResultsCollapsed && (
                    <div className="audit-section">
                      <pre className="audit-pre">{auditFindings}</pre>
                    </div>
                  )}
                </div>
              )}

              {showVisualCueResults && (
                <div
                  className={`audit-results-panel visual-results-panel collapsible-section ${isVisualCueResultsCollapsed ? 'collapsed' : ''}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      background: 'rgba(79, 232, 255, 0.07)',
                      borderBottom: isVisualCueResultsCollapsed ? 'none' : '1px solid rgba(79, 232, 255, 0.15)',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cyan)' }}>
                      <Film size={16} /> Arsip Anotasi Visual Cue
                    </h4>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`copy-action-btn ${copied === 'vcannot' ? 'copied' : ''}`}
                        onClick={() => copyText(annotatedScript, 'vcannot')}
                      >
                        {copied === 'vcannot' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied === 'vcannot' ? 'Tersalin' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        className="copy-action-btn"
                        onClick={() => setIsVisualCueResultsCollapsed((prev) => !prev)}
                      >
                        {isVisualCueResultsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        <span>{isVisualCueResultsCollapsed ? 'Buka' : 'Susut'}</span>
                      </button>
                    </div>
                  </div>
                  {!isVisualCueResultsCollapsed && (
                    <div className="audit-section">
                      <pre className="audit-pre">{annotatedScript}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {item.status === 'Published' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 200, color: 'var(--green)' }}>
              <Check size={48} style={{ marginBottom: 16 }} />
              <h3>Konten Selesai!</h3>
              <p style={{ color: '#7890af', marginBottom: 16 }}>Konten ini telah selesai melalui seluruh pipeline AI.</p>
              <button
                className="btn btn-secondary revert-stage-btn"
                type="button"
                onClick={() => handleStatusChange('Thumbnailing')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fcd34d' }}
                title="Kembalikan status ke tahap Thumbnailing jika perlu perbaikan"
              >
                <Undo2 size={16} /> Revert ke Thumbnailing
              </button>
            </div>
          )}

        </section>
      </div>
      )}

      {/* Zen Maximize Editor Modal */}
      {isScriptMaximized && (
        <div className="zen-editor-overlay" onClick={() => setIsScriptMaximized(false)}>
          <div className="zen-editor-container" onClick={(e) => e.stopPropagation()}>
            <div className="zen-editor-header">
              <div className="zen-editor-title">
                <FileText size={18} style={{ color: 'var(--cyan)' }} />
                <span>Editor Naskah Video — {item.title}</span>
              </div>
              <div className="zen-editor-stats">
                {renderSaveIndicator(scriptSaveStatus)}
                <span>
                  {scriptOutput.trim() ? scriptOutput.trim().split(/\s+/).length.toLocaleString('id-ID') : 0} kata
                </span>
                <span>•</span>
                <span>{scriptOutput.length.toLocaleString('id-ID')} karakter</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsScriptMaximized(false)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: '0.85rem', marginLeft: 8 }}
                >
                  <Minimize2 size={15} /> Selesai / Perkecil (Esc)
                </button>
              </div>
            </div>
            <textarea
              className="zen-editor-textarea"
              value={scriptOutput}
              onChange={(e) => setScriptOutput(e.target.value)}
              onBlur={() => {
                if (scriptOutput !== lastSavedScriptRef.current) {
                  const textToSave = scriptOutput;
                  setScriptSaveStatus('saving');
                  onUpdate(item.id, { external_script_output: textToSave }).then(() => {
                    lastSavedScriptRef.current = textToSave;
                    if (scriptOutputRef.current === textToSave) {
                      setScriptSaveStatus('saved');
                      setTimeout(() => {
                        setScriptSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
                      }, 2500);
                    } else {
                      setScriptSaveStatus('unsaved');
                    }
                  }).catch(() => {
                    setScriptSaveStatus('unsaved');
                  });
                }
              }}
              placeholder="Ketik atau edit draf naskah video Anda di sini secara leluasa..."
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Draft Snapshot History Modal */}
      {showDraftHistoryModal && (
        <div className="zen-editor-overlay" onClick={() => setShowDraftHistoryModal(false)}>
          <div
            className="zen-editor-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720, height: 'auto', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="zen-editor-header">
              <div className="zen-editor-title">
                <Clock size={18} style={{ color: 'var(--amber)' }} />
                <span>Riwayat Snapshot Draf Naskah</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDraftHistoryModal(false)}
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
              >
                Tutup
              </button>
            </div>

            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              <p style={{ fontSize: '0.85rem', color: '#9eb3cf', marginTop: 0, marginBottom: 16 }}>
                Snapshot draf otomatis dicatat sebelum revisi AI (Spoken Audit / Visual Cue) diterapkan ke editor naskah. Sistem menyimpan hingga 5 snapshot terakhir secara lokal.
              </p>

              {draftHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#7890af' }}>
                  <Clock size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>Belum ada riwayat snapshot draf.</p>
                  <span style={{ fontSize: '0.78rem' }}>Snapshot akan tersimpan otomatis saat Anda mengklik "Terapkan ke Draft" pada hasil audit AI.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {draftHistory.map((snap, idx) => (
                    <div
                      key={snap.id}
                      style={{
                        background: '#0a101d',
                        border: '1px solid #1a2942',
                        borderRadius: 10,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>
                            {snap.label || `Snapshot #${draftHistory.length - idx}`}
                          </span>
                          <span className="collapsed-pill" style={{ background: 'rgba(79, 232, 255, 0.1)', color: 'var(--cyan)' }}>
                            {snap.wordCount.toLocaleString('id-ID')} kata
                          </span>
                        </div>
                        <span style={{ fontSize: '0.76rem', color: '#7890af' }}>
                          {new Date(snap.timestamp).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#9eb3cf',
                          background: 'rgba(3, 12, 31, 0.5)',
                          padding: '8px 10px',
                          borderRadius: 6,
                          maxHeight: 70,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'monospace',
                          lineHeight: 1.4,
                        }}
                      >
                        {snap.content.slice(0, 220)}{snap.content.length > 220 ? '...' : ''}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleRestoreSnapshot(snap)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '6px 12px', color: 'var(--green)' }}
                        >
                          <RotateCcw size={14} /> Pulihkan Draf Ini
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Switch Track Confirmation Modal */}
      {showSwitchTrackModal && (
        <div className="zen-editor-overlay" onClick={() => { setShowSwitchTrackModal(false); setPendingTrack(null); }}>
          <div
            className="zen-editor-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 540, height: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            <div className="zen-editor-header">
              <div className="zen-editor-title">
                <Undo2 size={18} style={{ color: 'var(--cyan)' }} />
                <span>Ganti Jalur Produksi</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowSwitchTrackModal(false); setPendingTrack(null); }}
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
              >
                Batal
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: '0.9rem', color: '#c8d6ea', marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
                Anda saat ini memiliki kerangka naskah di Outline Studio. Apakah Anda ingin membawa kerangka yang sudah ada ke jalur baru, atau mereset dari awal?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleConfirmSwitchTrack(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', fontSize: '0.88rem' }}
                >
                  <Check size={16} /> Bawa Kerangka ke Jalur Baru
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleConfirmSwitchTrack(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', fontSize: '0.88rem', color: '#f87171' }}
                >
                  <RotateCcw size={16} /> Reset Kerangka dari Awal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Draft Studio Warning Modal */}
      {showOverwriteDraftModal && (
        <div className="zen-editor-overlay" onClick={() => setShowOverwriteDraftModal(false)}>
          <div
            className="zen-editor-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 540, height: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            <div className="zen-editor-header">
              <div className="zen-editor-title">
                <AlertTriangle size={18} style={{ color: 'var(--amber)' }} />
                <span>Peringatan: Draf Naskah Sudah Ada</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowOverwriteDraftModal(false)}
                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
              >
                Batal
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: '0.9rem', color: '#c8d6ea', marginTop: 0, marginBottom: 12, lineHeight: 1.5 }}>
                Di Draft Studio sudah ada naskah sebanyak <strong>{scriptOutput.trim().split(/\s+/).filter(Boolean).length.toLocaleString('id-ID')} kata</strong>.
              </p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 0, marginBottom: 20, lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menimpa dengan naskah baru dari AI Scriptwriter? Draf saat ini akan dicadangkan secara otomatis ke <strong>Riwayat Snapshot</strong> sehingga Anda tetap dapat memulihkannya kapan saja.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowOverwriteDraftModal(false)}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowOverwriteDraftModal(false);
                    executeGenerateFullScript();
                  }}
                  style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'var(--green)', borderColor: 'var(--green)', color: '#041a10', fontWeight: 700 }}
                >
                  Ya, Timpa Draf
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

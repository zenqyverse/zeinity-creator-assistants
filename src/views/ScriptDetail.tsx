import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  Loader2,
  FileText,
  CheckCircle2,
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
  Flame,
  TrendingUp,
  Rss,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { CONTENT_STATUSES, type ContentItem, type ContentStatus, type TitleRecommendationItem, type HookRecommendationResult } from '@/types';
import { saveUploadedFile } from '@/hooks/useFiles';
import { extractTextFromFile } from '@/lib/docx';
import {
  generateResearchBriefPrompt,
  generateScriptwriterHandoff,
  generateZeinityOutline,
  generateZeinityFullScript,
  generateZeinityBeatScript,
  replaceBeatInScript,
  getScriptBeatInfo,
  type ScriptBeatNumber,
  calculateTargetWords,
  runSpokenAudit,
  runCasualAudit,
  generateThumbnailPrompt,
  generateAlternativeTitles,
  formatStructuredPrompt,
  resolveTargetModelForTask,
  isProviderConfigured,
  type ProviderConfig,
  recommendZeinityHook,
  generateZeinityHook,
  applyHookToOutline,
} from '@/lib/gemini';
import {
  ScriptPreflightBar,
  ResearchWorkspace,
  OutlineWorkspace,
  ScriptDraftStudio,
  ThumbnailTitleStudio,
} from '@/components/script';
import { AlertModal, useAlert, parseAIError } from '@/components/AlertModal';
import { useTerminal } from '@/components/Terminal';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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
export { ResearchWorkspace };

interface ScriptDetailProps {
  item: ContentItem;
  onBack: () => void;
  onUpdate: (
    id: string,
    updates: Partial<ContentItem>,
    options?: { silent?: boolean; immediate?: boolean }
  ) => Promise<ContentItem>;
  providerConfig: ProviderConfig;
  identityText: string;
  onNavigateSettings?: () => void;
  onViewPublished?: (item: ContentItem) => void;
}

const formatPromptText = formatStructuredPrompt;

export default function ScriptDetail({
  item,
  onBack,
  onUpdate,
  providerConfig,
  identityText,
  onNavigateSettings,
  onViewPublished,
}: ScriptDetailProps) {
  const { showAlert, showError, showWarning } = useAlert();
  const { startActivity, addLog, finishActivity, errorActivity } = useTerminal();
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingResearch, setGeneratingResearch] = useState(false);
  const [generatingHandoff, setGeneratingHandoff] = useState(false);
  const [generatingAudit, setGeneratingAudit] = useState(false);
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
  const [casualFindings, setCasualFindings] = useState(item.audit_casual_prompt || '');
  const [casualRevisedDraft, setCasualRevisedDraft] = useState('');
  const [casualSummary, setCasualSummary] = useState<string | null>(null);
  const [generatingCasualAudit, setGeneratingCasualAudit] = useState(false);

  // AI Summary Card state
  const [auditSummary, setAuditSummary] = useState<string | null>(null);
  const [handoffSummary, setHandoffSummary] = useState<string | null>(null);

  // Apply to Draft feedback & Maximize state
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const [isDraftHighlighted, setIsDraftHighlighted] = useState(false);
  const [isScriptMaximized, setIsScriptMaximized] = useState(false);
  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save and persistence status
  const [researchSaveStatus, setResearchSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [scriptSaveStatus, setScriptSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');

  // Draft Versioning & 5 Title Recommendations states
  const [draftHistory, setDraftHistory] = useState<DraftSnapshot[]>(() => getDraftSnapshots(item.id));
  const [showDraftHistoryModal, setShowDraftHistoryModal] = useState(false);
  const draftHistoryModalRef = useFocusTrap<HTMLDivElement>(showDraftHistoryModal);
  const [titleA, setTitleA] = useState(item.generated_title_a || '');
  const [titleB, setTitleB] = useState(item.generated_title_b || '');
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [titlesList, setTitlesList] = useState<TitleRecommendationItem[]>(() => {
    if (Array.isArray(item.generated_titles) && item.generated_titles.length > 0) {
      return item.generated_titles;
    }
    const initialList: TitleRecommendationItem[] = [];
    if (item.generated_title_a) {
      const wordsA = item.generated_title_a.trim().split(/\s+/).filter(Boolean);
      initialList.push({
        id: 'formula_1',
        formulaName: 'Curiosity Gap (Pertanyaan Universal)',
        title: item.generated_title_a,
        wordCount: wordsA.length,
        isMobileSafe: wordsA.length >= 5 && wordsA.length <= 8,
        explanation: 'Formula 1: Curiosity Gap memancing rasa ingin tahu alami audiens.',
      });
    }
    if (item.generated_title_b) {
      const wordsB = item.generated_title_b.trim().split(/\s+/).filter(Boolean);
      initialList.push({
        id: 'formula_4',
        formulaName: 'SEO Keyword & Otoritas (High-Intent Search)',
        title: item.generated_title_b,
        wordCount: wordsB.length,
        isMobileSafe: wordsB.length >= 5 && wordsB.length <= 8,
        explanation: 'Formula 4: SEO Keyword & Otoritas untuk visibilitas penelusuran YouTube.',
      });
    }
    return initialList;
  });
  const [showTitleCard, setShowTitleCard] = useState(Boolean(item.generated_title_a || item.generated_title_b || (item.generated_titles && item.generated_titles.length > 0)));
  const [isThumbnailScriptCollapsed, setIsThumbnailScriptCollapsed] = useState(false);

  // Thumbnail Studio Dual-Mode state
  const extractHookFromPrompt = (promptText?: string | null): string => {
    if (!promptText) return '';
    const match = promptText.match(/(?:TEKS|TEXT):\s*["']?([A-Z0-9\s]{2,30})["']?/i);
    if (match && match[1]?.trim()) {
      return match[1].trim().toUpperCase();
    }
    return '';
  };

  const [thumbnailMode, setThumbnailMode] = useState<'prompt' | 'visual'>(item.thumbnail_mode || 'prompt');
  const [thumbnailAspectRatio, setThumbnailAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [thumbnailProvider, setThumbnailProvider] = useState<'imagen3' | 'dalle3' | 'flux'>('imagen3');
  const [thumbnailHookText, setThumbnailHookText] = useState<string>(() => {
    const fromPrompt = extractHookFromPrompt(item.generated_thumbnail_prompt);
    if (fromPrompt) return fromPrompt;
    return 'ILUSI DIBONGKAR';
  });
  const [isThumbnailModalOpen, setIsThumbnailModalOpen] = useState<boolean>(false);
  const [isTitlesCollapsed, setIsTitlesCollapsed] = useState<boolean>(false);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'writing' | 'finishing'>('writing');

  // Pre-Flight & Dual-Track Scriptwriter state
  const [productionTrack, setProductionTrack] = useState<'in_app' | 'external'>(
    item.script_production_track || 'in_app'
  );
  const [externalSubMode, setExternalSubMode] = useState<'one_shot' | 'step_by_step'>('step_by_step');
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
  const [generatingBeatNumber, setGeneratingBeatNumber] = useState<ScriptBeatNumber | null>(null);

  // Hook-First Pipeline state (Tahap 1)
  const [selectedHookType, setSelectedHookType] = useState<string>(item.script_hook_type || '');
  const [hookDraft, setHookDraft] = useState<string>(item.script_hook_draft || '');
  const [hookNotes, setHookNotes] = useState<string>(item.script_hook_notes || '');
  const [hookRecommendation, setHookRecommendation] = useState<HookRecommendationResult | null>(null);
  const [recommendingHook, setRecommendingHook] = useState<boolean>(false);
  const [generatingHook, setGeneratingHook] = useState<boolean>(false);

  // Modals for Track Switch & Overwrite Guard
  const [showSwitchTrackModal, setShowSwitchTrackModal] = useState<boolean>(false);
  const [pendingTrack, setPendingTrack] = useState<'in_app' | 'external' | null>(null);
  const [showOverwriteDraftModal, setShowOverwriteDraftModal] = useState<boolean>(false);

  // Tablet Studio Ergonomic Sub-Tab State (<= 960px) - F-14
  const [tabletStudioTab, setTabletStudioTab] = useState<'outline' | 'draft'>('outline');

  // Auto-transition langsung ke PublishedDetail jika status Published (F-16)
  useEffect(() => {
    if (item.status === 'Published' && onViewPublished) {
      onViewPublished(item);
    }
  }, [item, onViewPublished]);

  const lastSavedResearchRef = useRef<string>(item.external_research_output || '');
  const lastSavedScriptRef = useRef<string>(item.external_script_output || '');
  const lastSavedOutlineRef = useRef<string>(item.script_outline || '');
  const lastSavedAngleNotesRef = useRef<string>(item.script_angle_notes || '');
  const lastSavedHookDraftRef = useRef<string>(item.script_hook_draft || '');
  const lastSavedHookNotesRef = useRef<string>(item.script_hook_notes || '');
  const researchOutputRef = useRef<string>(researchOutput);
  researchOutputRef.current = researchOutput;
  const scriptOutputRef = useRef<string>(scriptOutput);
  scriptOutputRef.current = scriptOutput;
  const outlineTextRef = useRef<string>(outlineText);
  outlineTextRef.current = outlineText;
  const angleNotesRef = useRef<string>(angleNotes);
  angleNotesRef.current = angleNotes;
  const hookDraftRef = useRef<string>(hookDraft);
  hookDraftRef.current = hookDraft;
  const hookNotesRef = useRef<string>(hookNotes);
  hookNotesRef.current = hookNotes;
  const selectedHookTypeRef = useRef<string>(selectedHookType);
  selectedHookTypeRef.current = selectedHookType;
  const isOutlineApprovedRef = useRef<boolean>(isOutlineApproved);
  isOutlineApprovedRef.current = isOutlineApproved;
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
        onUpdate(prevId, { external_research_output: researchOutputRef.current }, { immediate: true });
      }
      if (scriptOutputRef.current !== lastSavedScriptRef.current) {
        onUpdate(prevId, { external_script_output: scriptOutputRef.current }, { immediate: true });
      }
      if (outlineTextRef.current !== lastSavedOutlineRef.current) {
        onUpdate(prevId, { script_outline: outlineTextRef.current }, { immediate: true });
      }
      if (angleNotesRef.current !== lastSavedAngleNotesRef.current) {
        onUpdate(prevId, { script_angle_notes: angleNotesRef.current }, { immediate: true });
      }
      if (hookDraftRef.current !== lastSavedHookDraftRef.current) {
        onUpdate(prevId, { script_hook_draft: hookDraftRef.current }, { immediate: true });
      }
      if (hookNotesRef.current !== lastSavedHookNotesRef.current) {
        onUpdate(prevId, { script_hook_notes: hookNotesRef.current }, { immediate: true });
      }

      currentItemIdRef.current = item.id;
      setResearchOutput(item.external_research_output || '');
      setScriptOutput(item.external_script_output || '');
      lastSavedResearchRef.current = item.external_research_output || '';
      lastSavedScriptRef.current = item.external_script_output || '';
      lastSavedOutlineRef.current = item.script_outline || '';
      lastSavedAngleNotesRef.current = item.script_angle_notes || '';
      lastSavedHookDraftRef.current = item.script_hook_draft || '';
      lastSavedHookNotesRef.current = item.script_hook_notes || '';
      hookDraftRef.current = item.script_hook_draft || '';
      hookNotesRef.current = item.script_hook_notes || '';
      selectedHookTypeRef.current = item.script_hook_type || '';
      setResearchSaveStatus('idle');
      setScriptSaveStatus('idle');

      // Cleanly reset AI prompt & action outputs for the new item
      setResearchBriefPrompt(item.research_brief_prompt || '');
      setHandoffPrompt(item.scriptwriter_brief_prompt || '');
      setThumbnailPrompt(item.generated_thumbnail_prompt || '');

      setAuditFindings(item.audit_spoken_prompt || '');
      setAuditRevisedDraft('');
      setShowAuditResults(Boolean(item.audit_spoken_prompt));
      setCasualFindings(item.audit_casual_prompt || '');
      setCasualRevisedDraft('');
      setCasualSummary(null);

      setAuditSummary(null);
      setHandoffSummary(null);
      setAppliedKey(null);
      setIsDraftHighlighted(false);
      setIsScriptMaximized(false);
      setActiveWorkflowTab('writing');
      setUploadedResearchFileName(null);
      setUploadedScriptFileName(null);
      setGeneratingResearch(false);
      setGeneratingHandoff(false);
      setGeneratingAudit(false);
      setGeneratingCasualAudit(false);
      setGeneratingThumbnail(false);
      setCopied(null);

      setTitleA(item.generated_title_a || '');
      setTitleB(item.generated_title_b || '');
      if (Array.isArray(item.generated_titles) && item.generated_titles.length > 0) {
        setTitlesList(item.generated_titles);
      } else {
        const fallbackList: TitleRecommendationItem[] = [];
        if (item.generated_title_a) {
          const wordsA = item.generated_title_a.trim().split(/\s+/).filter(Boolean);
          fallbackList.push({
            id: 'formula_1',
            formulaName: 'Curiosity Gap (Pertanyaan Universal)',
            title: item.generated_title_a,
            wordCount: wordsA.length,
            isMobileSafe: wordsA.length >= 5 && wordsA.length <= 8,
            explanation: 'Formula 1: Curiosity Gap memancing rasa ingin tahu alami audiens.',
          });
        }
        if (item.generated_title_b) {
          const wordsB = item.generated_title_b.trim().split(/\s+/).filter(Boolean);
          fallbackList.push({
            id: 'formula_4',
            formulaName: 'SEO Keyword & Otoritas (High-Intent Search)',
            title: item.generated_title_b,
            wordCount: wordsB.length,
            isMobileSafe: wordsB.length >= 5 && wordsB.length <= 8,
            explanation: 'Formula 4: SEO Keyword & Otoritas untuk visibilitas penelusuran YouTube.',
          });
        }
        setTitlesList(fallbackList);
      }
      setShowTitleCard(Boolean(item.generated_title_a || item.generated_title_b || (item.generated_titles && item.generated_titles.length > 0)));
      setDraftHistory(getDraftSnapshots(item.id));
      setShowDraftHistoryModal(false);
      setGeneratingTitles(false);
      setIsThumbnailScriptCollapsed(false);
      setThumbnailMode(item.thumbnail_mode || 'prompt');
      const initialHook = extractHookFromPrompt(item.generated_thumbnail_prompt);
      setThumbnailHookText(initialHook || 'ILUSI DIBONGKAR');
      setIsThumbnailModalOpen(false);
      setIsTitlesCollapsed(false);

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
      setGeneratingBeatNumber(null);
      setSelectedHookType(item.script_hook_type || '');
      setHookDraft(item.script_hook_draft || '');
      setHookNotes(item.script_hook_notes || '');
      setHookRecommendation(null);
      setRecommendingHook(false);
      setGeneratingHook(false);
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
      const fromP = extractHookFromPrompt(item.generated_thumbnail_prompt);
      if (fromP) setThumbnailHookText(fromP);
    }
    if (item.audit_spoken_prompt !== undefined) {
      setAuditFindings(item.audit_spoken_prompt || '');
      setShowAuditResults(Boolean(item.audit_spoken_prompt));
    }
    if (item.audit_casual_prompt !== undefined) {
      setCasualFindings(item.audit_casual_prompt || '');
    }
    if (item.generated_titles !== undefined && Array.isArray(item.generated_titles)) {
      setTitlesList(item.generated_titles);
    }
    if (item.thumbnail_mode !== undefined && item.thumbnail_mode) {
      setThumbnailMode(item.thumbnail_mode);
    }
    if (item.generated_title_a !== undefined) {
      setTitleA(item.generated_title_a || '');
    }
    if (item.generated_title_b !== undefined) {
      setTitleB(item.generated_title_b || '');
    }
    if (item.generated_title_a || item.generated_title_b || (item.generated_titles && item.generated_titles.length > 0)) {
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
    if (item.script_hook_type !== undefined && item.script_hook_type !== selectedHookTypeRef.current) {
      setSelectedHookType(item.script_hook_type || '');
      selectedHookTypeRef.current = item.script_hook_type || '';
    }
    if (
      item.script_hook_draft !== undefined &&
      item.script_hook_draft !== lastSavedHookDraftRef.current &&
      hookDraftRef.current === lastSavedHookDraftRef.current
    ) {
      setHookDraft(item.script_hook_draft || '');
      lastSavedHookDraftRef.current = item.script_hook_draft || '';
    }
    if (
      item.script_hook_notes !== undefined &&
      item.script_hook_notes !== lastSavedHookNotesRef.current &&
      hookNotesRef.current === lastSavedHookNotesRef.current
    ) {
      setHookNotes(item.script_hook_notes || '');
      lastSavedHookNotesRef.current = item.script_hook_notes || '';
    }
  }, [
    item.id,
    item.external_research_output,
    item.external_script_output,
    item.research_brief_prompt,
    item.scriptwriter_brief_prompt,
    item.generated_thumbnail_prompt,
    item.thumbnail_mode,
    item.audit_spoken_prompt,
    item.audit_casual_prompt,
    item.generated_title_a,
    item.generated_title_b,
    item.generated_titles,
    item.script_outline,
    item.script_outline_approved,
    item.script_production_track,
    item.script_target_duration,
    item.script_target_words,
    item.script_angle_notes,
    item.script_hook_type,
    item.script_hook_draft,
    item.script_hook_notes,
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
        await onUpdate(item.id, { external_research_output: textToSave }, { silent: true });
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
        await onUpdate(item.id, { external_script_output: textToSave }, { silent: true });
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
        }, { silent: true });
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
        await onUpdate(item.id, { script_angle_notes: notesToSave }, { silent: true });
        lastSavedAngleNotesRef.current = notesToSave;
      } catch (err) {
        console.error('Failed to auto-save angle notes:', err);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [angleNotes, item.id, onUpdate]);

  // Debounced auto-save for hookDraft (~900ms)
  useEffect(() => {
    if (hookDraft === lastSavedHookDraftRef.current) return;

    const timer = setTimeout(async () => {
      const draftToSave = hookDraft;
      try {
        await onUpdate(item.id, { script_hook_draft: draftToSave }, { silent: true });
        lastSavedHookDraftRef.current = draftToSave;
      } catch (err) {
        console.error('Failed to auto-save hook draft:', err);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [hookDraft, item.id, onUpdate]);

  // Debounced auto-save for hookNotes (~900ms)
  useEffect(() => {
    if (hookNotes === lastSavedHookNotesRef.current) return;

    const timer = setTimeout(async () => {
      const notesToSave = hookNotes;
      try {
        await onUpdate(item.id, { script_hook_notes: notesToSave }, { silent: true });
        lastSavedHookNotesRef.current = notesToSave;
      } catch (err) {
        console.error('Failed to auto-save hook notes:', err);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [hookNotes, item.id, onUpdate]);

  // Flush unsaved changes on unmount or before window unload
  useEffect(() => {
    const flushPending = () => {
      if (
        researchOutputRef.current !== lastSavedResearchRef.current ||
        scriptOutputRef.current !== lastSavedScriptRef.current ||
        outlineTextRef.current !== lastSavedOutlineRef.current ||
        angleNotesRef.current !== lastSavedAngleNotesRef.current ||
        hookDraftRef.current !== lastSavedHookDraftRef.current ||
        hookNotesRef.current !== lastSavedHookNotesRef.current
      ) {
        onUpdate(itemRef.current.id, {
          external_research_output: researchOutputRef.current,
          external_script_output: scriptOutputRef.current,
          script_outline: outlineTextRef.current,
          script_angle_notes: angleNotesRef.current,
          script_outline_approved: isOutlineApprovedRef.current,
          script_hook_type: selectedHookTypeRef.current || undefined,
          script_hook_draft: hookDraftRef.current,
          script_hook_notes: hookNotesRef.current,
        }, { immediate: true });
        lastSavedResearchRef.current = researchOutputRef.current;
        lastSavedScriptRef.current = scriptOutputRef.current;
        lastSavedOutlineRef.current = outlineTextRef.current;
        lastSavedAngleNotesRef.current = angleNotesRef.current;
        lastSavedHookDraftRef.current = hookDraftRef.current;
        lastSavedHookNotesRef.current = hookNotesRef.current;
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
        // Guard: If an AlertModal is currently open in foreground, let it close first
        if (document.querySelector('.alert-modal-layer')) {
          return;
        }
        if (isThumbnailModalOpen) {
          setIsThumbnailModalOpen(false);
          return;
        }
        if (showOverwriteDraftModal) {
          e.preventDefault();
          e.stopPropagation();
          setShowOverwriteDraftModal(false);
          return;
        }
        if (showSwitchTrackModal) {
          e.preventDefault();
          e.stopPropagation();
          setShowSwitchTrackModal(false);
          return;
        }
        if (showDraftHistoryModal) {
          e.preventDefault();
          e.stopPropagation();
          setShowDraftHistoryModal(false);
          return;
        }
        if (isScriptMaximized) {
          e.preventDefault();
          e.stopPropagation();
          setIsScriptMaximized(false);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isThumbnailModalOpen, isScriptMaximized, showDraftHistoryModal, showSwitchTrackModal, showOverwriteDraftModal]);

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
  const [isScriptInputCollapsed, setIsScriptInputCollapsed] = useState<boolean>(() => Boolean(item.audit_spoken_prompt || item.generated_thumbnail_prompt));
  const [isAuditResultsCollapsed, setIsAuditResultsCollapsed] = useState<boolean>(false);

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
      setIsScriptInputCollapsed(Boolean(item.audit_spoken_prompt || item.generated_thumbnail_prompt));
      setIsAuditResultsCollapsed(false);
    }
  }, [item.id, isHandoffVisible, item.audit_spoken_prompt, item.generated_thumbnail_prompt]);

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
      const label = key.includes('casual')
        ? 'Sebelum Revisi AI Kasual Friendly'
        : 'Sebelum Revisi AI Spoken Audit';
      const updatedHistory = saveDraftSnapshot(item.id, scriptOutput, label);
      setDraftHistory(updatedHistory);
    }

    // Expand the script input editor so user sees the newly applied text
    setIsScriptInputCollapsed(false);

    // Auto-collapse the source result card to direct user focus to editor
    if (key === 'audit') {
      setIsAuditResultsCollapsed(true);
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
    if (!isProviderConfigured(providerConfig)) {
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

    const targetConfig = resolveTargetModelForTask('script', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setGeneratingResearch(true);
    startActivity('AI Research Brief Log', `Menghubungkan ke ${modelLabel}...`);
    addLog('Menyusun ulang Research Brief Prompt berdasarkan identitas channel & 10 Narrative Assets...', 60);

    try {
      const res = await generateResearchBriefPrompt(
        targetConfig,
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
        diagnostics: parsed.diagnostics,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingResearch(false);
    }
  };

  const handleGenerateHandoff = async (advanceToScripting = false) => {
    if (!isProviderConfigured(providerConfig)) {
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

    const targetConfig = resolveTargetModelForTask('script', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setGeneratingHandoff(true);
    setLoading(true);
    startActivity(
      'Scriptwriter Handoff Log',
      `Menghubungkan ke ${modelLabel}...`
    );
    addLog(`Membaca data riset (${researchOutput.length.toLocaleString('id-ID')} karakter)...`, 30);
    addLog('Menyusun Kerangka 5 Tahap Zeinity berdasarkan riset aktual...', 60);
    addLog('Menggabungkan dengan panduan Spoken-First + TTS...', 85);

    try {
      await onUpdate(item.id, { external_research_output: researchOutput });

      const handoff = await generateScriptwriterHandoff(
        targetConfig,
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
        diagnostics: parsed.diagnostics,
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
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
      });
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
          showError(parsed.title, parsed.message, {
            technicalDetails: parsed.technicalDetails,
            solution: parsed.solution,
            diagnostics: parsed.diagnostics,
          });
        }
      }
    });
  };

  const handleRunAudit = async () => {
    if (!isProviderConfigured(providerConfig)) {
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

    const targetConfig = resolveTargetModelForTask('audit', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setGeneratingAudit(true);
    startActivity(
      'Audit Spoken & TTS Log',
      `Menghubungkan ke ${modelLabel}...`
    );
    addLog(`Membaca draf naskah (${scriptOutput.length.toLocaleString('id-ID')} karakter)...`, 25);
    addLog('Menganalisis 4 dimensi: Struktur Kalimat, Prosodi TTS, Naturalitas Lisan, Larangan VO...', 60);
    addLog('Menyusun laporan temuan & menyiapkan draft revisi...', 85);

    try {
      await onUpdate(item.id, { external_script_output: scriptOutput });

      const result = await runSpokenAudit(targetConfig, item.title, scriptOutput);
      setAuditFindings(result.findings);
      setAuditRevisedDraft(result.revisedDraft);
      setShowAuditResults(true);
      setAuditSummary(result.summary);
      setIsScriptInputCollapsed(true);
      setIsAuditResultsCollapsed(false);

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
        diagnostics: parsed.diagnostics,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingAudit(false);
    }
  };

  const handleRunCasualAudit = async () => {
    if (!isProviderConfigured(providerConfig)) {
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
        'Silakan masukkan atau unggah draf naskah video sebelum menjalankan audit Kasual Friendly.'
      );
      return;
    }

    const targetConfig = resolveTargetModelForTask('audit', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setGeneratingCasualAudit(true);
    startActivity(
      'Audit Kasual Friendly Log',
      `Menghubungkan ke ${modelLabel}...`
    );
    addLog(`Membaca draf naskah (${scriptOutput.length.toLocaleString('id-ID')} karakter)...`, 25);
    addLog('Menganalisis gaya bahasa: deteksi diksi formal/kaku, frasa ensiklopedia, struktur pasif...', 60);
    addLog('Merumuskan perbaikan tutur kasual friendly khas Zeinity...', 85);

    try {
      await onUpdate(item.id, { external_script_output: scriptOutput });

      const result = await runCasualAudit(targetConfig, item.title, scriptOutput);
      setCasualFindings(result.findings);
      setCasualRevisedDraft(result.revisedDraft);
      setCasualSummary(result.summary);

      await onUpdate(item.id, {
        audit_casual_prompt: result.findings,
        ai_output: 'Audit Kasual Friendly selesai.',
      });

      finishActivity(`Audit Kasual selesai! ${result.summary}`);

      showAlert({
        type: 'success',
        title: 'Audit Kasual Selesai — Draft Revisi Tersedia',
        message: `${result.summary}\n\nApakah Anda ingin menerapkan draft revisi kasual ke draf naskah? Draft asli tetap tersimpan dalam riwayat snapshot.`,
        confirmText: 'Terapkan ke Draft',
        cancelText: 'Nanti Saja',
        onConfirm: () => {
          handleApplyToDraft(result.revisedDraft, 'casual_audit');
        },
      });
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal menjalankan Audit Kasual: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingCasualAudit(false);
    }
  };

  const handleGenerateThumbnail = async (advanceToThumbnailing = false) => {
    if (!isProviderConfigured(providerConfig)) {
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

    const targetConfig = resolveTargetModelForTask('audit', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setGeneratingThumbnail(true);
    setLoading(true);
    startActivity(
      'AI Thumbnail Generator Log',
      `Menghubungkan ke ${modelLabel}...`
    );
    addLog('Menganalisis judul & naskah untuk menemukan inti emosional...', 45);
    addLog('Merumuskan ide teks thumbnail berkonversi tinggi (CTR-focused)...', 75);

    try {
      await onUpdate(item.id, { external_script_output: scriptOutput });

      const thumbRes = await generateThumbnailPrompt(targetConfig, item.title, scriptOutput);
      setThumbnailPrompt(thumbRes);
      const parsedHook = extractHookFromPrompt(thumbRes);
      if (parsedHook) {
        setThumbnailHookText(parsedHook);
      }

      const updates: Partial<ContentItem> = {
        generated_thumbnail_prompt: thumbRes,
        thumbnail_mode: thumbnailMode,
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
        diagnostics: parsed.diagnostics,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingThumbnail(false);
      setLoading(false);
    }
  };

  const handleSelectThumbnailMode = (mode: 'prompt' | 'visual') => {
    setThumbnailMode(mode);
    onUpdate(item.id, { thumbnail_mode: mode }).catch(() => {});
  };

  const handleExportMockupSvg = () => {
    const width = thumbnailAspectRatio === '16:9' ? 1280 : thumbnailAspectRatio === '1:1' ? 1080 : 720;
    const height = thumbnailAspectRatio === '16:9' ? 720 : thumbnailAspectRatio === '1:1' ? 1080 : 1280;
    
    // Gunakan 2-4 kata UPPERCASE untuk hook teks (menghadirkan stakes emosional, tanpa mengulang kata judul)
    const hookWords = (thumbnailHookText.trim() || 'ILUSI DIBONGKAR').toUpperCase();

    const safeTitle = (item.title || 'Zeinity Executive Video').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeHook = hookWords.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1324"/>
      <stop offset="50%" stop-color="#050a14"/>
      <stop offset="100%" stop-color="#02050a"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.9"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
  
  <!-- Subtle Grid Lines -->
  <g stroke="rgba(79, 232, 255, 0.08)" stroke-width="1.5">
    <line x1="0" y1="${height * 0.25}" x2="${width}" y2="${height * 0.25}" />
    <line x1="0" y1="${height * 0.50}" x2="${width}" y2="${height * 0.50}" stroke-dasharray="6 6" />
    <line x1="0" y1="${height * 0.75}" x2="${width}" y2="${height * 0.75}" />
    <line x1="${width * 0.33}" y1="0" x2="${width * 0.33}" y2="${height}" stroke-dasharray="6 6" />
    <line x1="${width * 0.66}" y1="0" x2="${width * 0.66}" y2="${height}" stroke-dasharray="6 6" />
  </g>

  <!-- Safe Zone Framing -->
  <rect x="${width * 0.05}" y="${height * 0.06}" width="${width * 0.9}" height="${height * 0.88}" fill="none" stroke="rgba(79, 232, 255, 0.25)" stroke-width="2" rx="16" />

  <!-- Badge: Aspect Ratio & Provider -->
  <g transform="translate(${width * 0.08}, ${height * 0.12})">
    <rect width="${width * 0.4}" height="42" rx="8" fill="rgba(6, 18, 38, 0.85)" stroke="rgba(79, 232, 255, 0.4)" stroke-width="1.5"/>
    <text x="16" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#4fe8ff" letter-spacing="1">
      ${thumbnailAspectRatio} • ${thumbnailProvider.toUpperCase()} PREVIEW
    </text>
  </g>

  <!-- Main Focal Stakes Visual Area (Center Box) -->
  <g transform="translate(${width * 0.1}, ${height * 0.26})">
    <rect width="${width * 0.8}" height="${height * 0.48}" rx="20" fill="rgba(10, 22, 44, 0.65)" stroke="rgba(79, 232, 255, 0.3)" stroke-width="2"/>
    <circle cx="${width * 0.4}" cy="${height * 0.24}" r="${height * 0.16}" fill="rgba(79, 232, 255, 0.06)" stroke="rgba(79, 232, 255, 0.2)" stroke-width="1.5"/>
    
    <!-- Big Bold UPPERCASE 2-4 Words Thumbnail Hook -->
    <text x="${width * 0.4}" y="${height * 0.27}" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(height * 0.10)}" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#shadow)" letter-spacing="2">
      ${safeHook}
    </text>
  </g>

  <!-- Bottom Topic Title Label -->
  <g transform="translate(${width * 0.08}, ${height * 0.80})">
    <rect width="${width * 0.84}" height="52" rx="10" fill="rgba(4, 12, 24, 0.9)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1"/>
    <text x="20" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#cbd5e1">
      TOPIK: ${safeTitle}
    </text>
  </g>

  <!-- Zeinity Watermark -->
  <text x="${width * 0.92}" y="${height * 0.15}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="rgba(79, 232, 255, 0.7)" text-anchor="end" letter-spacing="1">
    ZEINITY STUDIO
  </text>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeinity_thumbnail_${thumbnailAspectRatio.replace(':', '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showAlert({
      type: 'success',
      title: 'Mockup SVG Diunduh',
      message: `Berkas mockup thumbnail ${thumbnailAspectRatio} berhasil diunduh ke komputer Anda.`,
    });
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
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
      });
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
    if (!isProviderConfigured(providerConfig)) {
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

    if (!selectedHookType) {
      showWarning(
        'Formula Hook Belum Dipilih',
        'Silakan pilih salah satu formula Hook di Tahap 1 terlebih dahulu agar kerangka 5 babak tersusun berpusat pada premis Hook tersebut.'
      );
      return;
    }

    const targetConfig = resolveTargetModelForTask('script', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setGeneratingOutline(true);
    startActivity(
      'Outline Studio Log',
      `Menghubungkan ke ${modelLabel}...`
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
        targetConfig,
        item.title,
        researchOutput,
        item.category,
        item.research_text,
        angleNotes,
        computedTargetWords,
        targetDuration,
        isRegenerate ? revisionNoteInput : null,
        selectedHookType || null,
        hookDraft || null
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
        script_hook_type: selectedHookType || undefined,
        script_hook_draft: hookDraft || undefined,
        script_hook_notes: hookNotes || undefined,
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
        diagnostics: parsed.diagnostics,
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
    if (!isProviderConfigured(providerConfig)) {
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

    const targetConfig = resolveTargetModelForTask('script', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setIsOutlineApproved(true);
    setGeneratingFullScript(true);
    startActivity(
      'AI Scriptwriter Log',
      `Menghubungkan ke ${modelLabel}...`
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
        script_hook_type: selectedHookType || undefined,
        script_hook_draft: hookDraft || undefined,
        script_hook_notes: hookNotes || undefined,
      });

      const fullScript = await generateZeinityFullScript(
        targetConfig,
        item.title,
        outlineText,
        researchOutput,
        identityText,
        computedTargetWords,
        angleNotes,
        item.category,
        item.research_text,
        selectedHookType || null,
        hookDraft || null
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
        diagnostics: parsed.diagnostics,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingFullScript(false);
    }
  };

  const handleGenerateBeat = async (beatNumber: ScriptBeatNumber, beatRevisionNotes?: string) => {
    if (!isProviderConfigured(providerConfig)) {
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

    const targetConfig = resolveTargetModelForTask('script', providerConfig);
    const beatInfo = getScriptBeatInfo(beatNumber);

    setGeneratingBeatNumber(beatNumber);
    startActivity(
      `AI Beat Scriptwriter (${beatInfo.shortName})`,
      `Menulis naskah khusus ${beatInfo.name} menggunakan ${targetConfig.modelVersion || targetConfig.provider}...`
    );
    addLog(`Target panggung: ${beatInfo.stageName}...`, 20);

    try {
      addLog('Menerapkan aturan Spoken-First & TTS Prosody...', 45);
      const beatScript = await generateZeinityBeatScript(
        targetConfig,
        beatNumber,
        item.title,
        outlineText,
        researchOutput || item.external_research_output || '',
        identityText,
        {
          totalTargetWords: computedTargetWords,
          angleNotes,
          category: item.category,
          initialNotes: item.research_text,
          currentScript: scriptOutput,
          revisionNotes: beatRevisionNotes,
        }
      );

      addLog(`Menyisipkan hasil ${beatInfo.shortName} ke dalam draf naskah utama...`, 80);
      if (scriptOutput.trim()) {
        const snapLabel = `Sebelum Regenerasi ${beatInfo.shortName}`;
        const updatedHistory = saveDraftSnapshot(item.id, scriptOutput, snapLabel);
        setDraftHistory(updatedHistory);
      }

      const updatedScript = replaceBeatInScript(scriptOutput, beatNumber, beatScript);
      setScriptOutput(updatedScript);
      lastSavedScriptRef.current = updatedScript;
      setScriptSaveStatus('saved');
      await onUpdate(item.id, { external_script_output: updatedScript });

      setIsScriptInputCollapsed(false);
      setIsDraftHighlighted(true);
      setTimeout(() => setIsDraftHighlighted(false), 2400);

      finishActivity(`${beatInfo.shortName} berhasil di-generate dan disatukan ke draf!`);
      showAlert({
        type: 'success',
        title: `${beatInfo.shortName} Berhasil Diperbarui`,
        message: `${beatInfo.name} (~${beatScript.split(/\s+/).filter(Boolean).length} kata) berhasil disintesis ke dalam draf naskah video tanpa merombak babak lain.`,
      });
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal men-generate ${beatInfo.shortName}: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingBeatNumber(null);
    }
  };

  const handleSelectHookType = async (hookType: string) => {
    setSelectedHookType(hookType);
    selectedHookTypeRef.current = hookType;
    try {
      await onUpdate(item.id, { script_hook_type: hookType });
    } catch (err) {
      console.error('Failed to update hook type:', err);
    }
  };

  const handleHookDraftChange = (val: string) => {
    setHookDraft(val);
  };

  const handleHookNotesChange = (val: string) => {
    setHookNotes(val);
  };

  const handleRecommendHook = async () => {
    if (!isProviderConfigured(providerConfig)) {
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

    const targetConfig = resolveTargetModelForTask('script', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setRecommendingHook(true);
    startActivity('Hook Recommendation Log', `Menganalisis sudut konten dengan ${modelLabel}...`);
    addLog('Mengevaluasi 6 Formula Hook Zeinity berdasarkan riset & judul...', 40);

    try {
      const rec = await recommendZeinityHook(
        targetConfig,
        item.title,
        researchOutput,
        item.category,
        item.research_text,
        angleNotes
      );

      setHookRecommendation(rec);
      setSelectedHookType(rec.hookId);
      selectedHookTypeRef.current = rec.hookId;
      await onUpdate(item.id, { script_hook_type: rec.hookId });

      finishActivity(`Rekomendasi Hook: ${rec.hookName} dipilih!`);
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal merekomendasikan hook: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setRecommendingHook(false);
    }
  };

  const handleGenerateHook = async (isRegenerate = false) => {
    if (!isProviderConfigured(providerConfig)) {
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

    if (!selectedHookType) {
      showWarning(
        'Varian Hook Belum Dipilih',
        'Pilih salah satu dari 6 Varian Hook Zeinity sebelum melakukan generate teks hook.'
      );
      return;
    }

    const targetConfig = resolveTargetModelForTask('script', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setGeneratingHook(true);
    startActivity('Hook Studio Log', `Menghubungkan ke ${modelLabel}...`);
    addLog(
      isRegenerate
        ? 'Menulis ulang Hook Pembuka Zeinity (0–30 detik, spoken-first)...'
        : 'Menulis draf Hook Pembuka Zeinity (0–30 detik, spoken-first)...',
      50
    );

    try {
      const draft = await generateZeinityHook(
        targetConfig,
        item.title,
        selectedHookType,
        researchOutput,
        {
          hookNotes,
          angleNotes,
          category: item.category,
          initialNotes: item.research_text,
        }
      );

      setHookDraft(draft);
      lastSavedHookDraftRef.current = draft;

      await onUpdate(item.id, {
        script_hook_type: selectedHookType,
        script_hook_draft: draft,
        script_hook_notes: hookNotes,
      });

      finishActivity(
        isRegenerate
          ? 'Hook Pembuka berhasil digenerate ulang!'
          : 'Hook Pembuka berhasil dibuat!'
      );
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal membuat hook: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingHook(false);
    }
  };

  const handleApplyHookToOutline = async () => {
    if (!hookDraft.trim()) {
      showWarning(
        'Draf Hook Masih Kosong',
        'Generate atau tulis teks hook terlebih dahulu sebelum menerapkan ke kerangka.'
      );
      return;
    }

    const updatedOutline = applyHookToOutline(outlineText, hookDraft, selectedHookType);
    setOutlineText(updatedOutline);
    lastSavedOutlineRef.current = updatedOutline;

    try {
      await onUpdate(item.id, { script_outline: updatedOutline });
      showAlert({
        type: 'success',
        title: 'Hook Diterapkan ke Kerangka',
        message: 'Babak 1 pada kerangka naskah berhasil diperbarui dengan draf Hook tanpa mengubah babak lainnya.',
      });
    } catch (err) {
      console.error('Gagal menyimpan outline setelah apply hook:', err);
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

    if (!selectedHookType) {
      showWarning(
        'Varian Hook Belum Dipilih',
        'Silakan pilih salah satu varian Hook di Tahap 1 terlebih dahulu sebelum menyetujui kerangka dan menulis naskah.'
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


  const handleGenerateTitles = async () => {
    if (!isProviderConfigured(providerConfig)) {
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

    const targetConfig = resolveTargetModelForTask('audit', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setGeneratingTitles(true);
    startActivity('AI Title Generator Log', `Menghubungkan ke ${modelLabel}...`);
    addLog('Menganalisis topik & konteks narasi naskah...', 35);
    addLog('Merumuskan 5 Formula Hook Zeinity (Bab 12 & 32 Dokumen Strategi)...', 75);

    try {
      const res = await generateAlternativeTitles(
        targetConfig,
        item.title,
        item.category || 'Umum',
        scriptOutput || researchOutput || item.research_text
      );

      setTitleA(res.titleA);
      setTitleB(res.titleB);
      setTitlesList(res.titles);
      setShowTitleCard(true);
      setIsTitlesCollapsed(false);

      await onUpdate(item.id, {
        generated_title_a: res.titleA,
        generated_title_b: res.titleB,
        generated_titles: res.titles,
      });

      finishActivity('5 Rekomendasi Judul Hook Zeinity berhasil dibuat!');
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal membuat rekomendasi judul: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
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
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
      });
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    startActivity('Content Publishing Log', `Mempublikasikan konten: "${item.title.slice(0, 32)}..."`);
    addLog('Menyimpan status publikasi dan menginisialisasi metrik video...', 60);

    try {
      const updated = await onUpdate(item.id, {
        status: 'Published',
        published_at: new Date().toISOString(),
        views: item.views ?? 0,
        likes: item.likes ?? 0,
        comments: item.comments ?? 0,
        ai_output: 'Konten berhasil dipublikasikan.',
        external_research_output: researchOutput,
        external_script_output: scriptOutput,
        script_outline: outlineText,
        script_target_duration: targetDuration,
        script_target_words: computedTargetWords,
        script_angle_notes: angleNotes,
        script_production_track: productionTrack,
        script_outline_approved: isOutlineApproved,
        generated_thumbnail_prompt: thumbnailPrompt,
        thumbnail_mode: thumbnailMode,
      });
      lastSavedResearchRef.current = researchOutput;
      lastSavedScriptRef.current = scriptOutput;
      lastSavedOutlineRef.current = outlineText;
      lastSavedAngleNotesRef.current = angleNotes;
      finishActivity('Konten berhasil dipublikasikan ke YouTube pipeline!');
      showAlert({
        type: 'success',
        title: 'Publikasi Berhasil',
        message: 'Konten berhasil dipublikasikan! Mengalihkan ke workspace publikasi...',
        onConfirm: () => {
          if (onViewPublished) {
            onViewPublished(updated || { ...item, status: 'Published' });
          } else {
            onBack();
          }
        },
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
    // Flush buffer perubahan terakhir ke parent state secara langsung ({ immediate: true })
    if (researchOutputRef.current !== lastSavedResearchRef.current) {
      onUpdate(itemRef.current.id, { external_research_output: researchOutputRef.current }, { immediate: true });
      lastSavedResearchRef.current = researchOutputRef.current;
    }
    if (scriptOutputRef.current !== lastSavedScriptRef.current) {
      onUpdate(itemRef.current.id, { external_script_output: scriptOutputRef.current }, { immediate: true });
      lastSavedScriptRef.current = scriptOutputRef.current;
    }
    if (outlineTextRef.current !== lastSavedOutlineRef.current) {
      onUpdate(itemRef.current.id, { script_outline: outlineTextRef.current }, { immediate: true });
      lastSavedOutlineRef.current = outlineTextRef.current;
    }
    if (angleNotesRef.current !== lastSavedAngleNotesRef.current) {
      onUpdate(itemRef.current.id, { script_angle_notes: angleNotesRef.current }, { immediate: true });
      lastSavedAngleNotesRef.current = angleNotesRef.current;
    }
    if (hookDraftRef.current !== lastSavedHookDraftRef.current) {
      onUpdate(itemRef.current.id, { script_hook_draft: hookDraftRef.current }, { immediate: true });
      lastSavedHookDraftRef.current = hookDraftRef.current;
    }
    if (hookNotesRef.current !== lastSavedHookNotesRef.current) {
      onUpdate(itemRef.current.id, { script_hook_notes: hookNotesRef.current }, { immediate: true });
      lastSavedHookNotesRef.current = hookNotesRef.current;
    }
    onUpdate(itemRef.current.id, {
      script_outline_approved: isOutlineApproved,
      script_target_duration: targetDuration,
      script_target_words: computedTargetWords,
      script_hook_type: selectedHookTypeRef.current || undefined,
    }, { immediate: true });
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
              ) : item.source === 'YouTube Trends' ? (
                <span
                  className="source source-youtube-trends"
                  title="YouTube Trends"
                  style={{
                    color: '#ff6b6b',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Flame size={11} /> YouTube Trends
                </span>
              ) : item.source === 'Google Trends' ? (
                <span
                  className="source source-google-trends"
                  title="Google Trends"
                  style={{
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <TrendingUp size={11} /> Google Trends
                </span>
              ) : item.source === 'RSS' ? (
                <span
                  className="source source-rss"
                  title="RSS Reader"
                  style={{
                    color: '#fb923c',
                    background: 'rgba(249, 115, 22, 0.12)',
                    border: '1px solid rgba(249, 115, 22, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Rss size={11} /> RSS
                </span>
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
          {/* ==================== KONFIGURASI PARAMETER NASKAH (PRE-FLIGHT SETTINGS) ==================== */}
          {/* Konfigurasi Parameter Naskah (Pre-Flight Settings) */}
          {/* handleSelectTrack | In-App AI Scriptwriter | AI Eksternal (ChatGPT / Claude) */}
          {/* Target Kata (Disarankan) | Ketik Durasi Menit | Angle Tambahan / Fokus Khusus */}
          {/* revert-stage-btn | Revert ke Researching */}
          <ScriptPreflightBar
            productionTrack={productionTrack}
            onSelectTrack={handleSelectTrack}
            targetDuration={targetDuration}
            onDurationChange={(d) => {
              setTargetDuration(d);
              onUpdate(item.id, {
                script_target_duration: d,
                script_target_words: calculateTargetWords(
                  d,
                  customMode,
                  customMode === 'words' ? customWordsInput : customMinutesInput
                ),
              });
            }}
            computedTargetWords={computedTargetWords}
            customMode={customMode}
            onCustomModeChange={setCustomMode}
            customWordsInput={customWordsInput}
            onCustomWordsChange={setCustomWordsInput}
            customMinutesInput={customMinutesInput}
            onCustomMinutesChange={setCustomMinutesInput}
            onCustomBlur={() => {
              onUpdate(item.id, {
                script_target_words:
                  customMode === 'words'
                    ? customWordsInput
                    : calculateTargetWords('custom', 'minutes', customMinutesInput),
                script_target_duration: 'custom',
              });
            }}
            itemTitle={item.title}
            itemCategory={item.category}
            hasResearchText={Boolean(item.research_text)}
            angleNotes={angleNotes}
            onAngleNotesChange={setAngleNotes}
            onAngleNotesBlur={() => {
              lastSavedAngleNotesRef.current = angleNotes;
              onUpdate(item.id, { script_angle_notes: angleNotes });
            }}
            onRevertToResearching={() => handleStatusChange('Researching')}
            loading={loading}
          />

          {/* ==================== 2. WORKFLOW STAGE NAVIGATION TABS ==================== */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 16,
              padding: '6px 12px',
              background: '#091222',
              border: '1px solid #162842',
              borderRadius: 10,
            }}
          >
            <div className="scripting-workflow-tabs-strip">
              <button
                type="button"
                className={`workflow-tab-btn ${activeWorkflowTab === 'writing' ? 'active' : ''}`}
                onClick={() => setActiveWorkflowTab('writing')}
              >
                ✍️ 1. Studio Naskah
              </button>
              <button
                type="button"
                className={`workflow-tab-btn ${activeWorkflowTab === 'finishing' ? 'active' : ''}`}
                onClick={() => setActiveWorkflowTab('finishing')}
              >
                📦 2. Finishing & Packaging
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Jalur: <strong style={{ color: productionTrack === 'in_app' ? 'var(--cyan)' : '#818cf8' }}>
                  {productionTrack === 'in_app' ? 'In-App AI Scriptwriter' : 'AI Eksternal'}
                </strong>
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleSelectTrack(productionTrack === 'in_app' ? 'external' : 'in_app')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.74rem',
                  padding: '4px 10px',
                  color: '#cbd5e1',
                }}
                title="Ganti jalur produksi antara In-App AI Scriptwriter dan AI Eksternal"
              >
                <Undo2 size={12} /> Ganti Jalur Produksi
              </button>
            </div>
          </div>

          {/* ==================== 3. WORKSPACE VIEWS (WRITING VS FINISHING) ==================== */}
          {activeWorkflowTab === 'writing' ? (
            /* TAB 1: STUDIO NASKAH (DUAL-PANE STRETCHED: OUTLINE + ZEN WRITING CANVAS) */
            <div className={`scripting-dual-pane-grid tablet-view-${tabletStudioTab}`}>
              {/* Tablet sub-tab toggle ergonomis (<= 960px) - F-14 */}
              <div className="tablet-studio-toggle" role="tablist" aria-label="Navigasi Tablet Studio Naskah">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tabletStudioTab === 'outline'}
                  className={`tablet-tab-btn ${tabletStudioTab === 'outline' ? 'active' : ''}`}
                  onClick={() => setTabletStudioTab('outline')}
                >
                  Outline Studio
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tabletStudioTab === 'draft'}
                  className={`tablet-tab-btn ${tabletStudioTab === 'draft' ? 'active' : ''}`}
                  onClick={() => setTabletStudioTab('draft')}
                >
                  Draft Studio
                </button>
              </div>

              {/* Pipeline Kerangka (Outline Studio) */}
              {/* Tahap 2: Human Approval Gate | Setujui & Tulis Naskah | Undo Terakhir | Regenerate Outline | Catatan Revisi Regenerasi */}
              {/* Mode 1-Pintu (One-Shot Handoff) | Mode 2-Langkah (Alur Bertahap) */}
              {/* Tahap 1: Salin Prompt Outline | Tahap 2: Tempel & Tinjau Kerangka | Tahap 3: Prompt Naskah Instan Siap Salin */}
              <div className="scripting-pane-col outline-studio-col">
                <OutlineWorkspace
                productionTrack={productionTrack}
                externalSubMode={externalSubMode}
                onExternalSubModeChange={setExternalSubMode}
                computedTargetWords={computedTargetWords}
                outlineText={outlineText}
                onOutlineChange={setOutlineText}
                onOutlineBlur={() => {
                  if (outlineText !== lastSavedOutlineRef.current) {
                    const textToSave = outlineText;
                    onUpdate(item.id, { script_outline: textToSave })
                      .then(() => {
                        lastSavedOutlineRef.current = textToSave;
                      })
                      .catch(() => {});
                  }
                }}
                isOutlineApproved={isOutlineApproved}
                generatingOutline={generatingOutline}
                generatingFullScript={generatingFullScript}
                revisionNoteInput={revisionNoteInput}
                onRevisionNoteChange={setRevisionNoteInput}
                onGenerateOutline={handleGenerateOutline}
                onUndoOutline={handleUndoOutline}
                canUndoOutline={previousOutlineRef.current !== null}
                onApproveAndGenerateScript={handleApproveAndGenerateScript}
                onApproveExternalOutline={handleApproveExternalOutline}
                copied={copied}
                onCopy={copyText}
                item={item}
                researchOutput={researchOutput}
                identityText={identityText}
                angleNotes={angleNotes}
                targetDuration={targetDuration}
                handoffPrompt={item.scriptwriter_brief_prompt || handoffPrompt}
                generatingHandoff={generatingHandoff}
                onGenerateHandoff={() => handleGenerateHandoff(false)}
                loading={loading}
                onGenerateBeat={handleGenerateBeat}
                generatingBeatNumber={generatingBeatNumber}
                selectedHookType={selectedHookType}
                onSelectHookType={handleSelectHookType}
                hookDraft={hookDraft}
                onHookDraftChange={handleHookDraftChange}
                hookNotes={hookNotes}
                onHookNotesChange={handleHookNotesChange}
                hookRecommendation={hookRecommendation}
                recommendingHook={recommendingHook}
                onRecommendHook={handleRecommendHook}
                generatingHook={generatingHook}
                onGenerateHook={handleGenerateHook}
                onApplyHookToOutline={handleApplyHookToOutline}
              />
              </div>

              {/* Draft Studio (Ruang Kerja Produksi) */}
              {/* Card 1: Spoken Audit */}
              {/* Card 2: Generate Rekomendasi Judul */}
              {/* Card 3: Generate Thumbnail */}
              {/* title-recommendations-grid | Aman Mobile (5–8 kata) | handleApplyTitleAsMain | Gunakan sbg Judul */}
              {/* SMART CHECKLIST PEMOLESAN NASKAH | Pengingat Cerdas Workflow: */}
              {/* title="Buka Studio Pembuatan Thumbnail" | aria-label="Buka Studio Pembuatan Thumbnail" | setIsThumbnailModalOpen(true) */}
              {/* Salin Prompt Audit | formatExternalAuditPrompt | formatExternalFinalRevisionPrompt */}
              {/* Salin Prompt 5 Formula Judul | formatExternalTitlePrompt */}
              {/* onDoubleClick={() => setIsScriptInputCollapsed(false)} | Draf Naskah Video | setIsScriptInputCollapsed(true) */}
              {/* onDoubleClick={() => setIsAuditResultsCollapsed | isAuditResultsCollapsed ? 'Buka' : 'Susut' */}
              {/* onDoubleClick={() => setIsTitlesCollapsed | isTitlesCollapsed ? 'Buka' : 'Susut' */}
              {/* {hasGeneratedThumbnail && ( <button>Generate Ulang Thumbnail</button> )} */}
              {/* Audit Spoken & TTS ✨ | Sudah Diterapkan | btn-applied */}
              <div className="scripting-pane-col draft-studio-col">
                <ScriptDraftStudio
                  activeWorkflowTab="writing"
                  onSwitchToFinishing={() => setActiveWorkflowTab('finishing')}
                  item={item}
                  scriptOutput={scriptOutput}
                  onScriptChange={setScriptOutput}
                onScriptBlur={() => {
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
                scriptSaveStatus={scriptSaveStatus}
                renderSaveIndicator={renderSaveIndicator}
                onFileUpload={(f) => handleMdFileUpload(f, false)}
                uploadedFileName={uploadedScriptFileName}
                isDragging={isDraggingScript}
                onDragStateChange={setIsDraggingScript}
                onOpenDraftHistory={() => setShowDraftHistoryModal(true)}
                draftHistoryCount={draftHistory.length}
                onUndoLatestRevision={handleUndoLatestAiRevision}
                hasSnapshots={draftHistory.length > 0}
                onMaximizeEditor={() => setIsScriptMaximized(true)}
                scriptTextareaRef={scriptTextareaRef}
                isDraftHighlighted={isDraftHighlighted}
                /* draft-highlight-pulse */
                isScriptInputCollapsed={isScriptInputCollapsed}
                onToggleScriptInputCollapse={() => setIsScriptInputCollapsed((prev) => !prev)}
                onGenerateBeat={handleGenerateBeat}
                generatingBeatNumber={generatingBeatNumber}
                totalTargetWords={computedTargetWords}
                showAuditResults={showAuditResults || Boolean(auditFindings)}
                auditFindings={auditFindings}
                auditRevisedDraft={auditRevisedDraft}
                isAuditResultsCollapsed={isAuditResultsCollapsed}
                onToggleAuditCollapse={() => setIsAuditResultsCollapsed((prev) => !prev)}
                auditSummary={auditSummary}
                appliedKey={appliedKey}
                onApplyToDraft={handleApplyToDraft}
                onRunAudit={handleRunAudit}
                generatingAudit={generatingAudit}
                casualFindings={casualFindings}
                casualRevisedDraft={casualRevisedDraft}
                casualSummary={casualSummary}
                generatingCasualAudit={generatingCasualAudit}
                onRunCasualAudit={handleRunCasualAudit}
                showTitleCard={showTitleCard}
                titlesList={titlesList}
                titleA={titleA}
                titleB={titleB}
                isTitlesCollapsed={isTitlesCollapsed}
                onToggleTitlesCollapse={() => setIsTitlesCollapsed((prev) => !prev)}
                generatingTitles={generatingTitles}
                onGenerateTitles={handleGenerateTitles}
                onApplyTitleAsMain={handleApplyTitleAsMain}
                onOpenThumbnailModal={() => setIsThumbnailModalOpen(true)}
                copied={copied}
                onCopy={copyText}
                loading={loading}
                thumbnailMode={thumbnailMode}
                onSelectThumbnailMode={handleSelectThumbnailMode}
                thumbnailPrompt={thumbnailPrompt}
                generatedThumbnailPrompt={item.generated_thumbnail_prompt}
                thumbnailAspectRatio={thumbnailAspectRatio}
                onAspectRatioChange={setThumbnailAspectRatio}
                thumbnailProvider={thumbnailProvider}
                onProviderChange={setThumbnailProvider}
                thumbnailHookText={thumbnailHookText}
                onHookTextChange={setThumbnailHookText}
                onExportMockupSvg={handleExportMockupSvg}
                onGenerateThumbnail={handleGenerateThumbnail}
                generatingThumbnail={generatingThumbnail}
                hasGeneratedThumbnail={hasGeneratedThumbnail}
                onPublish={handlePublish}
                onProceedToThumbnailing={handleProceedToThumbnailing}
              />
              </div>
            </div>
          ) : (
            /* TAB 2: FINISHING STUDIO (PACKAGING, SPOKEN AUDIT, 5 FORMULA JUDUL & CHECKLIST) */
            <div style={{ width: '100%' }}>
              {/* Draft Studio (Ruang Kerja Produksi) */}
              {/* Card 1: Spoken Audit */}
              {/* Card 2: Generate Rekomendasi Judul */}
              {/* Card 3: Generate Thumbnail */}
              {/* title-recommendations-grid | Aman Mobile (5–8 kata) | handleApplyTitleAsMain | Gunakan sbg Judul */}
              {/* SMART CHECKLIST PEMOLESAN NASKAH | Pengingat Cerdas Workflow: */}
              {/* title="Buka Studio Pembuatan Thumbnail" | aria-label="Buka Studio Pembuatan Thumbnail" | setIsThumbnailModalOpen(true) */}
              {/* Salin Prompt Audit | formatExternalAuditPrompt | formatExternalFinalRevisionPrompt */}
              {/* Salin Prompt 5 Formula Judul | formatExternalTitlePrompt */}
              {/* onDoubleClick={() => setIsScriptInputCollapsed(false)} | Draf Naskah Video | setIsScriptInputCollapsed(true) */}
              {/* onDoubleClick={() => setIsAuditResultsCollapsed | isAuditResultsCollapsed ? 'Buka' : 'Susut' */}
              {/* onDoubleClick={() => setIsTitlesCollapsed | isTitlesCollapsed ? 'Buka' : 'Susut' */}
              {/* {hasGeneratedThumbnail && ( <button>Generate Ulang Thumbnail</button> )} */}
              {/* Audit Spoken & TTS ✨ | Sudah Diterapkan | btn-applied */}
              <ScriptDraftStudio
                activeWorkflowTab="finishing"
                onSwitchToWriting={() => setActiveWorkflowTab('writing')}
                item={item}
                scriptOutput={scriptOutput}
                onScriptChange={setScriptOutput}
                onScriptBlur={() => {
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
                scriptSaveStatus={scriptSaveStatus}
                renderSaveIndicator={renderSaveIndicator}
                onFileUpload={(f) => handleMdFileUpload(f, false)}
                uploadedFileName={uploadedScriptFileName}
                isDragging={isDraggingScript}
                onDragStateChange={setIsDraggingScript}
                onOpenDraftHistory={() => setShowDraftHistoryModal(true)}
                draftHistoryCount={draftHistory.length}
                onUndoLatestRevision={handleUndoLatestAiRevision}
                hasSnapshots={draftHistory.length > 0}
                onMaximizeEditor={() => setIsScriptMaximized(true)}
                scriptTextareaRef={scriptTextareaRef}
                isDraftHighlighted={isDraftHighlighted}
                /* draft-highlight-pulse */
                isScriptInputCollapsed={isScriptInputCollapsed}
                onToggleScriptInputCollapse={() => setIsScriptInputCollapsed((prev) => !prev)}
                onGenerateBeat={handleGenerateBeat}
                generatingBeatNumber={generatingBeatNumber}
                totalTargetWords={computedTargetWords}
                showAuditResults={showAuditResults || Boolean(auditFindings)}
                auditFindings={auditFindings}
                auditRevisedDraft={auditRevisedDraft}
                isAuditResultsCollapsed={isAuditResultsCollapsed}
                onToggleAuditCollapse={() => setIsAuditResultsCollapsed((prev) => !prev)}
                auditSummary={auditSummary}
                appliedKey={appliedKey}
                onApplyToDraft={handleApplyToDraft}
                onRunAudit={handleRunAudit}
                generatingAudit={generatingAudit}
                casualFindings={casualFindings}
                casualRevisedDraft={casualRevisedDraft}
                casualSummary={casualSummary}
                generatingCasualAudit={generatingCasualAudit}
                onRunCasualAudit={handleRunCasualAudit}
                showTitleCard={showTitleCard}
                titlesList={titlesList}
                titleA={titleA}
                titleB={titleB}
                isTitlesCollapsed={isTitlesCollapsed}
                onToggleTitlesCollapse={() => setIsTitlesCollapsed((prev) => !prev)}
                generatingTitles={generatingTitles}
                onGenerateTitles={handleGenerateTitles}
                onApplyTitleAsMain={handleApplyTitleAsMain}
                onOpenThumbnailModal={() => setIsThumbnailModalOpen(true)}
                copied={copied}
                onCopy={copyText}
                loading={loading}
                thumbnailMode={thumbnailMode}
                onSelectThumbnailMode={handleSelectThumbnailMode}
                thumbnailPrompt={thumbnailPrompt}
                generatedThumbnailPrompt={item.generated_thumbnail_prompt}
                thumbnailAspectRatio={thumbnailAspectRatio}
                onAspectRatioChange={setThumbnailAspectRatio}
                thumbnailProvider={thumbnailProvider}
                onProviderChange={setThumbnailProvider}
                thumbnailHookText={thumbnailHookText}
                onHookTextChange={setThumbnailHookText}
                onExportMockupSvg={handleExportMockupSvg}
                onGenerateThumbnail={handleGenerateThumbnail}
                generatingThumbnail={generatingThumbnail}
                hasGeneratedThumbnail={hasGeneratedThumbnail}
                onPublish={handlePublish}
                onProceedToThumbnailing={handleProceedToThumbnailing}
              />
            </div>
          )}
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

          {/* ResearchWorkspace | minHeight: 220 | resize: 'vertical' | revert-stage-btn | Revert ke Idea | accept=".docx,.md,.markdown,.txt" | Lanjut: Generate Scriptwriter Handoff | Lanjut ke Scripting | Lanjut ke Naskah (Scripting) */}
          {/* {hasGeneratedScriptBrief && ( <button>Generate Ulang Handoff</button> )} */}
          {item.status === 'Researching' && (
            <ResearchWorkspace
              item={item}
              researchOutput={researchOutput}
              onResearchChange={setResearchOutput}
              onResearchBlur={() => {
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
              researchSaveStatus={researchSaveStatus}
              renderSaveIndicator={renderSaveIndicator}
              onFileUpload={(f) => handleMdFileUpload(f, true)}
              uploadedFileName={uploadedResearchFileName}
              isDragging={isDraggingResearch}
              onDragStateChange={setIsDraggingResearch}
              onRevertToIdea={() => handleStatusChange('Idea')}
              hasGeneratedScriptBrief={hasGeneratedScriptBrief}
              generatingHandoff={generatingHandoff}
              generatingResearch={generatingResearch}
              onGenerateHandoff={() => handleGenerateHandoff(false)}
              onProceedToScripting={handleProceedToScripting}
              loading={loading}
            />
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
                    {generatingTitles ? 'Membuat Judul...' : 'Generate Rekomendasi Judul ✨'}
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

              {/* Rekomendasi 5 Judul YouTube (5 Formula Hook Zeinity) */}
              {(showTitleCard || titlesList.length > 0 || titleA || titleB) && (
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
                        <Sparkles size={16} /> Rekomendasi Judul YouTube (5 Formula Hook Zeinity)
                      </h4>
                      <span className="collapsed-pill" style={{ background: 'rgba(249, 199, 79, 0.12)', color: 'var(--amber)', borderColor: 'rgba(249, 199, 79, 0.3)' }}>
                        Bab 12, 25C &amp; 32 Dokumen Strategi
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGenerateTitles}
                        disabled={generatingTitles || loading}
                        style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        title="Generate ulang 5 varian judul hook Zeinity"
                      >
                        <RotateCw size={13} className={generatingTitles ? 'spin' : ''} />
                        <span>{generatingTitles ? 'Membuat...' : 'Generate Ulang'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="audit-section" style={{ padding: 14 }}>
                    <div className="title-recommendations-grid">
                      {titlesList.length > 0 ? (
                        titlesList.map((rec, idx) => {
                          const words = rec.title.trim().split(/\s+/).filter(Boolean);
                          const wordCount = rec.wordCount || words.length;
                          const isSafe = rec.isMobileSafe ?? (wordCount >= 5 && wordCount <= 8);
                          const copyKey = `title_thumb_${rec.id || idx}`;
                          return (
                            <div key={rec.id || idx} className="title-card formula-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                                <span className="mode-label formula-badge">
                                  {rec.formulaName || `Formula ${idx + 1}`}
                                </span>
                                <span
                                  className="collapsed-pill"
                                  style={{
                                    background: isSafe ? 'rgba(52, 211, 153, 0.15)' : 'rgba(249, 199, 79, 0.15)',
                                    color: isSafe ? 'var(--green)' : 'var(--amber)',
                                    borderColor: isSafe ? 'rgba(52, 211, 153, 0.3)' : 'rgba(249, 199, 79, 0.3)',
                                  }}
                                >
                                  {wordCount} kata • {isSafe ? 'Aman Mobile (5–8 kata)' : 'Periksa Panjang'}
                                </span>
                              </div>
                              <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 8, fontSize: '0.96rem', fontWeight: 600 }}>
                                {rec.title}
                              </div>
                              {rec.explanation && (
                                <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                                  {rec.explanation}
                                </p>
                              )}
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className={`copy-action-btn ${copied === copyKey ? 'copied' : ''}`}
                                  onClick={() => copyText(rec.title, copyKey)}
                                  title="Salin judul ini"
                                >
                                  {copied === copyKey ? <Check size={13} /> : <Copy size={13} />}
                                  <span>{copied === copyKey ? 'Tersalin!' : 'Salin'}</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => handleApplyTitleAsMain(rec.title)}
                                  style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                                  title="Gunakan sebagai judul utama konten ini"
                                >
                                  Gunakan sbg Judul
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          {titleA && (
                            <div className="title-card formula-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span className="mode-label formula-badge">Formula 1 — Curiosity Gap</span>
                                <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)' }}>
                                  {titleA.trim().split(/\s+/).length} kata • Aman Mobile
                                </span>
                              </div>
                              <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 10, fontWeight: 600 }}>
                                {titleA}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className={`copy-action-btn ${copied === 'titleA_thumb' ? 'copied' : ''}`}
                                  onClick={() => copyText(titleA, 'titleA_thumb')}
                                >
                                  {copied === 'titleA_thumb' ? <Check size={13} /> : <Copy size={13} />}
                                  <span>{copied === 'titleA_thumb' ? 'Tersalin!' : 'Salin'}</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => handleApplyTitleAsMain(titleA)}
                                  style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                                >
                                  Gunakan sbg Judul
                                </button>
                              </div>
                            </div>
                          )}
                          {titleB && (
                            <div className="title-card formula-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span className="mode-label formula-badge">Formula 4 — SEO Keyword &amp; Otoritas</span>
                                <span className="collapsed-pill" style={{ background: 'rgba(153, 133, 255, 0.15)', color: 'var(--violet)' }}>
                                  {titleB.trim().split(/\s+/).length} kata
                                </span>
                              </div>
                              <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 10, fontWeight: 600 }}>
                                {titleB}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className={`copy-action-btn ${copied === 'titleB_thumb' ? 'copied' : ''}`}
                                  onClick={() => copyText(titleB, 'titleB_thumb')}
                                >
                                  {copied === 'titleB_thumb' ? <Check size={13} /> : <Copy size={13} />}
                                  <span>{copied === 'titleB_thumb' ? 'Tersalin!' : 'Salin'}</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => handleApplyTitleAsMain(titleB)}
                                  style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                                >
                                  Gunakan sbg Judul
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
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
                      <span>{copied === 'thumbScript' ? 'Tersalin!' : 'Salin Naskah'}</span>
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

              {/* Collapsible Spoken Audit in Thumbnailing if present */}
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


            </div>
          )}

          {item.status === 'Published' && (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => (onViewPublished ? onViewPublished(item) : onBack())}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                Buka Detail Publikasi ➔
              </button>
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn btn-secondary revert-stage-btn"
                  type="button"
                  onClick={() => handleStatusChange('Thumbnailing')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fcd34d', fontSize: '0.8rem' }}
                  title="Kembalikan status ke tahap Thumbnailing jika perlu perbaikan"
                >
                  <Undo2 size={14} /> Revert ke Thumbnailing
                </button>
              </div>
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
        <div className="modal-overlay"
          ref={draftHistoryModalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Riwayat Snapshot Draf Naskah"
          onClick={() => setShowDraftHistoryModal(false)}
        >
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
                Snapshot draf otomatis dicatat sebelum revisi AI (Spoken Audit) diterapkan ke editor naskah. Sistem menyimpan hingga 5 snapshot terakhir secara lokal.
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
        <AlertModal
          isOpen={showSwitchTrackModal}
          onClose={() => {
            setShowSwitchTrackModal(false);
            setPendingTrack(null);
          }}
          options={{
            title: 'Ganti Jalur Produksi',
            type: 'info',
            message: 'Anda saat ini memiliki kerangka naskah di Outline Studio. Apakah Anda ingin membawa kerangka yang sudah ada ke jalur baru, atau mereset dari awal?',
            confirmText: 'Bawa Kerangka ke Jalur Baru',
            cancelText: 'Batal',
            onConfirm: () => handleConfirmSwitchTrack(true),
            onCancel: () => {
              setShowSwitchTrackModal(false);
              setPendingTrack(null);
            },
            actionButton: {
              label: 'Reset Kerangka dari Awal',
              onClick: () => handleConfirmSwitchTrack(false),
              icon: 'reset',
            },
          }}
        />
      )}

      {/* Overwrite Draft Studio Warning Modal */}
      {showOverwriteDraftModal && (
        <AlertModal
          isOpen={showOverwriteDraftModal}
          onClose={() => setShowOverwriteDraftModal(false)}
          options={{
            title: 'Peringatan: Draf Naskah Sudah Ada',
            type: 'warning',
            message: `Di Draft Studio sudah ada naskah sebanyak ${scriptOutput.trim().split(/\s+/).filter(Boolean).length.toLocaleString('id-ID')} kata. Apakah Anda yakin ingin menimpa dengan naskah baru dari AI Scriptwriter? Draf saat ini akan dicadangkan secara otomatis ke Riwayat Snapshot sehingga Anda tetap dapat memulihkannya kapan saja.`,
            confirmText: 'Ya, Timpa Draf',
            cancelText: 'Batal',
            onConfirm: () => {
              setShowOverwriteDraftModal(false);
              executeGenerateFullScript();
            },
          }}
        />
      )}

      {/* Studio Pembuatan Thumbnail Modal */}
      {/* id="studio-thumbnail-section" | className="modal-container thumbnail-modal-container" */}
      {/* Studio Pembuatan Thumbnail | className="close-btn" | className="modal-footer" */}
      {/* Copywriting Prompt (Text AI) | Visual Image AI (Placeholder) */}
      {/* Aturan Thumbnail Zeinity (Bab 13) | Salin Thumbnail Prompt */}
      {/* thumbnailAspectRatio | thumbnailProvider | handleExportMockupSvg | SAFE ZONE 80% | Unduh Mockup SVG */}
      {/* Tandai Selesai (Publish) | handleProceedToThumbnailing | Lanjut ke Thumbnailing | Tandai Siap Publikasi / Publish ➔ | await handlePublish() */}
      {isThumbnailModalOpen && (
        <ThumbnailTitleStudio
          isOpen={isThumbnailModalOpen}
          onClose={() => setIsThumbnailModalOpen(false)}
          thumbnailMode={thumbnailMode}
          onSelectThumbnailMode={handleSelectThumbnailMode}
          thumbnailPrompt={thumbnailPrompt}
          generatedThumbnailPrompt={item.generated_thumbnail_prompt}
          thumbnailAspectRatio={thumbnailAspectRatio}
          onAspectRatioChange={setThumbnailAspectRatio}
          thumbnailProvider={thumbnailProvider}
          onProviderChange={setThumbnailProvider}
          thumbnailHookText={thumbnailHookText}
          onHookTextChange={setThumbnailHookText}
          onExportMockupSvg={handleExportMockupSvg}
          onGenerateThumbnail={handleGenerateThumbnail}
          generatingThumbnail={generatingThumbnail}
          loading={loading}
          hasGeneratedThumbnail={hasGeneratedThumbnail}
          copied={copied}
          onCopy={copyText}
          onPublish={handlePublish}
          onProceedToThumbnailing={handleProceedToThumbnailing}
        />
      )}
    </main>
  );
}

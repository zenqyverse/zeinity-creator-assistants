import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { UploadedFile } from '@/types';
import { setChannelIdentity, DEFAULT_CHANNEL_IDENTITY } from '@/hooks/useSettings';

export const CACHED_FILES_STORAGE_KEY = 'zeinity_cached_files';

export function isChannelIdentityFile(filename: string): boolean {
  const norm = filename.trim().toLowerCase();
  return (
    norm.includes('identitas') ||
    norm.includes("zeinity's_channel") ||
    norm.includes('zeinity_channel') ||
    norm.includes('zeinity-identity')
  );
}

export const SEED_FILES: Omit<UploadedFile, 'id'>[] = [
  {
    filename: "IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx",
    file_path: "/public/uploads/IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx",
    file_type: 'docx',
    extracted_text: DEFAULT_CHANNEL_IDENTITY,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export function getSeedFiles(): UploadedFile[] {
  return SEED_FILES.map((f, idx) => ({
    ...f,
    id: `seed-file-${idx + 1}`,
  }));
}

export function getStoredFiles(): UploadedFile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHED_FILES_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } else {
      const seed = getSeedFiles();
      setStoredFiles(seed);
      return seed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

export function setStoredFiles(files: UploadedFile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHED_FILES_STORAGE_KEY, JSON.stringify(files));
  } catch (err) {
    console.error('Failed to persist cached files:', err);
  }
}

export async function saveUploadedFile(file: {
  filename: string;
  file_path: string;
  file_type: string;
  extracted_text: string | null;
}): Promise<boolean> {
  const isIdentity = isChannelIdentityFile(file.filename);
  const cached = getStoredFiles();
  const existingIndex = cached.findIndex(
    (f) => f.filename.trim().toLowerCase() === file.filename.trim().toLowerCase()
  );

  let updatedFiles: UploadedFile[];
  if (existingIndex >= 0) {
    updatedFiles = cached.map((f, i) =>
      i === existingIndex
        ? {
            ...f,
            file_type: file.file_type || f.file_type,
            extracted_text: file.extracted_text,
            created_at: new Date().toISOString(),
          }
        : f
    );
  } else {
    const newFile: UploadedFile = {
      id: `local-file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename: file.filename,
      file_path: file.file_path,
      file_type: file.file_type || null,
      extracted_text: file.extracted_text,
      created_at: new Date().toISOString(),
    };
    updatedFiles = [newFile, ...cached];
  }

  setStoredFiles(updatedFiles);

  if (isIdentity && file.extracted_text) {
    setChannelIdentity(file.extracted_text);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zeinity_files_updated'));
  }

  if (isSupabaseConfigured) {
    try {
      const { data: existing } = await supabase
        .from('uploaded_files')
        .select('id, filename')
        .ilike('filename', file.filename)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('uploaded_files')
          .update({
            file_type: file.file_type,
            extracted_text: file.extracted_text,
            created_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('uploaded_files').insert({
          filename: file.filename,
          file_path: file.file_path,
          file_type: file.file_type || null,
          extracted_text: file.extracted_text,
        });
      }
    } catch (err) {
      console.warn('Supabase sync for uploaded file failed, cached locally:', err);
    }
  }

  return true;
}

export function useFiles() {
  const [files, setFiles] = useState<UploadedFile[]>(() => {
    return getStoredFiles();
  });
  const [loading, setLoading] = useState(true);
  const filesRef = useRef(files);
  filesRef.current = files;

  const fetchFiles = useCallback(async (isInitial = false) => {
    if (isInitial && filesRef.current.length === 0) setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setFiles(getStoredFiles());
        return;
      }

      const { data, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed database
        try {
          const { data: seededData, error: seedError } = await supabase
            .from('uploaded_files')
            .insert(SEED_FILES)
            .select()
            .order('created_at', { ascending: false });

          if (seedError) throw seedError;
          const finalFiles = seededData as UploadedFile[];
          setFiles(finalFiles);
          setStoredFiles(finalFiles);
        } catch {
          const seeded = getSeedFiles();
          setFiles(seeded);
          setStoredFiles(seeded);
        }
      } else {
        setFiles(data as UploadedFile[]);
        setStoredFiles(data as UploadedFile[]);
      }
    } catch (err) {
      console.warn('Gagal memuat berkas dari Supabase, mengaktifkan cache snapshot lokal:', err);
      setFiles(getStoredFiles());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(true);
  }, [fetchFiles]);

  // Listen to custom cross-component update events
  useEffect(() => {
    const handleLocalUpdate = () => {
      setFiles(getStoredFiles());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('zeinity_files_updated', handleLocalUpdate);
      return () => {
        window.removeEventListener('zeinity_files_updated', handleLocalUpdate);
      };
    }
  }, []);

  // Realtime subscription (only if Supabase is configured)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    try {
      const channel = supabase
        .channel('schema-db-changes-files')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'uploaded_files',
          },
          () => {
            fetchFiles();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (channelErr) {
      console.warn('Supabase realtime channel error:', channelErr);
    }
  }, [fetchFiles]);

  const addFile = useCallback(async (file: {
    filename: string;
    file_path: string;
    file_type: string;
    extracted_text: string | null;
  }): Promise<boolean> => {
    const ok = await saveUploadedFile(file);
    setFiles(getStoredFiles());
    return ok;
  }, []);

  const deleteFile = useCallback(async (id: string): Promise<boolean> => {
    try {
      const current = getStoredFiles();
      const updated = current.filter((f) => f.id !== id);
      setStoredFiles(updated);
      setFiles(updated);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zeinity_files_updated'));
      }

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('uploaded_files').delete().eq('id', id);
          if (error) console.warn('Supabase delete error (cached locally):', error);
        } catch (supabaseErr) {
          console.warn('Supabase delete error (cached locally):', supabaseErr);
        }
      }
      return true;
    } catch (err) {
      console.error('Error deleting file:', err);
      return false;
    }
  }, []);

  return { files, loading, fetchFiles, addFile, deleteFile };
}

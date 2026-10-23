import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SkillTagInput } from '@/components/skill-tag-input';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useCoinConsent } from '@/components/coin-consent-modal';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import {
  checkResumeAgainstJob,
  createResumeFromScratch,
  deleteResumeDraft,
  downloadRenderedResume,
  getResumeDraft,
  getResumePrefill,
  improveResume,
  listResumeDrafts,
  listResumeTemplates,
  saveResumeDraftContent,
  saveResumeToProfile,
  tailorResumeDraft,
  templatePreviewUri,
  type AtsCheck,
  type ResumeContent,
  type ResumeEducationInput,
  type ResumeExperienceInput,
  type ResumeProjectInput,
  type ResumeTemplate,
  type ResumeWritingDraft,
  type ScratchInput,
} from '@/lib/api/resume-writing';

// Resume Writing (rewritten Oct 2026), mirroring sql-skreenit applicant/resume-writing.html:
// My Resumes list -> open a ready draft in the editor (every section, ATS check, AI notes,
// templates, PDF / Word, save as profile resume, check or tailor to a job). Improve Upload and
// Build From Scratch start new drafts; generation runs on the server and the list polls.

const STATUS_LABEL: Record<string, string> = {
  pending: 'Waiting',
  processing: 'Writing…',
  completed: 'Ready',
  failed: 'Failed',
};
const SOURCE_LABEL: Record<string, string> = {
  upload: 'Improved upload',
  scratch: 'Built from scratch',
  tailor: 'Tailored to a job',
};

const splitLines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean);
const splitComma = (text: string) => text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message || fallback : fallback;

type Tab = 'list' | 'improve' | 'scratch';

export default function ResumeWritingScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('list');
  const [openId, setOpenId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['candidate', 'resume-writing', 'list'],
    queryFn: listResumeDrafts,
    refetchInterval: (query) => {
      const list = query.state.data?.data ?? [];
      return list.some((d) => d.status === 'pending' || d.status === 'processing') ? 5000 : false;
    },
  });
  const drafts = listQuery.data?.data ?? [];

  const goToListAndRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['candidate', 'resume-writing', 'list'] });
    setOpenId(null);
    setTab('list');
  };

  if (openId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <DraftEditor draftId={openId} onBack={() => setOpenId(null)} onQueued={goToListAndRefresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(candidate)/premium-services')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Resume Writing</ThemedText>
      </View>

      <View style={[styles.tabRow, { borderColor: theme.border }]}>
        {(['list', 'improve', 'scratch'] as Tab[]).map((t) => (
          <Pressable key={t} style={styles.tabButton} onPress={() => setTab(t)}>
            <ThemedText type="smallBold" themeColor={tab === t ? 'primary' : 'textSecondary'}>
              {t === 'list' ? 'My Resumes' : t === 'improve' ? 'Improve Upload' : 'Build New'}
            </ThemedText>
            {tab === t ? <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} /> : null}
          </Pressable>
        ))}
      </View>

      {tab === 'list' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            Improve your resume with AI or build one from scratch, then edit it, check it for ATS and download it as PDF or Word.
          </ThemedText>
          {listQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : drafts.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No resumes yet. Use the tabs above to get started.
            </ThemedText>
          ) : (
            drafts.map((d) => <DraftCard key={d.id} draft={d} onOpen={() => setOpenId(d.id)} />)
          )}
        </ScrollView>
      ) : tab === 'improve' ? (
        <ImproveTab onQueued={goToListAndRefresh} />
      ) : (
        <ScratchTab onQueued={goToListAndRefresh} />
      )}
    </SafeAreaView>
  );
}

function DraftCard({ draft, onOpen }: { draft: ResumeWritingDraft; onOpen: () => void }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const busy = draft.status === 'pending' || draft.status === 'processing';

  const remove = () =>
    Alert.alert('Delete this resume?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteResumeDraft(draft.id);
            queryClient.invalidateQueries({ queryKey: ['candidate', 'resume-writing', 'list'] });
          } catch (err) {
            Alert.alert('Could not delete', errorMessage(err, 'Please try again.'));
          }
        },
      },
    ]);

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" style={{ flex: 1 }}>
          {draft.title || 'Untitled Resume'}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">{STATUS_LABEL[draft.status] ?? draft.status}</ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {SOURCE_LABEL[draft.source_type] ?? 'Resume'}
      </ThemedText>

      {draft.status === 'completed' ? (
        <View style={styles.row}>
          <Pressable style={[styles.actionButton, styles.flex1, { borderColor: theme.primary, borderWidth: 1 }]} onPress={onOpen}>
            <FontAwesome6 name="pen" size={12} color={theme.primary} />
            <ThemedText type="small" themeColor="primary">Open, edit & download</ThemedText>
          </Pressable>
          <Pressable style={[styles.iconButton, { borderColor: theme.border }]} onPress={remove} hitSlop={6}>
            <FontAwesome6 name="trash-can" size={13} color={theme.danger} />
          </Pressable>
        </View>
      ) : draft.status === 'failed' ? (
        <View style={styles.row}>
          <ThemedText type="small" style={{ color: theme.danger, flex: 1 }}>
            {draft.error_message || "We couldn't write this resume. Nothing was charged. Please try again."}
          </ThemedText>
          <Pressable style={[styles.iconButton, { borderColor: theme.border }]} onPress={remove} hitSlop={6}>
            <FontAwesome6 name="trash-can" size={13} color={theme.danger} />
          </Pressable>
        </View>
      ) : busy ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={theme.primary} />
          <ThemedText type="small" themeColor="textSecondary">
            Our AI is writing it. Usually 30 to 90 seconds.
          </ThemedText>
        </View>
      ) : null}
    </ThemedView>
  );
}

function PaywallLink({ error }: { error: unknown }) {
  if (!(error instanceof ApiError) || error.status !== 402) return null;
  return (
    <Pressable onPress={() => router.push('/(candidate)/my-purchases')}>
      <ThemedText type="small" themeColor="primary">
        Top up coins or buy a credit
      </ThemedText>
    </Pressable>
  );
}

function ImproveTab({ onQueued }: { onQueued: () => void }) {
  const theme = useTheme();
  const { confirmSpend, consentModal } = useCoinConsent();
  const [file, setFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [jdText, setJdText] = useState('');

  const mutation = useMutation({
    mutationFn: (f: NonNullable<typeof file>) => improveResume(f, { jdText: jdText.trim(), targetRole: targetRole.trim() }),
    onSuccess: () => setTimeout(onQueued, 600),
  });

  const pickFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    setFile({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' });
  };

  const submit = async () => {
    if (!file) return;
    if (!(await confirmSpend({ action: 'resume_writing' }))) return;
    mutation.mutate(file);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {consentModal}
      <ThemedText type="small" themeColor="textSecondary">
        Upload your resume. AI rewrites every section for impact and ATS, keeps all your details, and tells you what it changed.
      </ThemedText>

      <Pressable style={[styles.dropzone, { borderColor: file ? theme.primary : theme.border }]} onPress={pickFile}>
        <FontAwesome6 name={file ? 'file-lines' : 'file-arrow-up'} size={22} color={theme.primary} />
        <ThemedText type="smallBold" numberOfLines={1}>
          {file ? file.name : 'Choose a resume (PDF, DOC, DOCX)'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {file ? 'Tap to choose a different file' : 'Scanned photos cannot be read'}
        </ThemedText>
      </Pressable>

      <TextField label="Job title you want (optional)" value={targetRole} onChangeText={setTargetRole} placeholder="e.g. Sales Executive" />
      <TextField
        label="Job description to aim at (optional)"
        value={jdText}
        onChangeText={setJdText}
        placeholder="Paste a job post to tailor your resume to it"
        multiline
        numberOfLines={5}
      />

      {mutation.isError ? (
        <View style={styles.errorBox}>
          <ThemedText type="small" style={{ color: theme.danger }}>
            {errorMessage(mutation.error, 'Could not start. Please try again.')}
          </ThemedText>
          <PaywallLink error={mutation.error} />
        </View>
      ) : null}
      {mutation.isSuccess ? (
        <ThemedText type="small" style={{ color: '#2f855a' }}>
          Started! Switching to My Resumes…
        </ThemedText>
      ) : null}

      <Button title="Improve My Resume" icon="wand-magic-sparkles" onPress={submit} loading={mutation.isPending} disabled={!file} />
    </ScrollView>
  );
}

const emptyExperience = (): ResumeExperienceInput => ({ company: '', position: '', location: '', start_date: '', end_date: '', description: '' });
const emptyEducation = (): ResumeEducationInput => ({ degree: '', field: '', institution: '', year: '', score: '' });
const emptyProject = (): ResumeProjectInput => ({ name: '', description: '', url: '' });

function ScratchTab({ onQueued }: { onQueued: () => void }) {
  const theme = useTheme();
  const { confirmSpend, consentModal } = useCoinConsent();
  const [basics, setBasics] = useState({
    full_name: '', target_role: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '', summary: '',
  });
  const [experience, setExperience] = useState<ResumeExperienceInput[]>([emptyExperience()]);
  const [projects, setProjects] = useState<ResumeProjectInput[]>([]);
  const [education, setEducation] = useState<ResumeEducationInput[]>([emptyEducation()]);
  const [skills, setSkills] = useState<string[]>([]);
  const [certsText, setCertsText] = useState('');
  const [achievementsText, setAchievementsText] = useState('');
  const [languagesText, setLanguagesText] = useState('');
  const [jdText, setJdText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [prefillMsg, setPrefillMsg] = useState<string | null>(null);

  const setField = (key: keyof typeof basics) => (v: string) => setBasics((b) => ({ ...b, [key]: v }));
  const patchAt = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number, patch: Partial<T>) =>
    setter((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  const removeAt = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) =>
    setter((prev) => prev.filter((_, i) => i !== index));

  const prefill = useMutation({
    mutationFn: getResumePrefill,
    onSuccess: (res) => {
      const d = res.data;
      // Fill only what is still empty, so nothing the candidate typed is lost.
      setBasics((b) => {
        const next = { ...b };
        (Object.keys(b) as (keyof typeof b)[]).forEach((k) => {
          const value = (d as unknown as Record<string, unknown>)[k];
          if (!next[k] && typeof value === 'string') next[k] = value;
        });
        return next;
      });
      const hasAny = <T extends object>(list: T[]) => list.some((e) => Object.values(e).some((v) => String(v ?? '').trim()));
      if (d.experience?.length && !hasAny(experience)) setExperience(d.experience);
      if (d.education?.length && !hasAny(education)) setEducation(d.education);
      if (d.projects?.length && !hasAny(projects)) setProjects(d.projects);
      if (d.skills?.length && !skills.length) setSkills(d.skills);
      if (d.certifications?.length && !certsText.trim()) setCertsText(d.certifications.join('\n'));
      if (d.languages?.length && !languagesText.trim()) setLanguagesText(d.languages.join(', '));
      setPrefillMsg('Filled from your profile. Anything you had typed was kept.');
    },
    onError: (err) => setPrefillMsg(errorMessage(err, 'Could not load your profile.')),
  });

  const mutation = useMutation({
    mutationFn: createResumeFromScratch,
    onSuccess: () => setTimeout(onQueued, 600),
    onError: (err) => setError(errorMessage(err, 'Could not start. Please try again.')),
  });

  const submit = async () => {
    const payload: ScratchInput = {
      ...Object.fromEntries(Object.entries(basics).map(([k, v]) => [k, v.trim()])) as typeof basics,
      experience: experience.filter((e) => e.company?.trim() || e.position?.trim()),
      projects: projects.filter((p) => p.name?.trim() || p.description?.trim()),
      education: education.filter((e) => e.degree?.trim() || e.institution?.trim()),
      skills,
      certifications: splitLines(certsText),
      achievements: splitLines(achievementsText),
      languages: splitComma(languagesText),
      jd_text: jdText.trim(),
    };
    if (!payload.experience.length && !payload.education.length && !payload.projects.length && !payload.skills.length) {
      setError('Please fill in at least some experience, projects, education or skills.');
      return;
    }
    if (!payload.email && !payload.phone) {
      setError('Please add an email or phone number so recruiters can contact you.');
      return;
    }
    setError(null);
    if (!(await confirmSpend({ action: 'resume_writing' }))) return;
    mutation.mutate(payload);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {consentModal}
      <ThemedText type="small" themeColor="textSecondary">
        Answer a few questions and AI writes a full resume. No file needed.
      </ThemedText>
      <Button title="Fill from my Skreenit profile" variant="secondary" icon="user-check" onPress={() => prefill.mutate()} loading={prefill.isPending} />
      {prefillMsg ? <ThemedText type="small" themeColor="textSecondary">{prefillMsg}</ThemedText> : null}

      <ThemedText type="smallBold">Basic & Contact Info</ThemedText>
      <TextField label="Full Name" value={basics.full_name} onChangeText={setField('full_name')} />
      <TextField label="Job title you want" value={basics.target_role} onChangeText={setField('target_role')} placeholder="e.g. Product Manager" />
      <TextField label="Email" value={basics.email} onChangeText={setField('email')} keyboardType="email-address" autoCapitalize="none" />
      <TextField label="Phone" value={basics.phone} onChangeText={setField('phone')} keyboardType="phone-pad" placeholder="+91 98765 43210" />
      <TextField label="City" value={basics.location} onChangeText={setField('location')} placeholder="e.g. Hyderabad, Telangana" />
      <TextField label="LinkedIn (optional)" value={basics.linkedin} onChangeText={setField('linkedin')} autoCapitalize="none" />
      <TextField label="GitHub (optional)" value={basics.github} onChangeText={setField('github')} autoCapitalize="none" />
      <TextField label="Portfolio / Website (optional)" value={basics.website} onChangeText={setField('website')} autoCapitalize="none" />
      <TextField
        label="Professional Summary (optional)"
        value={basics.summary}
        onChangeText={setField('summary')}
        placeholder="Leave blank and AI will write one"
        multiline
        numberOfLines={3}
      />

      <ThemedText type="smallBold">Work Experience & Internships</ThemedText>
      {experience.map((entry, i) => (
        <ThemedView key={`e${i}`} style={[styles.entryBlock, { borderColor: theme.border }]}>
          <RemoveRow onRemove={() => removeAt(setExperience, i)} />
          <TextField label="Company" value={entry.company} onChangeText={(v) => patchAt(setExperience, i, { company: v })} />
          <TextField label="Job title" value={entry.position} onChangeText={(v) => patchAt(setExperience, i, { position: v })} />
          <TextField label="City" value={entry.location} onChangeText={(v) => patchAt(setExperience, i, { location: v })} />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <TextField label="Start" value={entry.start_date} onChangeText={(v) => patchAt(setExperience, i, { start_date: v })} placeholder="Jan 2020" />
            </View>
            <View style={styles.flex1}>
              <TextField label="End" value={entry.end_date} onChangeText={(v) => patchAt(setExperience, i, { end_date: v })} placeholder="Present" />
            </View>
          </View>
          <TextField
            label="What you did (rough notes are fine)"
            value={entry.description}
            onChangeText={(v) => patchAt(setExperience, i, { description: v })}
            multiline
            numberOfLines={3}
          />
        </ThemedView>
      ))}
      <Button title="Add Experience" variant="secondary" icon="plus" onPress={() => setExperience((p) => [...p, emptyExperience()])} />

      <ThemedText type="smallBold">Projects</ThemedText>
      {projects.map((entry, i) => (
        <ThemedView key={`p${i}`} style={[styles.entryBlock, { borderColor: theme.border }]}>
          <RemoveRow onRemove={() => removeAt(setProjects, i)} />
          <TextField label="Project name" value={entry.name} onChangeText={(v) => patchAt(setProjects, i, { name: v })} />
          <TextField label="Link (optional)" value={entry.url} onChangeText={(v) => patchAt(setProjects, i, { url: v })} autoCapitalize="none" />
          <TextField
            label="What it is and what you did"
            value={entry.description}
            onChangeText={(v) => patchAt(setProjects, i, { description: v })}
            multiline
            numberOfLines={2}
          />
        </ThemedView>
      ))}
      <Button title="Add Project" variant="secondary" icon="plus" onPress={() => setProjects((p) => [...p, emptyProject()])} />

      <ThemedText type="smallBold">Education</ThemedText>
      {education.map((entry, i) => (
        <ThemedView key={`d${i}`} style={[styles.entryBlock, { borderColor: theme.border }]}>
          <RemoveRow onRemove={() => removeAt(setEducation, i)} />
          <TextField label="Degree" value={entry.degree} onChangeText={(v) => patchAt(setEducation, i, { degree: v })} placeholder="e.g. B.Tech" />
          <TextField label="Field" value={entry.field} onChangeText={(v) => patchAt(setEducation, i, { field: v })} />
          <TextField label="College / School" value={entry.institution} onChangeText={(v) => patchAt(setEducation, i, { institution: v })} />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <TextField label="Year" value={entry.year} onChangeText={(v) => patchAt(setEducation, i, { year: v })} keyboardType="number-pad" />
            </View>
            <View style={styles.flex1}>
              <TextField label="CGPA / %" value={entry.score} onChangeText={(v) => patchAt(setEducation, i, { score: v })} />
            </View>
          </View>
        </ThemedView>
      ))}
      <Button title="Add Education" variant="secondary" icon="plus" onPress={() => setEducation((p) => [...p, emptyEducation()])} />

      <SkillTagInput label="Skills" value={skills} onChange={setSkills} />
      <TextField label="Achievements (one per line)" value={achievementsText} onChangeText={setAchievementsText} multiline numberOfLines={3} />
      <TextField
        label="Certifications (one per line: Name, Issuer, Year)"
        value={certsText}
        onChangeText={setCertsText}
        multiline
        numberOfLines={2}
      />
      <TextField label="Languages (comma separated)" value={languagesText} onChangeText={setLanguagesText} placeholder="English, Hindi" />
      <TextField
        label="Job description to aim at (optional)"
        value={jdText}
        onChangeText={setJdText}
        placeholder="Paste a job post to tailor your resume to it"
        multiline
        numberOfLines={4}
      />

      {error ? (
        <View style={styles.errorBox}>
          <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
          <PaywallLink error={mutation.error} />
        </View>
      ) : null}
      {mutation.isSuccess ? (
        <ThemedText type="small" style={{ color: '#2f855a' }}>
          Started! Switching to My Resumes…
        </ThemedText>
      ) : null}

      <Button title="Build My Resume" icon="wand-magic-sparkles" onPress={submit} loading={mutation.isPending} />
    </ScrollView>
  );
}

function RemoveRow({ onRemove }: { onRemove: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onRemove} hitSlop={8} style={styles.removeRow}>
      <FontAwesome6 name="trash-can" size={12} color={theme.danger} />
      <ThemedText type="small" style={{ color: theme.danger }}>Remove</ThemedText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------------------------

interface EditForm {
  name: string; headline: string; email: string; phone: string; location: string;
  linkedin: string; github: string; website: string; summary: string;
  experience: { position: string; company: string; location: string; start_date: string; end_date: string; bullets: string }[];
  projects: { name: string; url: string; description: string; bullets: string }[];
  education: { degree: string; field: string; institution: string; start_date: string; end_date: string; score: string }[];
  skills: string[]; awards: string; certs: string; languages: string;
}

function toForm(c: ResumeContent): EditForm {
  const one = (list?: string[]) => list?.[0] ?? '';
  return {
    name: c.contact_info?.name ?? '', headline: c.headline ?? '', email: one(c.contact_info?.emails), phone: one(c.contact_info?.phones),
    location: c.location ?? '', linkedin: one(c.contact_info?.linkedin), github: one(c.contact_info?.github), website: one(c.contact_info?.website),
    summary: c.sections?.summary ?? '',
    experience: (c.experience ?? []).map((e) => ({ ...e, bullets: (e.highlights ?? []).join('\n') })),
    projects: (c.projects ?? []).map((p) => ({ name: p.name, url: p.url, description: p.description, bullets: (p.highlights ?? []).join('\n') })),
    education: (c.education ?? []).map((e) => ({ ...e })),
    skills: c.skills ?? [],
    awards: (c.awards ?? []).map((a) => a.title).join('\n'),
    certs: (c.certificates ?? []).map((x) => [x.name, x.issuer, x.date].filter(Boolean).join(', ')).join('\n'),
    languages: (c.languages ?? []).join(', '),
  };
}

function fromForm(f: EditForm, original: ResumeContent): ResumeContent {
  const arr = (v: string) => (v.trim() ? [v.trim()] : []);
  return {
    ...original,
    contact_info: { name: f.name.trim(), emails: arr(f.email), phones: arr(f.phone), linkedin: arr(f.linkedin), github: arr(f.github), website: arr(f.website) },
    headline: f.headline.trim(),
    location: f.location.trim(),
    sections: { summary: f.summary.trim() },
    experience: f.experience.map(({ bullets, ...e }) => ({ ...e, highlights: splitLines(bullets) })),
    projects: f.projects.map(({ bullets, ...p }) => ({ ...p, highlights: splitLines(bullets) })),
    education: f.education,
    skills: f.skills,
    awards: splitLines(f.awards).map((title) => ({ title, date: '', awarder: '' })),
    // The server splits "Name, Issuer, Year" lines itself.
    certificates: splitLines(f.certs) as unknown as ResumeContent['certificates'],
    languages: splitComma(f.languages),
  };
}

function DraftEditor({ draftId, onBack, onQueued }: { draftId: string; onBack: () => void; onQueued: () => void }) {
  const theme = useTheme();
  const draftQuery = useQuery({ queryKey: ['candidate', 'resume-writing', draftId], queryFn: () => getResumeDraft(draftId) });
  const templatesQuery = useQuery({ queryKey: ['candidate', 'resume-writing', 'templates'], queryFn: listResumeTemplates, staleTime: 3600_000 });
  const draft = draftQuery.data?.data;

  if (!draft?.ai_content || !templatesQuery.data) {
    const failed = draftQuery.isError || templatesQuery.isError;
    return (
      <View style={styles.loadingBox}>
        {failed ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {errorMessage(draftQuery.error ?? templatesQuery.error, 'Could not open this resume.')}
          </ThemedText>
        ) : (
          <ActivityIndicator color={theme.primary} />
        )}
      </View>
    );
  }
  // Keyed so the editor's state starts fresh from this draft's content.
  return <EditorBody key={draft.id} draft={draft} content={draft.ai_content} templates={templatesQuery.data.data}
                     onBack={onBack} onQueued={onQueued} />;
}

function EditorBody({ draft, content, templates, onBack, onQueued }: {
  draft: ResumeWritingDraft; content: ResumeContent; templates: ResumeTemplate[]; onBack: () => void; onQueued: () => void;
}) {
  const theme = useTheme();
  const draftId = draft.id;
  const { confirmSpend, consentModal } = useCoinConsent();
  const [form, setForm] = useState<EditForm>(() => toForm(content));
  const [ats, setAts] = useState<AtsCheck | null>(draft.ats_check ?? null);
  const [dirty, setDirty] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(
    () => (templates.some((t) => t.id === draft.template_id) ? draft.template_id : templates[0]?.id ?? null),
  );
  const [jdText, setJdText] = useState(draft.jd_text ?? '');
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const update = (patch: Partial<EditForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };
  const updateList = <K extends 'experience' | 'projects' | 'education'>(key: K, index: number, patch: Partial<EditForm[K][number]>) => {
    setForm((f) => ({ ...f, [key]: (f[key] as EditForm[K][number][]).map((e, i) => (i === index ? { ...e, ...patch } : e)) }));
    setDirty(true);
  };
  const removeFrom = (key: 'experience' | 'projects' | 'education', index: number) => {
    setForm((f) => ({ ...f, [key]: (f[key] as unknown[]).filter((_, i) => i !== index) }));
    setDirty(true);
  };

  const save = async (): Promise<boolean> => {
    if (!dirty) return true;
    try {
      const res = await saveResumeDraftContent(draftId, fromForm(form, content));
      setAts(res.data.ats_check);
      setDirty(false);
      return true;
    } catch (err) {
      setMessage({ text: errorMessage(err, 'Could not save your changes.'), error: true });
      return false;
    }
  };

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label);
    setMessage(null);
    try {
      if (!(await save())) return;
      const text = await fn();
      if (text) setMessage({ text });
    } catch (err) {
      setMessage({ text: errorMessage(err, 'Something went wrong. Please try again.'), error: true });
    } finally {
      setBusy(null);
    }
  };

  const tailor = async () => {
    if (jdText.trim().length < 80) {
      setMessage({ text: 'Please paste the full job description first.', error: true });
      return;
    }
    if (!(await save())) return;
    if (!(await confirmSpend({ action: 'resume_writing' }))) return;
    setBusy('tailor');
    try {
      await tailorResumeDraft(draftId, jdText.trim());
      onQueued();
    } catch (err) {
      setMessage({ text: errorMessage(err, 'Could not start tailoring.'), error: true });
    } finally {
      setBusy(null);
    }
  };

  const goBack = () => {
    if (!dirty) return onBack();
    Alert.alert('Unsaved changes', 'Save your changes before leaving?', [
      { text: 'Discard', style: 'destructive', onPress: onBack },
      { text: 'Save', onPress: async () => { if (await save()) onBack(); } },
    ]);
  };

  const scoreColor = !ats ? theme.text : ats.score >= 80 ? '#15803d' : ats.score >= 60 ? '#b45309' : theme.danger;
  const notes = content.improvement_notes ?? [];
  const keywordIdeas = content.ats_keyword_suggestions ?? [];

  return (
    <>
      {consentModal}
      <View style={styles.headerRow}>
        <Pressable onPress={goBack} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle" numberOfLines={1} style={{ flex: 1 }}>{draft.title || 'Your Resume'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{dirty ? 'Unsaved' : 'Saved'}</ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {ats ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.row}>
              <ThemedText type="title" style={{ color: scoreColor }}>{ats.score}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex1}>
                ATS score out of 100{ats.job_keywords ? ', including the job match' : ''}. Updates when you save.
              </ThemedText>
            </View>
            {ats.checks.filter((c) => !c.ok).map((c) => (
              <View key={c.id} style={styles.checkRow}>
                <FontAwesome6 name="circle-xmark" size={13} color={theme.danger} />
                <ThemedText type="small" style={styles.flex1}>{c.tip}</ThemedText>
              </View>
            ))}
            {ats.checks.every((c) => c.ok) ? <ThemedText type="small">All basic checks pass.</ThemedText> : null}
            {ats.job_keywords ? (
              <>
                <ThemedText type="smallBold">Job keywords</ThemedText>
                <View style={styles.chips}>
                  {ats.job_keywords.found.map((k) => <Chip key={`f${k}`} text={k} tone="good" />)}
                  {ats.job_keywords.missing.map((k) => <Chip key={`m${k}`} text={k} tone="bad" />)}
                </View>
                <ThemedText type="small" themeColor="textSecondary">Red ones are missing. Add them only if they are true for you.</ThemedText>
              </>
            ) : null}
          </ThemedView>
        ) : null}

        {notes.length || keywordIdeas.length ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">What the AI changed</ThemedText>
            {notes.map((n, i) => (
              <ThemedText key={i} type="small">• {n.section}: {n.after}</ThemedText>
            ))}
            {keywordIdeas.length ? (
              <>
                <ThemedText type="smallBold">Keywords to consider</ThemedText>
                <View style={styles.chips}>{keywordIdeas.map((k) => <Chip key={k} text={k} />)}</View>
              </>
            ) : null}
          </ThemedView>
        ) : null}

        <ThemedText type="smallBold">Basics</ThemedText>
        <TextField label="Full name" value={form.name} onChangeText={(v) => update({ name: v })} />
        <TextField label="Job title under your name" value={form.headline} onChangeText={(v) => update({ headline: v })} />
        <TextField label="Email" value={form.email} onChangeText={(v) => update({ email: v })} keyboardType="email-address" autoCapitalize="none" />
        <TextField label="Phone" value={form.phone} onChangeText={(v) => update({ phone: v })} keyboardType="phone-pad" />
        <TextField label="City" value={form.location} onChangeText={(v) => update({ location: v })} />
        <TextField label="LinkedIn" value={form.linkedin} onChangeText={(v) => update({ linkedin: v })} autoCapitalize="none" />
        <TextField label="GitHub" value={form.github} onChangeText={(v) => update({ github: v })} autoCapitalize="none" />
        <TextField label="Website" value={form.website} onChangeText={(v) => update({ website: v })} autoCapitalize="none" />
        <TextField label="Professional summary" value={form.summary} onChangeText={(v) => update({ summary: v })} multiline numberOfLines={4} />

        <ThemedText type="smallBold">Experience</ThemedText>
        {form.experience.map((e, i) => (
          <ThemedView key={`x${i}`} style={[styles.entryBlock, { borderColor: theme.border }]}>
            <RemoveRow onRemove={() => removeFrom('experience', i)} />
            <TextField label="Job title" value={e.position} onChangeText={(v) => updateList('experience', i, { position: v })} />
            <TextField label="Company" value={e.company} onChangeText={(v) => updateList('experience', i, { company: v })} />
            <View style={styles.row}>
              <View style={styles.flex1}><TextField label="Start" value={e.start_date} onChangeText={(v) => updateList('experience', i, { start_date: v })} /></View>
              <View style={styles.flex1}><TextField label="End" value={e.end_date} onChangeText={(v) => updateList('experience', i, { end_date: v })} placeholder="Present" /></View>
            </View>
            <TextField label="Bullet points (one per line)" value={e.bullets} onChangeText={(v) => updateList('experience', i, { bullets: v })} multiline numberOfLines={5} />
          </ThemedView>
        ))}
        <Button title="Add Experience" variant="secondary" icon="plus"
          onPress={() => update({ experience: [...form.experience, { position: '', company: '', location: '', start_date: '', end_date: '', bullets: '' }] })} />

        <ThemedText type="smallBold">Projects</ThemedText>
        {form.projects.map((p, i) => (
          <ThemedView key={`q${i}`} style={[styles.entryBlock, { borderColor: theme.border }]}>
            <RemoveRow onRemove={() => removeFrom('projects', i)} />
            <TextField label="Project name" value={p.name} onChangeText={(v) => updateList('projects', i, { name: v })} />
            <TextField label="Link" value={p.url} onChangeText={(v) => updateList('projects', i, { url: v })} autoCapitalize="none" />
            <TextField label="One-line description" value={p.description} onChangeText={(v) => updateList('projects', i, { description: v })} />
            <TextField label="Bullet points (one per line)" value={p.bullets} onChangeText={(v) => updateList('projects', i, { bullets: v })} multiline numberOfLines={3} />
          </ThemedView>
        ))}
        <Button title="Add Project" variant="secondary" icon="plus"
          onPress={() => update({ projects: [...form.projects, { name: '', url: '', description: '', bullets: '' }] })} />

        <ThemedText type="smallBold">Education</ThemedText>
        {form.education.map((e, i) => (
          <ThemedView key={`y${i}`} style={[styles.entryBlock, { borderColor: theme.border }]}>
            <RemoveRow onRemove={() => removeFrom('education', i)} />
            <TextField label="Degree" value={e.degree} onChangeText={(v) => updateList('education', i, { degree: v })} />
            <TextField label="Field" value={e.field} onChangeText={(v) => updateList('education', i, { field: v })} />
            <TextField label="College / School" value={e.institution} onChangeText={(v) => updateList('education', i, { institution: v })} />
            <View style={styles.row}>
              <View style={styles.flex1}><TextField label="Year" value={e.end_date} onChangeText={(v) => updateList('education', i, { end_date: v })} /></View>
              <View style={styles.flex1}><TextField label="CGPA / %" value={e.score} onChangeText={(v) => updateList('education', i, { score: v })} /></View>
            </View>
          </ThemedView>
        ))}
        <Button title="Add Education" variant="secondary" icon="plus"
          onPress={() => update({ education: [...form.education, { degree: '', field: '', institution: '', start_date: '', end_date: '', score: '' }] })} />

        <SkillTagInput label="Skills" value={form.skills} onChange={(v) => update({ skills: v })} />
        <TextField label="Achievements (one per line)" value={form.awards} onChangeText={(v) => update({ awards: v })} multiline numberOfLines={3} />
        <TextField label="Certifications (one per line: Name, Issuer, Year)" value={form.certs} onChangeText={(v) => update({ certs: v })} multiline numberOfLines={2} />
        <TextField label="Languages (comma separated)" value={form.languages} onChangeText={(v) => update({ languages: v })} />

        <Button title={dirty ? 'Save Changes' : 'All changes saved'} variant="secondary" icon="floppy-disk" disabled={!dirty}
          loading={busy === 'save'} onPress={() => run('save', async () => 'Saved.')} />

        <ThemedText type="smallBold">Choose a template</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">ATS-safe templates use one column of plain text, which job portals read best.</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
          {templates.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTemplateId(t.id)}
              style={[styles.templateCard, { borderColor: t.id === templateId ? theme.primary : theme.border }]}
            >
              <Image source={{ uri: templatePreviewUri(t) }} style={styles.templatePreview} resizeMode="cover" />
              <ThemedText type="smallBold">{t.name}</ThemedText>
              <ThemedText type="small" style={{ color: t.ats_safe ? '#15803d' : '#b45309' }}>{t.ats_safe ? 'ATS-safe' : 'Not for ATS'}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <Button title="Download PDF" icon="file-pdf" loading={busy === 'pdf'} disabled={!!busy}
          onPress={() => run('pdf', () => downloadRenderedResume(draftId, templateId, 'pdf'))} />
        <Button title="Download Word" variant="secondary" icon="file-word" loading={busy === 'docx'} disabled={!!busy}
          onPress={() => run('docx', () => downloadRenderedResume(draftId, templateId, 'docx'))} />
        <Button title="Use as my Skreenit resume" variant="secondary" icon="user-check" loading={busy === 'profile'} disabled={!!busy}
          onPress={() =>
            Alert.alert('Replace your profile resume?', 'Recruiters and your job applications will see this one.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Replace', onPress: () => run('profile', async () => {
                await saveResumeToProfile(draftId, templateId);
                return 'Done. This is now the resume on your Skreenit profile.';
              }) },
            ])
          } />
        {message ? (
          <ThemedText type="small" style={{ color: message.error ? theme.danger : '#2f855a' }}>{message.text}</ThemedText>
        ) : null}

        <ThemedText type="smallBold">Check against a job</ThemedText>
        <TextField label="Job description" value={jdText} onChangeText={setJdText} placeholder="Paste a job post" multiline numberOfLines={5} />
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Button title="Check (free)" variant="secondary" loading={busy === 'check'} disabled={!!busy}
              onPress={() => run('check', async () => {
                const res = await checkResumeAgainstJob(draftId, jdText.trim());
                setAts(res.data);
                return 'Checked. See the ATS score at the top.';
              })} />
          </View>
          <View style={styles.flex1}>
            <Button title="Tailor to job" icon="wand-magic-sparkles" loading={busy === 'tailor'} disabled={!!busy} onPress={tailor} />
          </View>
        </View>
        <ThemedText type="small" themeColor="textSecondary">Tailoring makes a new copy aimed at this job. This version is kept.</ThemedText>
      </ScrollView>
    </>
  );
}

function Chip({ text, tone }: { text: string; tone?: 'good' | 'bad' }) {
  const theme = useTheme();
  const bg = tone === 'good' ? '#dcfce7' : tone === 'bad' ? '#fee2e2' : theme.backgroundElement;
  const fg = tone === 'good' ? '#166534' : tone === 'bad' ? '#991b1b' : theme.text;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <ThemedText type="small" style={{ color: fg }}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, gap: 20 },
  tabButton: { paddingBottom: 10, gap: 8 },
  tabIndicator: { height: 2, borderRadius: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 60 },
  empty: { textAlign: 'center', marginTop: 24 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, paddingVertical: 8 },
  iconButton: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex1: { flex: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  templateRow: { gap: 10, paddingVertical: 4 },
  templateCard: { width: 120, borderWidth: 2, borderRadius: Radius.md, padding: 6, gap: 2 },
  templatePreview: { width: '100%', aspectRatio: 210 / 297, borderRadius: 6, backgroundColor: '#f1f5f9' },
  dropzone: { borderWidth: 2, borderStyle: 'dashed', borderRadius: Radius.lg, padding: 26, alignItems: 'center', gap: 6 },
  loadingBox: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  errorBox: { gap: 6 },
  entryBlock: { borderWidth: 1, borderRadius: Radius.md, padding: 12, gap: 8 },
  removeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end' },
});

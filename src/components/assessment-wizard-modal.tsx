import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TextField } from '@/components/text-field';
import {
  analyzeJobDescription,
  browseAssessmentCatalog,
  saveAssessmentConfig,
  uploadCustomAssessment,
  type AssessmentCatalogEntry,
  type AssessmentSelectionItem,
  type JdRecommendedAssessment,
} from '@/lib/api/position-assessments';
import { listMyJobs } from '@/lib/api/recruiter';

type Step = 1 | 2 | 3 | 4;
type Tab = 'recommended' | 'browse' | 'upload';

// Selections are keyed "catalog:<key>" or "custom:<uploaded_assessment_id>" so
// the same map can hold both kinds without collision, mirroring web's
// selectionMapKey() in recruiter-dashboard.js.
const catalogMapKey = (key: string) => `catalog:${key}`;
const customMapKey = (id: string) => `custom:${id}`;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Ported from sql-skreenit's AI Assessment Wizard (dashboard/js/recruiter-dashboard.js).
// Step 1: pick job. Step 2: optionally upload a JD for AI recommendations (skippable).
// Step 3: select assessments — Recommended, Browse All, and Upload Your Own tabs
// all share one selection set. Step 4: confirm and save.
export function AssessmentWizardModal({ visible, onClose, onSaved }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>(1);
  const [tab, setTab] = useState<Tab>('recommended');
  const [jobId, setJobId] = useState('');
  const [recommended, setRecommended] = useState<JdRecommendedAssessment[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [search, setSearch] = useState('');
  const [selections, setSelections] = useState<Map<string, string>>(new Map()); // mapKey -> label
  const [error, setError] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');

  const jobsQuery = useQuery({ queryKey: ['recruiter', 'jobs', 'all'], queryFn: () => listMyJobs({ pageSize: 200 }), enabled: visible });
  const jobOptions = useMemo(
    () => (jobsQuery.data?.data.jobs ?? []).map((j) => ({ label: j.job_title, value: j.id })),
    [jobsQuery.data],
  );

  const catalogQuery = useQuery({
    queryKey: ['recruiter', 'assessment-catalog', 'browse'],
    queryFn: browseAssessmentCatalog,
    enabled: visible && step === 3,
  });

  const analyzeMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => analyzeJobDescription(jobId, file),
    onSuccess: (res) => {
      setRecommended(res.data.recommended);
      setAnalyzed(true);
      setStep(3);
      setTab('recommended');
    },
    onError: () => {
      setAnalyzed(true);
      setStep(3);
      setTab('browse');
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const items: AssessmentSelectionItem[] = Array.from(selections.entries()).map(([mapKey, label]) =>
        mapKey.startsWith('custom:')
          ? { type: 'custom', uploaded_assessment_id: mapKey.slice('custom:'.length), label }
          : { type: 'catalog', key: mapKey.slice('catalog:'.length), label },
      );
      return saveAssessmentConfig(jobId, items);
    },
    onSuccess: () => {
      reset();
      onSaved();
    },
    onError: () => setError('Could not save this assessment config. Please try again.'),
  });

  const uploadCustomMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) =>
      uploadCustomAssessment(jobId, file, customTitle.trim() || undefined),
    onSuccess: (res) => {
      toggleSelection(customMapKey(res.data.id), res.data.title);
      setCustomTitle('');
    },
  });

  const reset = () => {
    setStep(1);
    setTab('recommended');
    setJobId('');
    setRecommended([]);
    setAnalyzed(false);
    setSearch('');
    setSelections(new Map());
    setError(null);
    setCustomTitle('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const toggleSelection = (key: string, label: string) => {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, label);
      return next;
    });
  };

  const pickJdFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    analyzeMutation.mutate({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' });
  };

  const pickCustomAssessmentFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    uploadCustomMutation.mutate({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' });
  };

  const skipToBrowse = () => {
    setAnalyzed(false);
    setStep(3);
    setTab('browse');
  };

  const allCatalogItems = useMemo(() => {
    const byIndustry = catalogQuery.data?.data.by_industry ?? {};
    const items: (AssessmentCatalogEntry & { industryLabel: string })[] = [];
    Object.entries(byIndustry).forEach(([industryLabel, entries]) => {
      entries.forEach((e) => items.push({ ...e, industryLabel }));
    });
    return items;
  }, [catalogQuery.data]);

  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return allCatalogItems;
    const needle = search.trim().toLowerCase();
    return allCatalogItems.filter(
      (item) => item.name.toLowerCase().includes(needle) || (item.skills_measured ?? '').toLowerCase().includes(needle),
    );
  }, [allCatalogItems, search]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <ThemedView style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Assessments for a Job</ThemedText>
            <Pressable onPress={close} hitSlop={12}>
              <FontAwesome6 name="xmark" size={18} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.stepDots}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[styles.stepDot, { backgroundColor: s <= step ? theme.primary : theme.border }]}
              />
            ))}
          </View>

          {step === 1 ? (
            <ScrollView contentContainerStyle={styles.content}>
              <SelectField label="Select Job" value={jobId} options={jobOptions} onChange={setJobId} />
              <Button
                title="Next"
                onPress={() => {
                  if (!jobId) {
                    setError('Please select a job.');
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
              />
              {error ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              ) : null}
            </ScrollView>
          ) : null}

          {step === 2 ? (
            <ScrollView contentContainerStyle={styles.content}>
              <ThemedText type="small" themeColor="textSecondary">
                Upload a job description to get AI-recommended assessments, or skip straight to browsing the full
                catalog.
              </ThemedText>
              <Pressable style={[styles.dropzone, { borderColor: theme.border }]} onPress={pickJdFile}>
                {analyzeMutation.isPending ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <FontAwesome6 name="file-arrow-up" size={20} color={theme.primary} />
                )}
                <ThemedText type="small">
                  {analyzeMutation.isPending ? 'Analysing JD…' : 'Choose a JD document'}
                </ThemedText>
              </Pressable>
              <Pressable onPress={skipToBrowse}>
                <ThemedText type="small" themeColor="primary" style={styles.skipLink}>
                  Go straight to selection →
                </ThemedText>
              </Pressable>
            </ScrollView>
          ) : null}

          {step === 3 ? (
            <>
              <View style={[styles.subTabRow, { borderColor: theme.border }]}>
                <Pressable style={styles.subTab} onPress={() => setTab('recommended')}>
                  <ThemedText type="small" themeColor={tab === 'recommended' ? 'primary' : 'textSecondary'}>
                    Recommended
                  </ThemedText>
                </Pressable>
                <Pressable style={styles.subTab} onPress={() => setTab('browse')}>
                  <ThemedText type="small" themeColor={tab === 'browse' ? 'primary' : 'textSecondary'}>
                    Browse All
                  </ThemedText>
                </Pressable>
                <Pressable style={styles.subTab} onPress={() => setTab('upload')}>
                  <ThemedText type="small" themeColor={tab === 'upload' ? 'primary' : 'textSecondary'}>
                    Upload Your Own
                  </ThemedText>
                </Pressable>
              </View>

              <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content}>
                {tab === 'recommended' ? (
                  !analyzed || recommended.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      No recommendations yet — upload a JD (previous step) or use Browse All.
                    </ThemedText>
                  ) : (
                    recommended.map((item) => (
                      <CatalogRow
                        key={item.service_key}
                        item={item}
                        matchScore={item.match_score}
                        selected={selections.has(catalogMapKey(item.service_key))}
                        onToggle={() => toggleSelection(catalogMapKey(item.service_key), item.name)}
                      />
                    ))
                  )
                ) : tab === 'browse' ? (
                  <>
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search assessments..."
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.searchInput, { borderColor: theme.border, color: theme.text }]}
                    />
                    {catalogQuery.isLoading ? (
                      <ActivityIndicator color={theme.primary} />
                    ) : (
                      filteredCatalog
                        .filter((item) => item.service_key) // exclude bundle summary rows without a real test key
                        .map((item) => (
                          <CatalogRow
                            key={item.service_key}
                            item={item}
                            selected={selections.has(catalogMapKey(item.service_key))}
                            onToggle={() => toggleSelection(catalogMapKey(item.service_key), item.name)}
                          />
                        ))
                    )}
                  </>
                ) : (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      Upload your own assessment document (PDF, DOC, DOCX, or TXT). The candidate-facing text is
                      extracted automatically — this doesn&apos;t build discrete scored questions like catalog
                      assessments do.
                    </ThemedText>
                    <TextField label="Title (optional)" value={customTitle} onChangeText={setCustomTitle} placeholder="e.g. Case Study Brief" />
                    <Pressable style={[styles.dropzone, { borderColor: theme.border }]} onPress={pickCustomAssessmentFile}>
                      {uploadCustomMutation.isPending ? (
                        <ActivityIndicator color={theme.primary} />
                      ) : (
                        <FontAwesome6 name="file-arrow-up" size={20} color={theme.primary} />
                      )}
                      <ThemedText type="small">
                        {uploadCustomMutation.isPending ? 'Uploading & extracting…' : 'Choose a document'}
                      </ThemedText>
                    </Pressable>
                    {uploadCustomMutation.isError ? (
                      <ThemedText type="small" style={{ color: theme.danger }}>
                        Upload failed. Please try again.
                      </ThemedText>
                    ) : null}
                  </>
                )}

                {selections.size > 0 ? (
                  <View style={styles.selectionSummary}>
                    <ThemedText type="smallBold">{selections.size} selected</ThemedText>
                    <View style={styles.chipRow}>
                      {Array.from(selections.entries()).map(([key, label]) => (
                        <Pressable
                          key={key}
                          style={[styles.chip, { backgroundColor: theme.backgroundElement }]}
                          onPress={() => toggleSelection(key, label)}
                        >
                          <ThemedText type="small">{label}</ThemedText>
                          <FontAwesome6 name="xmark" size={10} color={theme.textSecondary} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.footerRow}>
                <Pressable style={[styles.footerButton, { borderColor: theme.border, borderWidth: 1 }]} onPress={() => setStep(2)}>
                  <ThemedText type="small">Back</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.footerButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    if (selections.size === 0) {
                      setError('Select at least one assessment.');
                      return;
                    }
                    setError(null);
                    setStep(4);
                  }}
                >
                  <ThemedText type="small" style={{ color: '#fff' }}>
                    Next
                  </ThemedText>
                </Pressable>
              </View>
              {error ? (
                <ThemedText type="small" style={[styles.footerError, { color: theme.danger }]}>
                  {error}
                </ThemedText>
              ) : null}
            </>
          ) : null}

          {step === 4 ? (
            <ScrollView contentContainerStyle={styles.content}>
              <ThemedText type="subtitle">Confirm Selection</ThemedText>
              {Array.from(selections.entries()).map(([key, label]) => (
                <View key={key} style={[styles.confirmRow, { borderColor: theme.border }]}>
                  <FontAwesome6 name="clipboard-check" size={13} color={theme.primary} />
                  <ThemedText type="small">{label}</ThemedText>
                </View>
              ))}
              {error ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              ) : null}
              <Button title="Save Assessment" onPress={() => saveMutation.mutate()} loading={saveMutation.isPending} />
              <Pressable onPress={() => setStep(3)}>
                <ThemedText type="small" themeColor="primary" style={styles.skipLink}>
                  ← Back to selection
                </ThemedText>
              </Pressable>
            </ScrollView>
          ) : null}
        </ThemedView>
      </View>
    </Modal>
  );
}

function CatalogRow({
  item,
  matchScore,
  selected,
  onToggle,
}: {
  item: AssessmentCatalogEntry;
  matchScore?: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.catalogRow, { borderColor: selected ? theme.primary : theme.border }]} onPress={onToggle}>
      <FontAwesome6 name={selected ? 'square-check' : 'square'} size={16} color={selected ? theme.primary : theme.textSecondary} />
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold">{item.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {item.industry_label ?? ''}
          {matchScore != null ? ` · Match ${matchScore}` : ''}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', minHeight: '60%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  stepDots: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 12 },
  stepDot: { flex: 1, height: 4, borderRadius: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 30, gap: 12 },
  dropzone: { borderWidth: 1, borderStyle: 'dashed', borderRadius: Radius.lg, padding: 24, alignItems: 'center', gap: 8 },
  skipLink: { textAlign: 'center', marginTop: 4 },
  subTabRow: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, gap: 20, marginBottom: 8 },
  subTab: { paddingBottom: 8 },
  scrollArea: { flexGrow: 0 },
  searchInput: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  catalogRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
  selectionSummary: { gap: 8, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  footerRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  footerButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, paddingVertical: 12 },
  footerError: { paddingHorizontal: 20, paddingBottom: 10 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: Radius.md, padding: 10 },
});

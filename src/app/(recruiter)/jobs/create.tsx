import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobForm, type JobFormProps } from '@/components/job-form';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { getGeneratedJd, listGeneratedJds, type JdWriterRecord } from '@/lib/api/jd-writer';
import { createJob, parseJobDescription, type JobInput } from '@/lib/api/recruiter';
import {
  getDepartments,
  getEducationLevels,
  getEmploymentTypes,
  getIndustries,
  getJobTypes,
  getRoles,
} from '@/lib/api/reference';

// Resolves a JD-extracted free-text label (e.g. "Engineering") to the reference-data
// id JobForm's dropdowns expect, mirroring web's autofillReferenceSelect() — a plain
// case-insensitive match against the option's display name.
function matchReferenceId(options: { label: string; value: string }[] | undefined, rawText?: string): string | undefined {
  if (!rawText || !options) return undefined;
  const needle = rawText.trim().toLowerCase();
  return options.find((o) => o.label.trim().toLowerCase() === needle)?.value;
}

function countFilledFields(values: JobFormProps['initialValues']): number {
  return Object.values(values ?? {}).filter((v) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
    .length;
}

// Common shape both autofill sources (uploaded-document parse and a saved JD Writer
// record) get normalised into before going through the same reference-id resolution.
interface JdAutofillSource {
  job_title?: string;
  department?: string;
  role?: string;
  employment_type?: string;
  job_type?: string;
  industry?: string;
  education_qualification?: string;
  experience_min?: number;
  experience_max?: number;
  salary_min?: number;
  salary_max?: number;
  notice_period_days?: number;
  is_remote?: boolean;
  diversity_hiring?: boolean;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  contact_person_name?: string;
  contact_person_email?: string;
  skills?: string[];
}

// Reshapes a saved JD Writer record (structured generated_content + form_inputs) into
// JdAutofillSource, mirroring web's flattenGeneratedJd() in job-create.js, so it can go
// through the exact same mapJdToInitialValues() the document-upload flow already uses.
function flattenGeneratedJd(record: JdWriterRecord): JdAutofillSource {
  const inputs = (record.form_inputs ?? {}) as Record<string, unknown>;
  const content = record.generated_content;
  const asString = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const asNumber = (v: unknown) => (typeof v === 'number' ? v : undefined);

  const responsibilities = (content?.key_responsibilities ?? [])
    .filter((s) => (s.bullets ?? []).length > 0)
    .map((s) => `${s.category}:\n${s.bullets.map((b) => `- ${b}`).join('\n')}`)
    .join('\n\n');

  const requirements = (content?.qualifications ?? [])
    .filter((q) => q.text)
    .map((q) => (q.label ? `${q.label}: ${q.text}` : q.text))
    .join('\n');

  return {
    job_title: record.job_title || asString(inputs.job_title),
    // "seniority" in the JD Writer form is populated from the same reference-data
    // roles list as JobForm's `role` dropdown — same concept, friendlier label.
    role: asString(inputs.seniority),
    department: asString(inputs.department),
    employment_type: asString(inputs.employment_type),
    job_type: asString(inputs.work_location),
    industry: asString(inputs.industry),
    education_qualification: asString(inputs.qualification),
    experience_min: asNumber(inputs.experience_min),
    experience_max: asNumber(inputs.experience_max),
    description: content?.position_overview,
    responsibilities: responsibilities || undefined,
    requirements: requirements || undefined,
    skills: Array.isArray(inputs.must_have_skills) ? (inputs.must_have_skills as string[]) : undefined,
  };
}

export default function CreateJobScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { jdId } = useLocalSearchParams<{ jdId?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<JobFormProps['initialValues']>(undefined);
  const [jdModalVisible, setJdModalVisible] = useState(false);
  const appliedJdIdRef = useRef<string | null>(null);

  const departmentsQuery = useQuery({ queryKey: ['reference', 'departments'], queryFn: getDepartments });
  const rolesQuery = useQuery({ queryKey: ['reference', 'roles'], queryFn: getRoles });
  const employmentTypesQuery = useQuery({ queryKey: ['reference', 'employment-types'], queryFn: getEmploymentTypes });
  const industriesQuery = useQuery({ queryKey: ['reference', 'industries'], queryFn: getIndustries });
  const jobTypesQuery = useQuery({ queryKey: ['reference', 'job-types'], queryFn: getJobTypes });
  const educationLevelsQuery = useQuery({ queryKey: ['reference', 'education-levels'], queryFn: getEducationLevels });

  // Shared by both autofill sources (uploaded document + a picked JD Writer record):
  // resolves free-text labels to reference-data ids and passes the rest through.
  const mapJdToInitialValues = (jd: JdAutofillSource): JobFormProps['initialValues'] => ({
    job_title: jd.job_title,
    department: matchReferenceId(departmentsQuery.data, jd.department),
    role: matchReferenceId(rolesQuery.data, jd.role),
    employment_type: matchReferenceId(employmentTypesQuery.data, jd.employment_type),
    job_type: matchReferenceId(jobTypesQuery.data, jd.job_type),
    industry: matchReferenceId(industriesQuery.data, jd.industry),
    education_qualification: matchReferenceId(educationLevelsQuery.data, jd.education_qualification),
    experience_min: jd.experience_min,
    experience_max: jd.experience_max,
    salary_min: jd.salary_min,
    salary_max: jd.salary_max,
    notice_period_days: jd.notice_period_days,
    is_remote: jd.is_remote,
    diversity_hiring: jd.diversity_hiring,
    description: jd.description,
    responsibilities: jd.responsibilities,
    requirements: jd.requirements,
    contact_person_name: jd.contact_person_name,
    contact_person_email: jd.contact_person_email,
    skills: jd.skills,
  });

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'stats'] });
      await queryClient.invalidateQueries({ queryKey: ['recruiter', 'dashboard-jobs'] });
      router.replace('/(recruiter)/jobs');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not create this job posting. Please try again.');
    },
  });

  const parseMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => parseJobDescription(file),
    onMutate: () => setParseStatus('Analysing JD — extracting job details and auto-filling the form below...'),
    onSuccess: (res) => {
      const jd = res.data;
      if (!jd.available) {
        setParseStatus('Could not extract structured data from this document — please fill the form manually.');
        return;
      }
      // Location isn't autofilled: jd.location_city/state/country are free-text
      // names, and JobForm's LocationPicker needs resolved location-table ids —
      // resolving those needs a cascading /locations search, deferred for now.
      const values = mapJdToInitialValues(jd);
      setInitialValues(values);
      const filledCount = countFilledFields(values);
      setParseStatus(
        filledCount > 0
          ? `${filledCount} field(s) filled from the JD. Please review before publishing.`
          : 'Extracted the document, but found nothing new to fill in — please complete the form manually.',
      );
    },
    onError: () => setParseStatus('JD parsing failed — please fill the form manually.'),
  });

  // "Use Available JDs" modal — lets a job be created from a JD already generated via
  // the JD Writer screen (generated_jds table), instead of only from an uploaded file.
  const jdListQuery = useQuery({
    queryKey: ['recruiter', 'jd-writer', 'list', 'for-job-create'],
    queryFn: listGeneratedJds,
    enabled: jdModalVisible,
  });
  const selectableJds = (jdListQuery.data?.data ?? []).filter((jd) => jd.status === 'completed');

  // Both the modal's "Use This" action and the `?jdId=` query param (set by the "Post
  // this Job" action on the JD Writer screen) funnel through this same mutation.
  const applyGeneratedJdMutation = useMutation({
    mutationFn: (id: string) => getGeneratedJd(id),
    onMutate: () => setParseStatus('Loading your generated job description...'),
    onSuccess: (res) => {
      const record = res.data;
      if (!record.generated_content) {
        setParseStatus("That job description isn't ready yet — please fill the form manually.");
        return;
      }
      const values = mapJdToInitialValues(flattenGeneratedJd(record));
      setInitialValues(values);
      setJdModalVisible(false);
      const filledCount = countFilledFields(values);
      setParseStatus(
        filledCount > 0
          ? `${filledCount} field(s) filled from "${record.job_title}". Please review before publishing.`
          : 'Loaded, but found nothing new to fill in — please complete the form manually.',
      );
    },
    onError: () => setParseStatus('Could not load that job description — please fill the form manually.'),
  });

  // Auto-apply a JD passed in via ?jdId= (navigated here from the JD Writer screen).
  useEffect(() => {
    if (jdId && appliedJdIdRef.current !== jdId) {
      appliedJdIdRef.current = jdId;
      applyGeneratedJdMutation.mutate(jdId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jdId]);

  const pickJdFile = async () => {
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
    parseMutation.mutate({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <View style={styles.jdUploadRow}>
        <View style={styles.jdButtonsRow}>
          <Pressable
            style={[styles.jdButton, { borderColor: theme.border }]}
            onPress={pickJdFile}
            disabled={parseMutation.isPending}
          >
            {parseMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <FontAwesome6 name="file-arrow-up" size={13} color={theme.primary} />
            )}
            <ThemedText type="small" themeColor="primary">
              Upload a JD Document
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.jdButton, { borderColor: theme.border }]}
            onPress={() => setJdModalVisible(true)}
            disabled={applyGeneratedJdMutation.isPending}
          >
            {applyGeneratedJdMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <FontAwesome6 name="file-signature" size={13} color={theme.primary} />
            )}
            <ThemedText type="small" themeColor="primary">
              Use Available JDs
            </ThemedText>
          </Pressable>
        </View>
        {parseStatus ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.jdStatus}>
            {parseStatus}
          </ThemedText>
        ) : null}
      </View>

      <JobForm
        initialValues={initialValues}
        submitLabel="Post Job"
        submitting={createMutation.isPending}
        error={error}
        onSubmit={(values: JobInput) => {
          setError(null);
          createMutation.mutate(values);
        }}
      />

      <Modal
        visible={jdModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJdModalVisible(false)}
      >
        <View style={styles.modalScrim}>
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Use an Available JD</ThemedText>
              <Pressable onPress={() => setJdModalVisible(false)} hitSlop={10}>
                <FontAwesome6 name="xmark" size={18} color={theme.text} />
              </Pressable>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.modalSubtitle}>
              Pick a job description you already generated in the JD Section to auto-fill the form below.
            </ThemedText>
            {jdListQuery.isLoading ? (
              <ActivityIndicator color={theme.primary} style={styles.modalLoading} />
            ) : selectableJds.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.modalEmpty}>
                No completed job descriptions yet — create one from the JD Section first.
              </ThemedText>
            ) : (
              <FlatList
                data={selectableJds}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                ItemSeparatorComponent={() => <View style={[styles.modalSeparator, { backgroundColor: theme.border }]} />}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.modalListItem}
                    onPress={() => applyGeneratedJdMutation.mutate(item.id)}
                    disabled={applyGeneratedJdMutation.isPending}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold">{item.job_title || 'Untitled'}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                      </ThemedText>
                    </View>
                    {applyGeneratedJdMutation.isPending && applyGeneratedJdMutation.variables === item.id ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <ThemedText type="small" themeColor="primary">
                        Use This
                      </ThemedText>
                    )}
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  jdUploadRow: { paddingHorizontal: 20, paddingTop: 16, gap: 6 },
  jdButtonsRow: { flexDirection: 'row', gap: 10 },
  jdButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  jdStatus: { textAlign: 'center' },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: Radius.lg,
    padding: 20,
    gap: 12,
    maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalSubtitle: { marginBottom: 4 },
  modalLoading: { paddingVertical: 24 },
  modalEmpty: { textAlign: 'center', paddingVertical: 24 },
  modalList: { flexGrow: 0 },
  modalListItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  modalSeparator: { height: StyleSheet.hairlineWidth },
});

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

import { Button } from '@/components/button';
import { LocationPicker, type LocationValue } from '@/components/location-picker';
import { SelectField } from '@/components/select-field';
import { SkillTagInput } from '@/components/skill-tag-input';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import {
  getDepartments,
  getEducationLevels,
  getEmploymentTypes,
  getIndustries,
  getJobTypes,
  getRoles,
  NOTICE_PERIOD_OPTIONS,
} from '@/lib/api/reference';
import type { JobInput } from '@/lib/api/recruiter';

export interface JobFormProps {
  initialValues?: Partial<Omit<JobInput, 'location'>> & { location?: LocationValue };
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: JobInput) => void;
  onDelete?: () => void;
  error?: string | null;
}

export function JobForm({ initialValues, submitLabel, submitting, onSubmit, onDelete, error }: JobFormProps) {
  const theme = useTheme();

  const departmentsQuery = useQuery({ queryKey: ['reference', 'departments'], queryFn: getDepartments });
  const rolesQuery = useQuery({ queryKey: ['reference', 'roles'], queryFn: getRoles });
  const employmentTypesQuery = useQuery({ queryKey: ['reference', 'employment-types'], queryFn: getEmploymentTypes });
  const industriesQuery = useQuery({ queryKey: ['reference', 'industries'], queryFn: getIndustries });
  const jobTypesQuery = useQuery({ queryKey: ['reference', 'job-types'], queryFn: getJobTypes });
  const educationLevelsQuery = useQuery({ queryKey: ['reference', 'education-levels'], queryFn: getEducationLevels });

  const [jobTitle, setJobTitle] = useState(initialValues?.job_title ?? '');
  const [department, setDepartment] = useState(initialValues?.department ?? '');
  const [role, setRole] = useState(initialValues?.role ?? '');
  const [employmentType, setEmploymentType] = useState(initialValues?.employment_type ?? '');
  const [jobType, setJobType] = useState(initialValues?.job_type ?? '');
  const [openings, setOpenings] = useState(initialValues?.no_of_openings ? String(initialValues.no_of_openings) : '1');

  const [location, setLocation] = useState<LocationValue>(initialValues?.location ?? {});
  const [isRemote, setIsRemote] = useState(initialValues?.is_remote ?? false);

  const [experienceMin, setExperienceMin] = useState(
    initialValues?.experience_min != null ? String(initialValues.experience_min) : '',
  );
  const [experienceMax, setExperienceMax] = useState(
    initialValues?.experience_max != null ? String(initialValues.experience_max) : '',
  );
  const [salaryMin, setSalaryMin] = useState(initialValues?.salary_min != null ? String(initialValues.salary_min) : '');
  const [salaryMax, setSalaryMax] = useState(initialValues?.salary_max != null ? String(initialValues.salary_max) : '');
  const [noticePeriod, setNoticePeriod] = useState(
    initialValues?.notice_period_days != null ? String(initialValues.notice_period_days) : '',
  );
  const [industry, setIndustry] = useState(initialValues?.industry ?? '');

  const [educationQualification, setEducationQualification] = useState(initialValues?.education_qualification ?? '');
  const [skills, setSkills] = useState<string[]>(initialValues?.skills ?? []);
  const [diversityHiring, setDiversityHiring] = useState(initialValues?.diversity_hiring ?? false);

  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [responsibilities, setResponsibilities] = useState(initialValues?.responsibilities ?? '');
  const [requirements, setRequirements] = useState(initialValues?.requirements ?? '');

  const [contactName, setContactName] = useState(initialValues?.contact_person_name ?? '');
  const [contactEmail, setContactEmail] = useState(initialValues?.contact_person_email ?? '');

  useEffect(() => {
    if (!initialValues) return;
    setJobTitle(initialValues.job_title ?? '');
    setDepartment(initialValues.department ?? '');
    setRole(initialValues.role ?? '');
    setEmploymentType(initialValues.employment_type ?? '');
    setJobType(initialValues.job_type ?? '');
    setOpenings(initialValues.no_of_openings ? String(initialValues.no_of_openings) : '1');
    setLocation(initialValues.location ?? {});
    setIsRemote(initialValues.is_remote ?? false);
    setExperienceMin(initialValues.experience_min != null ? String(initialValues.experience_min) : '');
    setExperienceMax(initialValues.experience_max != null ? String(initialValues.experience_max) : '');
    setSalaryMin(initialValues.salary_min != null ? String(initialValues.salary_min) : '');
    setSalaryMax(initialValues.salary_max != null ? String(initialValues.salary_max) : '');
    setNoticePeriod(initialValues.notice_period_days != null ? String(initialValues.notice_period_days) : '');
    setIndustry(initialValues.industry ?? '');
    setEducationQualification(initialValues.education_qualification ?? '');
    setSkills(initialValues.skills ?? []);
    setDiversityHiring(initialValues.diversity_hiring ?? false);
    setDescription(initialValues.description ?? '');
    setResponsibilities(initialValues.responsibilities ?? '');
    setRequirements(initialValues.requirements ?? '');
    setContactName(initialValues.contact_person_name ?? '');
    setContactEmail(initialValues.contact_person_email ?? '');
  }, [initialValues]);

  const handleSubmit = () => {
    const values: JobInput = {
      job_title: jobTitle.trim(),
      department: department || undefined,
      role: role || undefined,
      employment_type: employmentType || undefined,
      job_type: jobType,
      no_of_openings: openings ? Number(openings) : undefined,
      location: [location.cityName, location.stateName, location.countryName].filter(Boolean).join(', ') || undefined,
      location_country: location.countryId,
      location_state: location.stateId,
      location_city: location.cityId,
      is_remote: isRemote,
      experience_min: experienceMin ? Number(experienceMin) : undefined,
      experience_max: experienceMax ? Number(experienceMax) : undefined,
      salary_min: salaryMin ? Number(salaryMin) : undefined,
      salary_max: salaryMax ? Number(salaryMax) : undefined,
      notice_period_days: noticePeriod ? Number(noticePeriod) : undefined,
      industry: industry || undefined,
      education_qualification: educationQualification || undefined,
      skills,
      diversity_hiring: diversityHiring,
      description: description.trim(),
      responsibilities: responsibilities.trim() || undefined,
      requirements: requirements.trim() || undefined,
      contact_person_name: contactName.trim() || undefined,
      contact_person_email: contactEmail.trim() || undefined,
    };
    onSubmit(values);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Basic Info
        </ThemedText>
        <TextField label="Job Title" value={jobTitle} onChangeText={setJobTitle} placeholder="e.g. Senior React Native Engineer" />
        <SelectField
          label="Department"
          searchable
          value={department}
          options={departmentsQuery.data ?? []}
          onChange={setDepartment}
          placeholder="Select department"
        />
        <SelectField
          label="Role"
          searchable
          value={role}
          options={rolesQuery.data ?? []}
          onChange={setRole}
          placeholder="Select role"
        />
        <SelectField
          label="Employment Type"
          value={employmentType}
          options={employmentTypesQuery.data ?? []}
          onChange={setEmploymentType}
          placeholder="Select employment type"
        />
        <SelectField
          label="Job Type"
          value={jobType}
          options={jobTypesQuery.data ?? []}
          onChange={setJobType}
          placeholder="Onsite / Remote / Hybrid"
        />
        <TextField
          label="Number of Openings"
          keyboardType="numeric"
          value={openings}
          onChangeText={setOpenings}
        />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Location
        </ThemedText>
        <Pressable style={styles.checkboxRow} onPress={() => setIsRemote((v) => !v)}>
          <FontAwesome6 name={isRemote ? 'square-check' : 'square'} size={18} color={isRemote ? theme.primary : theme.textSecondary} />
          <ThemedText>This is a remote position</ThemedText>
        </Pressable>
        {!isRemote ? <LocationPicker value={location} onChange={setLocation} /> : null}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Experience & Salary
        </ThemedText>
        <View style={styles.row}>
          <View style={styles.half}>
            <TextField label="Min Experience (yrs)" keyboardType="numeric" value={experienceMin} onChangeText={setExperienceMin} />
          </View>
          <View style={styles.half}>
            <TextField label="Max Experience (yrs)" keyboardType="numeric" value={experienceMax} onChangeText={setExperienceMax} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <TextField label="Min Salary (₹ p.a.)" keyboardType="numeric" value={salaryMin} onChangeText={setSalaryMin} />
          </View>
          <View style={styles.half}>
            <TextField label="Max Salary (₹ p.a.)" keyboardType="numeric" value={salaryMax} onChangeText={setSalaryMax} />
          </View>
        </View>
        <SelectField
          label="Notice Period"
          value={noticePeriod}
          options={NOTICE_PERIOD_OPTIONS}
          onChange={setNoticePeriod}
          placeholder="Select notice period"
        />
        <SelectField
          label="Industry"
          searchable
          value={industry}
          options={industriesQuery.data ?? []}
          onChange={setIndustry}
          placeholder="Select industry"
        />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Education & Skills
        </ThemedText>
        <SelectField
          label="Education Qualification"
          value={educationQualification}
          options={educationLevelsQuery.data ?? []}
          onChange={setEducationQualification}
          placeholder="Select qualification"
        />
        <SkillTagInput value={skills} onChange={setSkills} />
        <Pressable style={styles.checkboxRow} onPress={() => setDiversityHiring((v) => !v)}>
          <FontAwesome6
            name={diversityHiring ? 'square-check' : 'square'}
            size={18}
            color={diversityHiring ? theme.primary : theme.textSecondary}
          />
          <ThemedText>Open to diversity hiring</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Job Details
        </ThemedText>
        <TextField
          label="Description"
          multiline
          numberOfLines={5}
          style={styles.multiline}
          value={description}
          onChangeText={setDescription}
        />
        <TextField
          label="Responsibilities"
          multiline
          numberOfLines={4}
          style={styles.multiline}
          value={responsibilities}
          onChangeText={setResponsibilities}
        />
        <TextField
          label="Requirements"
          multiline
          numberOfLines={4}
          style={styles.multiline}
          value={requirements}
          onChangeText={setRequirements}
        />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Contact Person
        </ThemedText>
        <TextField label="Name" value={contactName} onChangeText={setContactName} />
        <TextField label="Email" autoCapitalize="none" keyboardType="email-address" value={contactEmail} onChangeText={setContactEmail} />
      </ThemedView>

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}

      <Button title={submitLabel} loading={submitting} onPress={handleSubmit} />
      {onDelete ? <Button title="Delete Job" variant="secondary" onPress={onDelete} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 24, paddingBottom: 60 },
  section: { gap: 14 },
  sectionTitle: { marginBottom: -4 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

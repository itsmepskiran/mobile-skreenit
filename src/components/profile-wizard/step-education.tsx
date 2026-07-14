import { FontAwesome6 } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { CollegeAutocomplete } from '@/components/college-autocomplete';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StepProps } from '@/components/profile-wizard/types';
import type { CertificationEntry, EducationEntry } from '@/lib/api/applicant';

export function StepEducation({ values, setValue }: StepProps) {
  const theme = useTheme();

  const updateEducation = (index: number, patch: Partial<EducationEntry>) => {
    const next = values.education.slice();
    next[index] = { ...next[index], ...patch };
    setValue('education', next);
  };
  const addEducation = () => setValue('education', [...values.education, { degree: '', institution: '', completion_year: '' }]);
  const removeEducation = (index: number) => setValue('education', values.education.filter((_, i) => i !== index));

  const updateCertification = (index: number, patch: Partial<CertificationEntry>) => {
    const next = values.certifications.slice();
    next[index] = { ...next[index], ...patch };
    setValue('certifications', next);
  };
  const addCertification = () => setValue('certifications', [...values.certifications, { name: '', issuer: '', year: '' }]);
  const removeCertification = (index: number) => setValue('certifications', values.certifications.filter((_, i) => i !== index));

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Education Details</ThemedText>

      <SectionHeading icon="school" label="Schooling (10th / SSC)" />
      <View style={styles.row3}>
        <View style={styles.grow}>
          <TextField label="School name" value={values.schooling} onChangeText={(v) => setValue('schooling', v)} />
        </View>
        <View style={styles.narrow}>
          <TextField
            label="Year"
            keyboardType="numeric"
            placeholder="YYYY"
            value={values.schooling_year}
            onChangeText={(v) => setValue('schooling_year', v)}
          />
        </View>
        <View style={styles.narrow}>
          <TextField
            label="% / CGPA"
            placeholder="85% or 9.0"
            value={values.schooling_percentage}
            onChangeText={(v) => setValue('schooling_percentage', v)}
          />
        </View>
      </View>

      <SectionHeading icon="graduation-cap" label="Pre-University (12th / PUC)" />
      <CollegeAutocomplete label="College name" value={values.pre_university} onChange={(v) => setValue('pre_university', v)} />
      <View style={styles.row3}>
        <View style={styles.grow} />
        <View style={styles.narrow}>
          <TextField
            label="Year"
            keyboardType="numeric"
            placeholder="YYYY"
            value={values.pre_university_year}
            onChangeText={(v) => setValue('pre_university_year', v)}
          />
        </View>
        <View style={styles.narrow}>
          <TextField
            label="% / CGPA"
            placeholder="85% or 9.0"
            value={values.pre_university_percentage}
            onChangeText={(v) => setValue('pre_university_percentage', v)}
          />
        </View>
      </View>

      <SectionHeading icon="university" label="Graduation (Bachelor's)" />
      <CollegeAutocomplete label="College / University" value={values.graduation} onChange={(v) => setValue('graduation', v)} />
      <View style={styles.row3}>
        <View style={styles.grow} />
        <View style={styles.narrow}>
          <TextField
            label="Year"
            keyboardType="numeric"
            placeholder="YYYY"
            value={values.graduation_year}
            onChangeText={(v) => setValue('graduation_year', v)}
          />
        </View>
        <View style={styles.narrow}>
          <TextField
            label="% / CGPA"
            placeholder="85% or 9.0"
            value={values.graduation_percentage}
            onChangeText={(v) => setValue('graduation_percentage', v)}
          />
        </View>
      </View>

      <SectionHeading icon="user-graduate" label="Post-Graduation (Master's)" />
      <CollegeAutocomplete label="College / University" value={values.post_graduation} onChange={(v) => setValue('post_graduation', v)} />
      <View style={styles.row3}>
        <View style={styles.grow} />
        <View style={styles.narrow}>
          <TextField
            label="Year"
            keyboardType="numeric"
            placeholder="YYYY"
            value={values.post_graduation_year}
            onChangeText={(v) => setValue('post_graduation_year', v)}
          />
        </View>
        <View style={styles.narrow}>
          <TextField
            label="% / CGPA"
            placeholder="85% or 9.0"
            value={values.post_graduation_percentage}
            onChangeText={(v) => setValue('post_graduation_percentage', v)}
          />
        </View>
      </View>

      <ThemedView style={styles.listHeader}>
        <ThemedText type="smallBold">Additional Degrees / Certifications</ThemedText>
        <Pressable style={styles.addButton} onPress={addEducation}>
          <FontAwesome6 name="plus" size={11} color={theme.primary} />
          <ThemedText type="small" themeColor="primary">
            Add
          </ThemedText>
        </Pressable>
      </ThemedView>
      {values.education.map((item, index) => (
        <ThemedView key={index} style={[styles.card, { borderColor: theme.border }]}>
          <ThemedView style={styles.cardHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              Degree {index + 1}
            </ThemedText>
            <Pressable onPress={() => removeEducation(index)} hitSlop={8}>
              <FontAwesome6 name="trash" size={14} color={theme.danger} />
            </Pressable>
          </ThemedView>
          <TextField label="Degree" value={item.degree} onChangeText={(v) => updateEducation(index, { degree: v })} />
          <TextField label="Institution" value={item.institution} onChangeText={(v) => updateEducation(index, { institution: v })} />
          <TextField
            label="Year of completion"
            keyboardType="numeric"
            value={item.completion_year}
            onChangeText={(v) => updateEducation(index, { completion_year: v })}
          />
        </ThemedView>
      ))}

      <ThemedView style={styles.listHeader}>
        <FontAwesome6 name="certificate" size={13} color={theme.primary} />
        <ThemedText type="smallBold" style={styles.listHeaderGrow}>
          Certifications
        </ThemedText>
        <Pressable style={styles.addButton} onPress={addCertification}>
          <FontAwesome6 name="plus" size={11} color={theme.primary} />
          <ThemedText type="small" themeColor="primary">
            Add
          </ThemedText>
        </Pressable>
      </ThemedView>
      {values.certifications.map((item, index) => (
        <ThemedView key={index} style={[styles.card, { borderColor: theme.border }]}>
          <ThemedView style={styles.cardHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              Certification {index + 1}
            </ThemedText>
            <Pressable onPress={() => removeCertification(index)} hitSlop={8}>
              <FontAwesome6 name="trash" size={14} color={theme.danger} />
            </Pressable>
          </ThemedView>
          <TextField label="Name" value={item.name} onChangeText={(v) => updateCertification(index, { name: v })} />
          <TextField label="Issuing organization" value={item.issuer} onChangeText={(v) => updateCertification(index, { issuer: v })} />
          <TextField label="Year" keyboardType="numeric" value={item.year} onChangeText={(v) => updateCertification(index, { year: v })} />
        </ThemedView>
      ))}
    </ThemedView>
  );
}

function SectionHeading({ icon, label }: { icon: React.ComponentProps<typeof FontAwesome6>['name']; label: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.sectionHeading}>
      <FontAwesome6 name={icon} size={13} color={theme.primary} />
      <ThemedText type="smallBold">{label}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  row3: { flexDirection: 'row', gap: 12 },
  grow: { flex: 2 },
  narrow: { flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, justifyContent: 'space-between' },
  listHeaderGrow: { flex: 1 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { borderWidth: 1, borderRadius: Radius.md, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

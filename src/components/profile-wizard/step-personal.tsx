import { FontAwesome6 } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, type StepProps } from '@/components/profile-wizard/types';

export interface StepPersonalProps extends StepProps {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  resumeUrl: string | null;
  avatarUploading: boolean;
  resumeUploading: boolean;
  onPickAvatar: () => void;
  onPickResume: () => void;
}

export function StepPersonal({
  values,
  setValue,
  fullName,
  email,
  avatarUrl,
  resumeUrl,
  avatarUploading,
  resumeUploading,
  onPickAvatar,
  onPickResume,
}: StepPersonalProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Personal Information</ThemedText>

      <ThemedView style={styles.avatarSection}>
        <Pressable onPress={onPickAvatar} style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <ThemedView style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.backgroundElement }]}>
              <FontAwesome6 name="user" size={32} color={theme.textSecondary} />
            </ThemedView>
          )}
          <ThemedView style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
            {avatarUploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <FontAwesome6 name="camera" size={12} color="#ffffff" />
            )}
          </ThemedView>
        </Pressable>
        <ThemedText type="link" themeColor="primary" onPress={onPickResume}>
          {resumeUploading ? 'Uploading resume...' : resumeUrl ? 'Replace resume' : 'Upload resume*'}
        </ThemedText>
      </ThemedView>

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Full name" value={fullName} editable={false} />
        </View>
        <View style={styles.half}>
          <TextField label="Email" value={email} editable={false} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField
            label="Mobile number"
            keyboardType="phone-pad"
            placeholder="+91 XXXXX XXXXX"
            value={values.phone}
            onChangeText={(v) => setValue('phone', v)}
          />
        </View>
        <View style={styles.half}>
          <TextField
            label="Date of birth"
            placeholder="YYYY-MM-DD"
            value={values.date_of_birth}
            onChangeText={(v) => setValue('date_of_birth', v)}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <SelectField
            label="Gender"
            options={GENDER_OPTIONS}
            value={values.gender}
            onChange={(v) => setValue('gender', v)}
            placeholder="Select gender"
          />
        </View>
        <View style={styles.half}>
          <SelectField
            label="Marital status"
            options={MARITAL_STATUS_OPTIONS}
            value={values.marital_status}
            onChange={(v) => setValue('marital_status', v)}
            placeholder="Select status"
          />
        </View>
      </View>

      <ThemedView style={styles.sectionHeading}>
        <FontAwesome6 name="location-dot" size={13} color={theme.primary} />
        <ThemedText type="smallBold">Current Address</ThemedText>
      </ThemedView>
      <TextField
        label="Address line"
        placeholder="Street, area, landmark"
        multiline
        numberOfLines={2}
        value={values.current_address}
        onChangeText={(v) => setValue('current_address', v)}
      />
      <View style={styles.row}>
        <View style={styles.third}>
          <TextField label="Country" value={values.current_country} onChangeText={(v) => setValue('current_country', v)} />
        </View>
        <View style={styles.third}>
          <TextField label="State" value={values.current_state} onChangeText={(v) => setValue('current_state', v)} />
        </View>
        <View style={styles.third}>
          <TextField label="City" value={values.current_city} onChangeText={(v) => setValue('current_city', v)} />
        </View>
      </View>

      <ThemedView style={styles.sectionHeading}>
        <FontAwesome6 name="house" size={13} color={theme.primary} />
        <ThemedText type="smallBold">Permanent Address</ThemedText>
      </ThemedView>
      <Pressable
        style={styles.checkboxRow}
        onPress={() => {
          const next = !values.sameAsCurrent;
          setValue('sameAsCurrent', next);
          if (next) {
            setValue('permanent_address', values.current_address);
            setValue('permanent_country', values.current_country);
            setValue('permanent_state', values.current_state);
            setValue('permanent_city', values.current_city);
          }
        }}
      >
        <FontAwesome6
          name={values.sameAsCurrent ? 'square-check' : 'square'}
          size={18}
          color={values.sameAsCurrent ? theme.primary : theme.textSecondary}
        />
        <ThemedText>Same as current address</ThemedText>
      </Pressable>

      {!values.sameAsCurrent ? (
        <>
          <TextField
            label="Address line"
            placeholder="Street, area, landmark"
            multiline
            numberOfLines={2}
            value={values.permanent_address}
            onChangeText={(v) => setValue('permanent_address', v)}
          />
          <View style={styles.row}>
            <View style={styles.third}>
              <TextField label="Country" value={values.permanent_country} onChangeText={(v) => setValue('permanent_country', v)} />
            </View>
            <View style={styles.third}>
              <TextField label="State" value={values.permanent_state} onChangeText={(v) => setValue('permanent_state', v)} />
            </View>
            <View style={styles.third}>
              <TextField label="City" value={values.permanent_city} onChangeText={(v) => setValue('permanent_city', v)} />
            </View>
          </View>
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  avatarSection: { alignItems: 'center', gap: 8, marginBottom: 4 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  third: { flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

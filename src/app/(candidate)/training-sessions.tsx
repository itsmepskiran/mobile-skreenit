import { FontAwesome6 } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listTrainingMaterials, type TrainingMaterial } from '@/lib/api/training';

export default function TrainingSessionsScreen() {
  const theme = useTheme();
  const [selected, setSelected] = useState<TrainingMaterial | null>(null);
  const materialsQuery = useQuery({
    queryKey: ['training-materials'],
    queryFn: listTrainingMaterials,
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Training Sessions</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Watch past training sessions any time.
        </ThemedText>

        {selected ? (
          <View style={styles.playerSection}>
            <Pressable onPress={() => setSelected(null)} style={styles.backButton}>
              <FontAwesome6 name="arrow-left" size={14} color={theme.primary} />
              <ThemedText type="smallBold" themeColor="primary">All Session Recordings</ThemedText>
            </Pressable>
            <RecordingPlayer material={selected} />
            <ThemedText type="subtitle" style={styles.playerTitle}>{selected.title}</ThemedText>
            {selected.description ? <ThemedText themeColor="textSecondary">{selected.description}</ThemedText> : null}
          </View>
        ) : materialsQuery.isLoading ? (
          <ActivityIndicator style={styles.loader} color={theme.primary} />
        ) : materialsQuery.isError ? (
          <ThemedText themeColor="textSecondary" style={styles.message}>
            Couldn&apos;t load session recordings. Please try again.
          </ThemedText>
        ) : (
          <View style={styles.grid}>
            {(materialsQuery.data?.data ?? []).map((material) => (
              <Pressable
                key={material.slug}
                onPress={() => setSelected(material)}
                style={({ pressed }) => [styles.card, { borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
              >
                {material.thumbnail_url ? (
                  <Image source={{ uri: material.thumbnail_url }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: theme.backgroundElement }]}>
                    <FontAwesome6 name="play" size={28} color={theme.primary} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <ThemedText type="smallBold" numberOfLines={2}>{material.title}</ThemedText>
                  {material.description ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{material.description}</ThemedText>
                  ) : null}
                </View>
              </Pressable>
            ))}
            {!materialsQuery.data?.data?.length ? (
              <ThemedText themeColor="textSecondary" style={styles.message}>No session recordings are available yet.</ThemedText>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RecordingPlayer({ material }: { material: TrainingMaterial }) {
  const player = useVideoPlayer(material.video_url ?? null, (instance) => {
    instance.loop = true;
  });

  return <VideoView player={player} style={styles.video} nativeControls />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20, gap: 8 },
  subtitle: { marginBottom: 16 },
  loader: { marginTop: 48 },
  message: { paddingVertical: 36, textAlign: 'center' },
  grid: { gap: 16 },
  card: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: '#fff' },
  thumbnail: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#0f172a' },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 14, gap: 4 },
  playerSection: { gap: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#0f172a', borderRadius: Radius.md },
  playerTitle: { marginTop: 4 },
});

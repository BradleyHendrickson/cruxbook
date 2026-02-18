import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  Modal,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import MapLocationPicker from '@/components/MapLocationPicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { gradeToLabel } from '@/constants/Grades';
import { styleToLabel } from '@/constants/Styles';

type Boulder = {
  id: string;
  name: string;
  description: string | null;
  avg_grade: number | null;
  vote_count: number;
  sector_id: string | null;
  area_id: string;
  lat: number | null;
  lng: number | null;
  height: string | null;
  style: string | null;
  first_ascent_name: string | null;
  first_ascent_date: string | null;
};

type Photo = { id: string; url: string };
type Comment = { id: string; body: string; created_at: string; user_id: string; username: string | null };

export default function BoulderDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    sectorName?: string;
    areaName?: string;
  }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const sectorName =
    typeof params.sectorName === 'string'
      ? params.sectorName
      : params.sectorName?.[0];
  const areaName =
    typeof params.areaName === 'string'
      ? params.areaName
      : params.areaName?.[0];
  const [boulder, setBoulder] = useState<Boulder | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  const canViewMap = !!boulder?.area_id;
  const showMenu = canViewMap || user;

  useEffect(() => {
    if (boulder?.name) {
      navigation.setOptions({
        title: boulder.name,
        headerRight:
          showMenu && boulder
            ? () => (
                <View style={styles.headerRight}>
                  <Pressable
                    onPress={() => setMenuVisible(true)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                    hitSlop={8}
                  >
                    <Text style={styles.headerActions}>Actions</Text>
                  </Pressable>
                </View>
              )
            : undefined,
      });
    }
  }, [boulder?.name, navigation, showMenu, boulder]);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [logClimbVisible, setLogClimbVisible] = useState(false);
  const [logOutcome, setLogOutcome] = useState<'flash' | 'send' | 'attempt'>('send');
  const [logRating, setLogRating] = useState<number | null>(null);
  const [logNotes, setLogNotes] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const CLIMB_OUTCOMES = [
    { value: 'flash' as const, label: 'Flash' },
    { value: 'send' as const, label: 'Send' },
    { value: 'attempt' as const, label: 'Attempt' },
  ];

  const handlePhotoViewerScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    if (index >= 0 && index < photos.length) {
      setPhotoViewerIndex(index);
    }
  };

  const fetchBoulder = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('boulders')
      .select('id, name, description, avg_grade, vote_count, sector_id, area_id, lat, lng, height, style, first_ascent_name, first_ascent_date')
      .eq('id', id)
      .single();
    setBoulder(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchBoulder();
  }, [fetchBoulder]);

  useEffect(() => {
    if (!id) return;
    const fetchPhotos = async () => {
      const { data } = await supabase
        .from('photos')
        .select('id, url')
        .eq('boulder_id', id)
        .order('created_at', { ascending: true });
      setPhotos(data ?? []);
    };
    fetchPhotos();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchRatings = async () => {
      const { data } = await supabase
        .from('route_ratings')
        .select('rating, user_id')
        .eq('boulder_id', id);
      const rows = data ?? [];
      if (rows.length > 0) {
        const sum = rows.reduce((a, r) => a + r.rating, 0);
        setAvgRating(Math.round((sum / rows.length) * 10) / 10);
        setRatingCount(rows.length);
        const mine = user ? rows.find((r) => r.user_id === user.id) : null;
        setUserRating(mine?.rating ?? null);
      } else {
        setAvgRating(null);
        setRatingCount(0);
        setUserRating(null);
      }
    };
    fetchRatings();
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) return;
    const fetchComments = async () => {
      try {
        const { data } = await supabase.rpc('get_boulder_comments', {
          p_boulder_id: id,
        });
        setComments((data ?? []) as Comment[]);
      } catch {
        setComments([]);
      }
    };
    fetchComments();
  }, [id]);

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Invalid boulder</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
      </View>
    );
  }

  if (!boulder) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Boulder not found</Text>
      </View>
    );
  }

  const BoulderMenu = () => (
    <Modal
      visible={menuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setMenuVisible(false)}
    >
      <Pressable
        style={styles.menuOverlay}
        onPress={() => setMenuVisible(false)}
      >
        <View style={styles.menuContainer}>
          {canViewMap && (
            <Pressable
              style={[styles.menuItem, !user && styles.menuItemLast]}
              onPress={() => {
                setMenuVisible(false);
                if (boulder.sector_id && boulder.area_id) {
                  router.push({
                    pathname: `/sector/${boulder.sector_id}`,
                    params: {
                      areaId: boulder.area_id,
                      sectorName: sectorName ?? '',
                      areaName: areaName ?? '',
                      openMap: '1',
                    },
                  });
                } else if (boulder.area_id) {
                  router.push({
                    pathname: `/area/${boulder.area_id}`,
                    params: { openMap: '1' },
                  });
                }
              }}
            >
              <FontAwesome name="map" size={16} color={Colors.dark.tint} />
              <Text style={styles.menuItemText}>View Area Map</Text>
            </Pressable>
          )}
          {user && (
            <>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push({
                    pathname: '/edit-boulder',
                    params: {
                      boulderId: id,
                      sectorId: boulder.sector_id ?? '',
                      areaId: boulder.area_id,
                      sectorName: sectorName ?? '',
                      areaName: areaName ?? '',
                    },
                  });
                }}
              >
                <FontAwesome name="pencil" size={16} color={Colors.dark.tint} />
                <Text style={styles.menuItemText}>Edit boulder</Text>
              </Pressable>
              <Pressable
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => {
                  setMenuVisible(false);
                  setLocationPickerVisible(true);
                }}
              >
                <FontAwesome name="map-marker" size={16} color={Colors.dark.tint} />
                <Text style={styles.menuItemText}>Edit location</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <>
      <BoulderMenu />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <Text style={styles.grade}>{gradeToLabel(boulder.avg_grade)}</Text>
        {boulder.vote_count > 0 && (
          <Text style={styles.voteCount}>
            {boulder.vote_count} vote{boulder.vote_count !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {(areaName || sectorName) && (
        <Text style={styles.breadcrumb}>
          {[areaName, sectorName].filter(Boolean).join(' › ')}
        </Text>
      )}

      {(boulder.height || boulder.style) && (
        <View style={styles.metaRow}>
          {boulder.height && (
            <Text style={styles.metaItem}>Height: {boulder.height}</Text>
          )}
          {boulder.style && (
            <Text style={styles.metaItem}>Style: {styleToLabel(boulder.style)}</Text>
          )}
        </View>
      )}

      {boulder.first_ascent_name && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>First ascent</Text>
          <Text style={styles.description}>
            {boulder.first_ascent_name}
            {boulder.first_ascent_date ? ` (${boulder.first_ascent_date})` : ''}
          </Text>
        </View>
      )}

      {boulder.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{boulder.description}</Text>
        </View>
      ) : (
        <Text style={styles.noDescription}>No description</Text>
      )}

      {user && (
        <Pressable
          style={styles.logClimbButton}
          onPress={() => setLogClimbVisible(true)}
        >
          <FontAwesome name="bookmark" size={18} color="#fff" />
          <Text style={styles.logClimbButtonText}>Log climb</Text>
        </Pressable>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoScroll}
        >
          {photos.map((p, index) => (
            <Pressable
              key={p.id}
              onPress={() => {
                setPhotoViewerIndex(index);
                setPhotoViewerVisible(true);
              }}
              style={({ pressed }) => [styles.photoThumb, pressed && { opacity: 0.9 }]}
            >
              <Image
                source={{ uri: p.url }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            </Pressable>
          ))}
          {user && (
            <Pressable
              style={[styles.photoThumb, styles.photoAdd]}
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission needed', 'Allow access to photos to add images.');
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [4, 3],
                  quality: 0.8,
                  base64: true,
                });
                if (result.canceled || !result.assets[0] || !id || !user) return;
                setPhotoUploading(true);
                try {
                  const asset = result.assets[0];
                  const uri = asset.uri;
                  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
                  const path = `${user.id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                  let uploadData: ArrayBuffer | Blob;
                  if (asset.base64) {
                    uploadData = decode(asset.base64);
                  } else {
                    const response = await fetch(uri);
                    uploadData = await response.blob();
                  }
                  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
                  const { error: uploadErr } = await supabase.storage
                    .from('boulder-photos')
                    .upload(path, uploadData, { contentType });
                  if (uploadErr) throw uploadErr;
                  const { data: urlData } = supabase.storage
                    .from('boulder-photos')
                    .getPublicUrl(path);
                  const { error: insertErr } = await supabase.from('photos').insert({
                    boulder_id: id,
                    url: urlData.publicUrl,
                    created_by: user.id,
                  });
                  if (insertErr) throw insertErr;
                  const { data: newPhotos } = await supabase
                    .from('photos')
                    .select('id, url')
                    .eq('boulder_id', id)
                    .order('created_at', { ascending: true });
                  setPhotos(newPhotos ?? []);
                } catch (e) {
                  Alert.alert('Error', e instanceof Error ? e.message : 'Failed to upload photo');
                } finally {
                  setPhotoUploading(false);
                }
              }}
              disabled={photoUploading}
            >
              {photoUploading ? (
                <ActivityIndicator size="small" color={Colors.dark.tint} />
              ) : (
                <FontAwesome name="plus" size={24} color={Colors.dark.text} />
              )}
            </Pressable>
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rating</Text>
        <View style={styles.ratingRow}>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={async () => {
                  if (!user || !id) return;
                  const newRating = userRating === star ? null : star;
                  if (newRating != null) {
                    const { error } = await supabase.from('route_ratings').upsert(
                      { user_id: user.id, boulder_id: id, rating: newRating },
                      { onConflict: 'user_id,boulder_id' as const }
                    );
                    if (!error) setUserRating(newRating);
                  } else {
                    const { error } = await supabase
                      .from('route_ratings')
                      .delete()
                      .eq('user_id', user.id)
                      .eq('boulder_id', id);
                    if (!error) setUserRating(null);
                  }
                  const { data } = await supabase
                    .from('route_ratings')
                    .select('rating')
                    .eq('boulder_id', id);
                  const rows = data ?? [];
                  if (rows.length > 0) {
                    const sum = rows.reduce((a, r) => a + r.rating, 0);
                    setAvgRating(Math.round((sum / rows.length) * 10) / 10);
                    setRatingCount(rows.length);
                  } else {
                    setAvgRating(null);
                    setRatingCount(0);
                  }
                }}
                hitSlop={8}
              >
                <FontAwesome
                  name={userRating != null && star <= userRating ? 'star' : 'star-o'}
                  size={28}
                  color={user ? Colors.dark.tint : Colors.dark.cardBorder}
                />
              </Pressable>
            ))}
          </View>
          {(avgRating != null || ratingCount > 0) && (
            <Text style={styles.ratingText}>
              {avgRating != null ? `${avgRating} · ` : ''}
              {ratingCount} rating{ratingCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comments</Text>
        {comments.map((c) => (
          <View key={c.id} style={styles.commentCard}>
            <View style={styles.commentCardHeader}>
              <Text style={styles.commentAuthor}>{c.username ?? 'User'}</Text>
              {user && c.user_id === user.id && (
                <Pressable
                  onPress={async () => {
                    Alert.alert(
                      'Delete comment',
                      'Are you sure you want to delete this comment?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            const { error } = await supabase
                              .from('comments')
                              .delete()
                              .eq('id', c.id);
                            if (!error) {
                              setComments((prev) => prev.filter((x) => x.id !== c.id));
                            } else {
                              Alert.alert('Error', 'Could not delete comment');
                            }
                          },
                        },
                      ]
                    );
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <FontAwesome name="trash-o" size={14} color={Colors.dark.text} />
                </Pressable>
              )}
            </View>
            <Text style={styles.commentBody}>{c.body}</Text>
            <Text style={styles.commentDate}>
              {new Date(c.created_at).toLocaleDateString()}
            </Text>
          </View>
        ))}
        {user ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.commentForm}
          >
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="rgba(196, 167, 125, 0.5)"
              value={commentBody}
              onChangeText={setCommentBody}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[styles.commentSubmit, (!commentBody.trim() || commentLoading) && styles.commentSubmitDisabled]}
              onPress={async () => {
                if (!commentBody.trim() || !id || !user) return;
                setCommentLoading(true);
                try {
                  const username = (user.user_metadata?.username as string) ?? '';
                  if (username) {
                    await supabase.from('profiles').upsert(
                      { id: user.id, username },
                      { onConflict: 'id' }
                    );
                  }
                  const { error } = await supabase.from('comments').insert({
                    boulder_id: id,
                    user_id: user.id,
                    body: commentBody.trim(),
                  });
                  if (error) throw error;
                  setCommentBody('');
                  const { data } = await supabase.rpc('get_boulder_comments', {
                    p_boulder_id: id,
                  });
                  setComments((data ?? []) as Comment[]);
                } catch (e) {
                  Alert.alert('Error', e instanceof Error ? e.message : 'Failed to post comment');
                } finally {
                  setCommentLoading(false);
                }
              }}
              disabled={!commentBody.trim() || commentLoading}
            >
              <Text style={styles.commentSubmitText}>
                {commentLoading ? 'Posting...' : 'Post'}
              </Text>
            </Pressable>
          </KeyboardAvoidingView>
        ) : (
          <Text style={styles.commentSignIn}>Sign in to add a comment</Text>
        )}
      </View>

      <Modal
        visible={logClimbVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLogClimbVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLogClimbVisible(false)}
        >
          <Pressable
            style={styles.logClimbModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.logClimbHeader}>
              <Text style={styles.logClimbTitle}>Log climb</Text>
              <Pressable onPress={() => setLogClimbVisible(false)} hitSlop={8}>
                <FontAwesome name="times" size={20} color={Colors.dark.text} />
              </Pressable>
            </View>
            <Text style={styles.logClimbLabel}>Outcome</Text>
            <View style={styles.logClimbOutcomes}>
              {CLIMB_OUTCOMES.map((o) => (
                <Pressable
                  key={o.value}
                  style={[
                    styles.logClimbOutcomeChip,
                    logOutcome === o.value && styles.logClimbOutcomeChipSelected,
                  ]}
                  onPress={() => setLogOutcome(o.value)}
                >
                  <Text
                    style={[
                      styles.logClimbOutcomeText,
                      logOutcome === o.value && styles.logClimbOutcomeTextSelected,
                    ]}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.logClimbLabel}>Rating (optional)</Text>
            <View style={styles.logClimbStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setLogRating(logRating === star ? null : star)}
                  hitSlop={8}
                >
                  <FontAwesome
                    name={logRating != null && star <= logRating ? 'star' : 'star-o'}
                    size={24}
                    color={Colors.dark.tint}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.logClimbLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.logClimbNotes}
              placeholder="Add notes..."
              placeholderTextColor="rgba(196, 167, 125, 0.5)"
              value={logNotes}
              onChangeText={setLogNotes}
              multiline
              numberOfLines={3}
            />
            <Pressable
              style={[styles.logClimbSubmit, logLoading && styles.logClimbSubmitDisabled]}
              onPress={async () => {
                if (!id || !user) return;
                setLogLoading(true);
                try {
                  const { error } = await supabase.from('climb_logs').insert({
                    boulder_id: id,
                    user_id: user.id,
                    outcome: logOutcome,
                    rating: logRating,
                    notes: logNotes.trim() || null,
                  });
                  if (error) throw error;
                  setLogClimbVisible(false);
                  setLogOutcome('send');
                  setLogRating(null);
                  setLogNotes('');
                } catch (e) {
                  Alert.alert('Error', e instanceof Error ? e.message : 'Failed to log climb');
                } finally {
                  setLogLoading(false);
                }
              }}
              disabled={logLoading}
            >
              <Text style={styles.logClimbSubmitText}>
                {logLoading ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <MapLocationPicker
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={async (newLat, newLng) => {
          if (!id || !user) return;
          const { error } = await supabase
            .from('boulders')
            .update({ lat: newLat, lng: newLng })
            .eq('id', id);
          if (!error) {
            setBoulder((prev) =>
              prev ? { ...prev, lat: newLat, lng: newLng } : null
            );
            setLocationPickerVisible(false);
          }
        }}
        initialLat={boulder.lat}
        initialLng={boulder.lng}
      />

      <Modal
        visible={photoViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoViewerVisible(false)}
      >
        <GestureHandlerRootView style={styles.photoViewerOverlay}>
            <Pressable
              style={styles.photoViewerClose}
              onPress={() => setPhotoViewerVisible(false)}
              hitSlop={16}
            >
              <FontAwesome name="times" size={24} color="#fff" />
            </Pressable>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={photoViewerIndex}
              onMomentumScrollEnd={handlePhotoViewerScroll}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.photoViewerSlide, { width: screenWidth, height: screenHeight }]}>
                  {Platform.OS === 'web' ? (
                    <Image
                      source={{ uri: item.url }}
                      style={styles.photoViewerImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <ImageZoom
                      uri={item.url}
                      style={styles.photoViewerImage}
                      resizeMode="contain"
                      minScale={1}
                      maxScale={5}
                      isDoubleTapEnabled
                      doubleTapScale={3}
                    />
                  )}
                </View>
              )}
            />
            <View style={styles.photoViewerPager}>
              <Text style={styles.photoViewerPagerText}>
                {photoViewerIndex + 1} / {photos.length}
              </Text>
            </View>
        </GestureHandlerRootView>
      </Modal>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  logClimbButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.dark.tint,
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  logClimbButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logClimbModal: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  logClimbHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logClimbTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  logClimbLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  logClimbOutcomes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logClimbOutcomeChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.background,
  },
  logClimbOutcomeChipSelected: {
    borderColor: Colors.dark.tint,
    backgroundColor: 'rgba(90, 138, 90, 0.15)',
  },
  logClimbOutcomeText: {
    fontSize: 15,
    color: Colors.dark.text,
  },
  logClimbOutcomeTextSelected: {
    color: Colors.dark.tint,
    fontWeight: '600',
  },
  logClimbStars: {
    flexDirection: 'row',
    gap: 8,
  },
  logClimbNotes: {
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.background,
    minHeight: 80,
  },
  logClimbSubmit: {
    backgroundColor: Colors.dark.tint,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  logClimbSubmitDisabled: {
    opacity: 0.6,
  },
  logClimbSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  grade: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.tint,
  },
  voteCount: {
    fontSize: 14,
    opacity: 0.7,
    color: Colors.dark.text,
    marginLeft: 12,
  },
  breadcrumb: {
    fontSize: 14,
    opacity: 0.7,
    color: Colors.dark.text,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    fontSize: 14,
    color: Colors.dark.text,
    opacity: 0.85,
  },
  photoScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  photoThumb: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: Colors.dark.cardBorder,
  },
  photoAdd: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.dark.cardBorder,
  },
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  photoViewerSlide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerImage: {
    width: '100%',
    height: '100%',
  },
  photoViewerPager: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  photoViewerPagerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'column',
    gap: 8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    opacity: 0.7,
    color: Colors.dark.text,
  },
  commentCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  commentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  commentBody: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.dark.text,
    opacity: 0.9,
  },
  commentDate: {
    fontSize: 12,
    opacity: 0.6,
    color: Colors.dark.text,
    marginTop: 6,
  },
  commentForm: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.background,
    minHeight: 44,
    maxHeight: 100,
  },
  commentSubmit: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.dark.tint,
  },
  commentSubmitDisabled: {
    opacity: 0.5,
  },
  commentSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  commentSignIn: {
    fontSize: 14,
    opacity: 0.6,
    color: Colors.dark.text,
    fontStyle: 'italic',
    marginTop: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
  },
  headerActions: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.tint,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    minWidth: 180,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    opacity: 0.8,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.dark.text,
    opacity: 0.9,
  },
  noDescription: {
    fontSize: 15,
    opacity: 0.5,
    color: Colors.dark.text,
    fontStyle: 'italic',
  },
  text: { color: Colors.dark.text },
});

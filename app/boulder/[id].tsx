import { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  Modal,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import MapLocationPicker from '@/components/MapLocationPicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { gradeToLabel } from '@/constants/Grades';

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
};

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

  useEffect(() => {
    const fetchBoulder = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('boulders')
        .select('id, name, description, avg_grade, vote_count, sector_id, area_id, lat, lng')
        .eq('id', id)
        .single();
      setBoulder(data);
      setLoading(false);
    };
    fetchBoulder();
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

      {boulder.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{boulder.description}</Text>
        </View>
      ) : (
        <Text style={styles.noDescription}>No description</Text>
      )}

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

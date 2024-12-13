import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'expo-router';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService, ServingBooking } from '@/services/booking';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import PagerView from 'react-native-pager-view';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EXCLUDED_PATHS = [
  '(auth)',
  'onboarding',
  'booking-detail',
  'order-drink'
];

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

export default function FloatingServingBookings() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [servingBookings, setServingBookings] = useState<ServingBooking[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(100);
  const pagerRef = useRef<PagerView>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapsedOpacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const rightPosition = useSharedValue(16);
  const lastPageRef = useRef<number>(0);
  const wasHiddenRef = useRef(true);

  const shouldShow = !EXCLUDED_PATHS.some(path => pathname.includes(path)) && isAuthenticated;

  useEffect(() => {
    if (shouldShow && wasHiddenRef.current && servingBookings.length > 0) {
      opacity.value = 0;
      translateY.value = 100;
      
      requestAnimationFrame(() => {
        opacity.value = withTiming(1, { duration: 500 });
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 100,
        });
      });
    }
    
    wasHiddenRef.current = !shouldShow;
  }, [shouldShow, servingBookings.length]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchServingBookings = async () => {
      if (!user?.accountId || !isAuthenticated) return;

      try {
        const response = await bookingService.getServingBookings(user.accountId);
        setServingBookings(response.data);
        
        if (response.data.length > 0 && shouldShow && !wasHiddenRef.current) {
          opacity.value = withTiming(1, { duration: 500 });
          translateY.value = withSpring(0);
        }
      } catch (error) {
        console.error('Error fetching serving bookings:', error);
      }
    };

    if (isAuthenticated) {
      fetchServingBookings();
      interval = setInterval(fetchServingBookings, 30000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user?.accountId, shouldShow, isAuthenticated]);

  useEffect(() => {
    if (isCollapsed) {
      collapsedOpacity.value = withTiming(1, { duration: 300 });
    } else {
      collapsedOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isCollapsed]);

  useEffect(() => {
    lastPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    if (pagerRef.current && servingBookings.length > 0) {
      const safeLastPage = Math.min(lastPageRef.current, servingBookings.length - 1);
      pagerRef.current.setPage(safeLastPage);
      setCurrentPage(safeLastPage);
    }
  }, [servingBookings]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
    right: rightPosition.value,
  }));

  const collapsedTriggerStyle = useAnimatedStyle(() => ({
    opacity: collapsedOpacity.value,
  }));

  const handleBookingPress = (bookingId: string) => {
    lastPageRef.current = currentPage;
    router.push(`/booking-detail/${bookingId}`);
  };

  const handleCollapse = () => {
    scale.value = withTiming(0.5, { duration: 200 });
    rightPosition.value = withTiming(16, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 });
    
    setTimeout(() => {
      setIsCollapsed(true);
    }, 200);
  };

  const handleExpand = () => {
    setIsCollapsed(false);
    
    scale.value = 0.5;
    rightPosition.value = 16;
    opacity.value = 0;

    requestAnimationFrame(() => {
      scale.value = withSpring(1);
      rightPosition.value = withSpring(16);
      opacity.value = withTiming(1, { duration: 300 });
    });
  };

  if (!shouldShow || servingBookings.length === 0) return null;

  return (
    <>
      {!isCollapsed && (
        <Animated.View style={[styles.container, animatedStyle]}>
          <AnimatedPagerView
            ref={pagerRef}
            style={styles.pager}
            initialPage={currentPage}
            onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
          >
            {servingBookings.map((booking) => (
              <TouchableOpacity
                key={booking.bookingId}
                activeOpacity={0.7}
                onPress={() => handleBookingPress(booking.bookingId)}
                style={styles.touchable}
              >
                <View style={styles.card}>
                  <View style={styles.contentContainer}>
                    <Image
                      source={{ uri: booking.image }}
                      style={styles.image}
                    />
                    <View style={styles.textContainer}>
                      <Text style={styles.barName} numberOfLines={1}>
                        {booking.barName}
                      </Text>
                      <View style={styles.timeContainer}>
                        <MaterialCommunityIcons 
                          name="clock-outline" 
                          size={14} 
                          color="#EAB308" 
                        />
                        <Text style={styles.dateTime}>
                          {format(parseISO(booking.bookingDate), 'dd/MM/yyyy', { locale: vi })} • {booking.bookingTime.slice(0, 5)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statusWrapper}>
                      <View style={styles.statusContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Đang phục vụ</Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleCollapse}
                        style={styles.collapseButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {servingBookings.length > 1 && (
                    <View style={styles.paginationContainer}>
                      {servingBookings.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            i === currentPage ? styles.activeDot : styles.inactiveDot
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </AnimatedPagerView>
        </Animated.View>
      )}

      {isCollapsed && (
        <TouchableOpacity
          style={styles.collapsedTriggerContainer}
          onPress={handleExpand}
          activeOpacity={0.7}
        >
          <Animated.View style={[styles.collapsedTrigger, collapsedTriggerStyle]}>
            <View style={styles.collapsedContent}>
              <View style={styles.statusDot} />
              <Text style={styles.collapsedText}>Đang phục vụ ({servingBookings.length})</Text>
              <Ionicons name="chevron-up" size={16} color="#9CA3AF" />
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    zIndex: 50,
    transformOrigin: 'right bottom',
  },
  pager: {
    height: 80,
  },
  touchable: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: 'rgba(23, 23, 23, 0.9)',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginLeft: 4
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  barName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    paddingRight: 5
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateTime: {
    color: '#EAB308',
    fontSize: 13,
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: -4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  statusText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 1
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  activeDot: {
    backgroundColor: '#EAB308',
    width: 12,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapseButton: {
    marginLeft: 8,
    padding: 2,
  },
  collapsedTriggerContainer: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 50,
  },
  collapsedTrigger: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(23, 23, 23, 0.75)',
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collapsedText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
    marginBottom: 1,
  },
}); 
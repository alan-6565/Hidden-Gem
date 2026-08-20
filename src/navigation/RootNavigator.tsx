import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import ReelsScreen from '../screens/ReelsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SpotProfileScreen from '../screens/SpotProfileScreen';
import AddReviewScreen from '../screens/AddReviewScreen';
import ComposeScreen from '../screens/ComposeScreen';
import SearchFiltersScreen from '../screens/SearchFiltersScreen';
import BusinessEditScreen from '../screens/BusinessEditScreen';
import CreateBusinessScreen from '../screens/CreateBusinessScreen';
import OrderScreen from '../screens/OrderScreen';
import OrdersScreen from '../screens/OrdersScreen';
import { RootStackParamList, TabParamList } from './types';
import { colors, radius } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Map: 'map',
  Reels: 'play-circle',
  Profile: 'person-circle',
};

function EmptyScreen() {
  return null;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 62, paddingTop: 6, paddingBottom: 8 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen
        name="Post"
        component={EmptyScreen}
        options={{
          tabBarIcon: () => (
            <View style={styles.fab}>
              <Ionicons name="add" size={26} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation
              .getParent<NativeStackNavigationProp<RootStackParamList>>()
              ?.navigate('Compose');
          },
        })}
      />
      <Tab.Screen name="Reels" component={ReelsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.text }}>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="SpotProfile"
        component={SpotProfileScreen}
        options={{ title: '' }}
      />
      <Stack.Screen
        name="AddReview"
        component={AddReviewScreen}
        options={{ title: 'Write a Review' }}
      />
      <Stack.Screen
        name="SearchFilters"
        component={SearchFiltersScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="Compose"
        component={ComposeScreen}
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="BusinessEdit"
        component={BusinessEditScreen}
        options={{ title: 'Manage Business' }}
      />
      <Stack.Screen
        name="CreateBusiness"
        component={CreateBusinessScreen}
        options={{ title: 'Add Your Business' }}
      />
      <Stack.Screen name="Order" component={OrderScreen} options={{ title: 'Order Ahead' }} />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});

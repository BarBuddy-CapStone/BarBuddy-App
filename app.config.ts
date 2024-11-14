import { ExpoConfig, ConfigContext } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: "BarBuddy",
    slug: "BarBuddy-App",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "com.fptu.barbuddy",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    ios: {
      bundleIdentifier: "com.fptu.barbuddy",
      buildNumber: "1.0.0",
      supportsTablet: true,
      infoPlist: {
        NSPhotoLibraryUsageDescription: "Ứng dụng cần quyền truy cập vào thư viện ảnh để thay đổi ảnh đại diện của bạn.",
        NSCameraUsageDescription: "Ứng dụng cần quyền truy cập vào máy ảnh để chụp ảnh đại diện mới.",
        NSLocationWhenInUseUsageDescription: "Ứng dụng cần quyền truy cập vị trí để hiển thị các quán bar gần bạn.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Ứng dụng cần quyền truy cập vị trí để hiển thị các quán bar gần bạn.",
        NSLocationAlwaysUsageDescription: "Ứng dụng cần quyền truy cập vị trí để hiển thị các quán bar gần bạn.",
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.googleusercontent.apps.294668771815-0oslkkj1gg5sov5o7npbbf6beo7aknni"
            ]
          }
        ]
      }
    },
    android: {
      package: "com.fptu.barbuddy",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#000000"
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "com.fptu.barbuddy",
              host: "payment",
              pathPrefix: "/"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "@react-native-google-signin/google-signin",
      [
        "expo-image-picker",
        {
          photosPermission: "Ứng dụng cần quyền truy cập vào thư viện ảnh để thay đổi ảnh đại diện của bạn.",
          cameraPermission: "Ứng dụng cần quyền truy cập vào máy ảnh để chụp ảnh đại diện mới."
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      goongApiKey: process.env.GOONG_API_KEY,
      goongMapsKey: process.env.GOONG_MAPS_KEY,
      apiUrl: process.env.API_URL,
      apiTimeout: process.env.API_TIMEOUT,
      eas: {
        projectId: "7f78547a-caf1-420f-b7bb-d69c26cd081d"
      }
    },
    owner: "kiendtse161968"
  };
}; 
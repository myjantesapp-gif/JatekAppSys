/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => {
  const slug = process.env.EXPO_SLUG ?? "jatek-mobile";
  const owner = process.env.EXPO_OWNER ?? "myjantes";
  const projectId =
    process.env.EXPO_PUBLIC_PROJECT_ID ??
    process.env.DEFAULT_PROJECT_ID ??
    "24f32081-ec5b-4040-9694-24e08de7e7c7";

  return {
    ...config,
    name: "Jatek",
    slug,
    owner,
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "jatek",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#FCB2D3",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "ma.jatek.app",
      buildNumber: "1",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Jatek uses your location to autofill your delivery address and confirm you are within our delivery zone in Oujda.",
        NSLocationAlwaysUsageDescription:
          "Jatek uses your location to autofill your delivery address.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "ma.jatek.app",
      versionCode: 12,
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#FCB2D3",
      },
    },
    web: {
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-updates",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow Jatek to use your location to fill in your delivery address.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#E91E63",
          androidMode: "default",
        },
      ],
    ],
    updates: {
      url: `https://u.expo.dev/${projectId}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId,
      },
    },
  };
};

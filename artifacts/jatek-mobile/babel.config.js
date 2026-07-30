module.exports = function (api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === "production" || process.env.EAS_BUILD === "true";
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    // Strip all console.* calls from production bundles. Keeps logs in dev for
    // debugging but prevents accidental leakage of state / timing data and
    // shaves a measurable amount off the JS thread on low-end Android devices.
    plugins: isProd ? [["transform-remove-console", { exclude: ["error", "warn"] }]] : [],
  };
};

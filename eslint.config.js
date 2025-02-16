module.exports = [
    {
      // Specify which files this config applies to.
      files: ["**/*.{js,jsx}"],
      // Set language options (instead of "env")
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        // Manually add globals provided by browser and Node environments.
        globals: {
          // Browser globals
          window: "readonly",
          document: "readonly",
          // Node globals
          process: "readonly",
          module: "writable",
          __dirname: "readonly",
          require: "readonly"
        }
      },
      linterOptions: {
        // Optionally report unused ESLint disable comments
        reportUnusedDisableDirectives: true
      },
      // Set your rules
      rules: {
        "no-console": "off",
        // Integrate Prettier as an ESLint rule.
        "prettier/prettier": "error"
      },
      // Include plugins as needed.
      plugins: {
        prettier: require("eslint-plugin-prettier")
      }
    }
  ];
  
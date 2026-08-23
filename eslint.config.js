// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook"

import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import boundaries from "eslint-plugin-boundaries"
import checkFile from "eslint-plugin-check-file"
import prettier from "eslint-config-prettier/flat"

/**
 * FSD 요소는 파일이 아니라 폴더 단위로 분류한다.
 * 구체적인 slice 패턴을 root layer 패턴보다 먼저 둔다.
 */
const ELEMENTS = [
  { type: "pages", pattern: "src/pages/*", partialMatch: false },
  { type: "pages", pattern: "src/pages", partialMatch: false },
  { type: "widgets", pattern: "src/widgets/*", partialMatch: false },
  { type: "widgets", pattern: "src/widgets", partialMatch: false },
  { type: "features", pattern: "src/features/*", partialMatch: false },
  { type: "entities", pattern: "src/entities/*", partialMatch: false },
  { type: "shared", pattern: "src/shared", partialMatch: false },
  // dev 전용 mock 서버. 제품 코드에서는 절대 import 되지 않는다.
  { type: "mocks", pattern: "src/mocks", partialMatch: false },
  { type: "app", pattern: "src/app", partialMatch: false },
  // App.tsx와 main.tsx가 속하는 composition root.
  { type: "app", pattern: "src", partialMatch: false },
]

const allowTo = (from, to, fileInternalPath) => ({
  from: { element: { type: from } },
  allow: {
    to: {
      element: {
        types: { anyOf: to },
        ...(fileInternalPath ? { fileInternalPath } : {}),
      },
    },
  },
})

export default tseslint.config(
  {
    ignores: [
      "dist",
      "storybook-static",
      "coverage",
      "playwright-report",
      "test-results",
      "public/mockServiceWorker.js",
      "src/shared/api/generated",
      // 저장소 루트에서 실행할 때 .claude/worktrees/ 아래 다른 세션의 워크트리
      // 체크아웃(별도 .git 포함)까지 스캔하지 않도록 제외한다.
      ".claude",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    files: ["src/**/*.{ts,tsx}"],
    linterOptions: { reportUnusedDisableDirectives: "error" },
    languageOptions: {
      globals: globals.browser,
    },
    plugins: { boundaries, "check-file": checkFile },
    settings: {
      "boundaries/include": ["src/**/*.{ts,tsx}"],
      "boundaries/elements": ELEMENTS,
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
    },
    rules: {
      /* ---- error: 현재 위반 0건 ---- */
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\[var\\(--color-/]",
          message:
            "색상 토큰은 @theme에 매핑된 유틸리티 클래스를 쓴다. [var(--color-*)] 대괄호 탈출구를 다시 쓰지 않는다(POL-039).",
        },
        {
          selector: "TemplateElement[value.raw=/\\[var\\(--color-/]",
          message:
            "색상 토큰은 @theme에 매핑된 유틸리티 클래스를 쓴다. [var(--color-*)] 대괄호 탈출구를 다시 쓰지 않는다(POL-039).",
        },
        {
          selector: 'TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]',
          message:
            "`as unknown as`는 타입 검사를 통째로 끈다. 생성 타입과 런타임이 어긋나면 openapi-transformer.ts에서 스펙을 고친다(REQ-CMN-007 봉투는 이미 벗겨진다).",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*"],
              message: "Next.js가 아니다. react-router / <img> 를 쓴다.",
            },
          ],
        },
      ],
      "no-restricted-exports": [
        "error",
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
      "check-file/folder-naming-convention": [
        "error",
        { "src/**/": "KEBAB_CASE" },
      ],
      // FSD 마이그레이션 완료로 error 승격 (모두 위반 0건 확인됨)
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/array-type": ["error", { default: "array" }],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "check-file/filename-naming-convention": [
        "error",
        { "**/*.{ts,tsx}": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
      // 하드코딩 정리 작업으로 error 승격 (모두 위반 0건 확인됨)
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["./*", "../*"], message: "@/ 절대경로만 사용한다." },
          ],
        },
      ],
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/purity": "error",
      "react-hooks/static-components": "error",
      "react-hooks/immutability": "error",
      "react-hooks/preserve-manual-memoization": "error",
      "react-refresh/only-export-components": [
        "error",
        { allowConstantExport: true },
      ],

      /* ---- FSD layer direction + slice public API ---- */
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "FSD 경계 위반: {{from.element.types}} → {{to.element.types}} ({{dependency.source}})",
          policies: [
            allowTo(
              "app",
              ["pages", "widgets", "features", "entities"],
              "index.ts",
            ),
            allowTo("pages", ["widgets", "features", "entities"], "index.ts"),
            allowTo("widgets", ["features", "entities"], "index.ts"),
            allowTo("features", ["entities"], "index.ts"),
            allowTo("mocks", ["entities"], "index.ts"),
            allowTo("app", ["app", "shared", "mocks"]),
            allowTo("pages", ["shared"]),
            allowTo("widgets", ["shared"]),
            allowTo("features", ["shared"]),
            allowTo("entities", ["shared"]),
            allowTo("shared", ["shared"]),
            allowTo("mocks", ["mocks", "shared"]),
            // 같은 slice 안에서는 내부 모듈을 자유롭게 조합한다.
            { allow: { dependency: { relationship: { to: "internal" } } } },
          ],
        },
      ],
      "boundaries/no-unknown-files": "error",
      "boundaries/no-unknown-dependencies": "error",
    },
  },
  {
    // 라이브러리가 default export를 요구하는 문서화된 예외
    files: [
      "src/App.tsx",
      "*.config.{ts,js,mjs}",
      "eslint.config.js",
      "src/**/*.stories.tsx",
    ],
    rules: { "no-restricted-exports": "off" },
  },
  {
    // App.tsx는 앱 합성 루트 관례상 PascalCase 파일명을 유지한다
    files: ["src/App.tsx"],
    rules: { "check-file/filename-naming-convention": "off" },
  },
  {
    files: [
      "*.config.{ts,js,mjs}",
      "eslint.config.js",
      "orval.config.ts",
      "playwright.config.ts",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // Storybook 데코레이터는 앱의 Fast Refresh 경계와 무관하다
    files: [".storybook/**/*.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // 테스트는 MSW server 같은 개발 전용 adapter를 조립할 수 있다.
    files: ["src/**/*.test.{ts,tsx}"],
    rules: { "boundaries/dependencies": "off" },
  },
  {
    // 화면 스토리는 실제 빌드(dist)에 포함되지 않는 dev 전용 도구다. src/ 밖의
    // 공용 스토리 데코레이터(.storybook/decorators)를 상대경로로 불러오고,
    // PageShell(app 레이어)을 직접 조립해 실제 라우트를 재현해야 하므로
    // FSD 레이어 방향·절대경로 규칙의 대상에서 제외한다.
    files: ["src/**/*.stories.tsx"],
    rules: {
      "@typescript-eslint/no-restricted-imports": "off",
      "boundaries/dependencies": "off",
    },
  },
  prettier,
  storybook.configs["flat/recommended"],
)

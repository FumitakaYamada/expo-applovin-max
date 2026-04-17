# @fumitakayamada/expo-applovin-max

[English](./README.md) | **日本語**

> **Expo** managed / EAS workflow 向けの、痒いところに手が届くオールインワン **AppLovin MAX** config plugin。
>
> **Expo SDK 55 向けに作られ、動作確認済み。** SDK 54 でも動くはずですが、未検証です。

[![npm version](https://img.shields.io/npm/v/@fumitakayamada/expo-applovin-max.svg)](https://www.npmjs.com/package/@fumitakayamada/expo-applovin-max)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Sponsor](https://img.shields.io/github/sponsors/FumitakaYamada?logo=GitHub&label=Sponsor&color=ea4aaa)](https://github.com/sponsors/FumitakaYamada)

`app.config.ts` に plugin を 1 行追加するだけで **AppLovin MAX** を Expo プロジェクトに統合します。既存の Expo plugin ではフォローしきれていなかった、以下の 3 つの統合ペインポイントを end-to-end でカバーします:

1. **Mediation Adapters** — 28 以上の配線済み広告ネットワークから short ID で選ぶだけ(`networks: ["pangle", "mintegral", "liftoff", "meta", "google", "unity"]` が現実的なデフォルト)。plugin が各ネットワークについて、Android Gradle 依存、iOS pod、Maven リポジトリ、packaging 衝突解消、AdMob App ID、`useFrameworks: "static"` 下での xcframework linking 修正までまとめて面倒を見ます。**opt-in 設計**なので、実際にマネタイズしているネットワークだけ同梱でき、バンドルサイズを肥大化させません。
2. **Ad Review (Quality Service)** — Android 側は Gradle plugin の配線、iOS 側は prebuild 中のインストーラー呼び出しまで行うため、AppLovin の MAX Mediation Debugger 上で **Ad Review Version ✅** を出せます。
3. **SKAdNetwork IDs** — `skAdNetworkItems` パラメータ (`react-native-google-mobile-ads` と同じ形) を渡すと `Info.plist` に識別子を注入します。AppLovin MAX と同梱している mediated network 全てをカバーする `DEFAULT_SKADNETWORK_IDENTIFIERS` 定数も library から export しているので、そのまま流用可能です。

なぜこの library が必要なのか:

| 機能 | Invertase `react-native-google-mobile-ads` | この library |
| --- | --- | --- |
| SKAdNetwork 注入 | ✅ `sk_ad_network_items` 経由 (AdMob 想定・リストは自前) | ✅ 同じパラメータ shape + AppLovin MAX 用 bundled リスト付き |
| Mediation adapter の設定 | ⚠️ AdMob mediation のみ、ドキュメント提示のみで Pod / Gradle は手動 | ✅ AppLovin MAX mediation 対応、Android / iOS 両方を自動化 |
| AppLovin Ad Review | ❌ 非対応 | ✅ Android Gradle plugin + iOS installer + xcframework link 確認まで |
| AppLovin MAX 対応 | ❌ AdMob 専用 | ✅ まさにこのためのライブラリ |

## 目次

- [インストール](#インストール)
- [Quick start](#quick-start)
- [全オプションリファレンス](#全オプションリファレンス)
- [Network registry](#network-registry)
- [plugin が何をしているか](#plugin-が何をしているか)
- [FAQ](#faq)
- [トラブルシューティング](#トラブルシューティング)
- [互換性](#互換性)
- [Contributing](#contributing)
- [スポンサー](#スポンサー)
- [ライセンス](#ライセンス)

## インストール

### 1. パッケージをインストール

```bash
# pnpm (推奨)
pnpm add @fumitakayamada/expo-applovin-max

# npm
npm install @fumitakayamada/expo-applovin-max

# yarn
yarn add @fumitakayamada/expo-applovin-max
```

実際に広告を *表示* するには AppLovin MAX の React Native SDK も必要です。この plugin はネイティブ統合を設定するだけで、JS SDK 本体は同梱していません。

```bash
pnpm add react-native-applovin-max
```

### 2. (任意) iOS Ad Review セットアップスクリプトをダウンロード

iOS で **Ad Review (Quality Service)** を使いたい場合:

1. AppLovin ダッシュボードを開く: **MAX → Ad Review → Download Setup Script (iOS)**
2. ダウンロードされた `AppLovinQualityServiceSetup-ios.rb` をプロジェクトに保存 (例: `scripts/AppLovinQualityServiceSetup-ios.rb`)
3. **`.gitignore` に追加する** — スクリプトにはダウンロード時に埋め込まれたアカウント固有の API key が含まれています。public リポジトリには絶対にコミットしないでください。

```gitignore
# .gitignore
scripts/AppLovinQualityServiceSetup-ios.rb
```

このステップをスキップすると iOS Ad Review が無効になるだけで、他の機能 (mediation adapter、SKAdNetwork、Android Ad Review) は正常に動作します。

## Quick start

> **💡 `app.config.js` / `app.config.ts` 推奨ですが必須ではありません。** JS/TS config を使うと library から `import { DEFAULT_SKADNETWORK_IDENTIFIERS }` できるため、bundled SKAdNetwork リストの注入が簡単です。ただし `app.json` のまま使うことも可能です — その場合は定数を import する代わりに `skAdNetworkItems` 配列を手動で記述してください。下の [app.json の場合](#appjson-の場合) を参照。

最小限の `app.config.ts` — `networks` で mediation network を選択し、SKAdNetwork の bundled リストを渡すだけ:

```ts
import type { ExpoConfig } from "@expo/config-types";
import { DEFAULT_SKADNETWORK_IDENTIFIERS } from "@fumitakayamada/expo-applovin-max";

export default {
  name: "MyApp",
  slug: "myapp",
  plugins: [
    [
      "@fumitakayamada/expo-applovin-max",
      {
        // グローバルアプリ向けのデファクトスタンダード: MAX waterfall の
        // 収益を支配する主要 6 ネットワーク。実際にマネタイズしている
        // ネットワークだけに絞ること — 各エントリが Android の Gradle 依存
        // + iOS pod + (必要なら) Maven repo を追加するため、バンドル
        // サイズに直接効いてきます。plugin はデフォルトで adapter を
        // 何も追加しないので、opt-in しない限りゼロです。
        networks: ["pangle", "mintegral", "liftoff", "meta", "google", "unity"],

        // `networks` に "google" か "googleAdManager" を含める場合は必須。
        admobAppIdAndroid: "ca-app-pub-XXXXXXXX~YYYYYYYY",
        admobAppIdIOS: "ca-app-pub-XXXXXXXX~ZZZZZZZZ",

        // bundled リストをそのまま渡す — AppLovin MAX と、この library が
        // 知っている全 mediated network をカバーしています。
        skAdNetworkItems: DEFAULT_SKADNETWORK_IDENTIFIERS,
      },
    ],
  ],
} satisfies ExpoConfig;
```

使える全 network ID は下の [Network registry](#network-registry) セクションに一覧があります。未知の ID を渡した場合は prebuild 時に警告が出ます。

28 以上の対応ネットワークを全部使う場合 (稀、大抵のアプリは 5〜10 で十分) は便利な定数を import できます:

```ts
import { ALL_NETWORK_IDS } from "@fumitakayamada/expo-applovin-max";
// ...
networks: ALL_NETWORK_IDS,
```

`skAdNetworkItems` のパラメータ形状は Invertase の [`react-native-google-mobile-ads`](https://docs.page/invertase/react-native-google-mobile-ads) と揃えてあるので、あちらを触ったことがあれば馴染みやすいはずです。

**Ad Review を有効にする場合。** Android と iOS の Ad Review は **別々の認証情報**を要求します(詳細は [FAQ 項目](#ad-review-に-android-と-ios-で別々のキーが必要なのはなぜ)を参照)。どちらも AppLovin ダッシュボードから取得します:

- **Android**: `AppLovin ダッシュボード → Account → Keys → Report Key` からコピーできる Report Key の文字列。`adReview.androidReportKey` に渡します。
- **iOS**: `AppLovin ダッシュボード → MAX → Ad Review → Download Setup Script (iOS)` からダウンロードした Ruby ファイル。プロジェクトに保存し(例: `scripts/AppLovinQualityServiceSetup-ios.rb`)、そのパスを `adReview.iosSetupScriptPath` に渡します。

片方のプラットフォームだけ有効化したい場合は、該当フィールドだけを指定すれば OK です。両方とも独立に optional です。

```ts
plugins: [
  [
    "@fumitakayamada/expo-applovin-max",
    {
      admobAppIdAndroid: "ca-app-pub-XXXXXXXX~YYYYYYYY",
      admobAppIdIOS: "ca-app-pub-XXXXXXXX~ZZZZZZZZ",
      adReview: {
        // Android — Report Key の文字列をそのまま貼り付け
        androidReportKey: "YOUR_REPORT_KEY_HERE",

        // iOS — AppLovin ダッシュボードからダウンロードした Ruby スクリプトの
        // プロジェクトルートからの相対パス。省略すれば iOS Ad Review はスキップ。
        iosSetupScriptPath: "scripts/AppLovinQualityServiceSetup-ios.rb",
      },
    },
  ],
],
```

> ⚠️ **セキュリティ注意:** iOS のセットアップスクリプトには、ダウンロード時点で AppLovin アカウント固有の API key が埋め込まれています。シークレットと同じ扱いで管理してください — private リポジトリ、`.gitignore` した場所、あるいは暗号化のいずれかで保護します。**public リポジトリには絶対にコミットしないでください。**

### app.json の場合

静的な `app.json` のままでもこの plugin は使えます — import を使わず、SKAdNetwork の識別子を手動でリストするだけです:

```json
{
  "expo": {
    "plugins": [
      [
        "@fumitakayamada/expo-applovin-max",
        {
          "networks": ["pangle", "mintegral", "liftoff", "meta", "google", "unity"],
          "admobAppIdAndroid": "ca-app-pub-XXXXXXXX~YYYYYYYY",
          "admobAppIdIOS": "ca-app-pub-XXXXXXXX~ZZZZZZZZ",
          "skAdNetworkItems": [
            "cstr6suwn9.skadnetwork",
            "4fzdc2evr5.skadnetwork",
            "...全リストをここに列挙..."
          ]
        }
      ]
    ]
  }
}
```

トレードオフ: `DEFAULT_SKADNETWORK_IDENTIFIERS` の便利さ (266 以上の識別子がバンドルされ、library のアップデートに追随する) が使えず、リストを自前で管理する必要があります。全リストはこちらを参照: <https://support.axon.ai/en/max/react-native/overview/skadnetwork>

plugin を追加したら、キャッシュをクリアしてから再ビルドします:

```bash
pnpm expo prebuild --clean
eas build --platform ios --profile production
eas build --platform android --profile production
```

## 全オプションリファレンス

```ts
[
  "@fumitakayamada/expo-applovin-max",
  {
    /**
     * AdMob App ID。Google adapter を有効にする場合 (デフォルトで有効) は必須。
     * 未設定で起動すると "Missing application ID" でクラッシュします。
     *
     * AdMob コンソールから取得:
     *   https://apps.admob.com → 対象アプリ → App settings → App ID
     */
    admobAppIdAndroid: "ca-app-pub-XXX~YYY",
    admobAppIdIOS: "ca-app-pub-XXX~ZZZ",

    /**
     * Ad Review (AppLovin Quality Service)。optional。
     *
     * Android と iOS の Ad Review はそれぞれ異なる認証情報を要求します —
     * 同じ文字列の別フォーマットではありません。詳細は FAQ の
     * 「Ad Review に Android と iOS で別々のキーが必要なのはなぜ?」を参照。
     *
     * 片方だけ、両方、あるいは全く Ad Review を使わないことも選べます。
     * 両方とも無効にするには `adReview` キーごと省略してください。
     *
     * androidReportKey:
     *   AppLovin ダッシュボード → Account → Keys → Report Key の文字列。
     *   app/build.gradle の `applovin { apiKey "..." }` ブロックに書き込まれます。
     *   省略すれば Android Ad Review はスキップされます。
     *
     * iosSetupScriptPath:
     *   AppLovin ダッシュボード → MAX → Ad Review → Download Setup Script iOS
     *   からダウンロードした AppLovinQualityServiceSetup-ios.rb のプロジェクト
     *   ルートからの相対パス。このファイルには AppLovin がダウンロード時に
     *   埋め込む独自の key (androidReportKey とは別物) が含まれているため、
     *   この library にバンドルすることはできません — publisher 各自が
     *   ダウンロードして自分のリポジトリにコミットする必要があります。
     *   省略すれば iOS Ad Review はスキップされます。
     *
     * `@crassaert/applovin-quality-service-expo-plugin` との互換のため、
     * `apiKey` という legacy alias も `androidReportKey` として受け付けます。
     */
    adReview: {
      androidReportKey: "YOUR_REPORT_KEY",
      iosSetupScriptPath: "scripts/AppLovinQualityServiceSetup-ios.rb",
    },

    /**
     * 推奨。mediation network を short ID で選択します。各エントリについて
     * そのネットワークの Android Gradle 依存、iOS pod、Maven リポジトリが
     * 追加されます。plugin は opt-in しない限り adapter を何も追加しません。
     *
     * 現実的なデフォルトとしては
     *   ["pangle", "mintegral", "liftoff", "meta", "google", "unity"]
     * — 大抵のアプリカテゴリで MAX waterfall の収益を支配する主要 6 ネット
     * ワーク。AppLovin ダッシュボードで実測した eCPM を見ながら適宜
     * 絞り込んだり広げたりしてください。
     *
     * 全 ID は下の「Network registry」セクションを参照。SKAdNetwork や
     * Ad Review だけ使いたくて adapter を一切いらない場合は [] を渡せます。
     */
    networks: ["pangle", "mintegral", "liftoff", "meta", "google", "unity"],

    /**
     * 上級者向け override。設定すると `networks` から生成される Android 側の
     * adapter を完全に置き換えます。バージョン固定、custom adapter、registry
     * にない追加 dependency 等が必要なときに使ってください。
     *
     * 各エントリ: { name: string, version?: string, extraDependencies?: string[] }
     *   - name: `com.applovin.mediation:` 以下の artifactId
     *   - version: デフォルトは "+"
     *   - extraDependencies: 完全な Gradle coordinate 例: ["com.amazon.android:aps-sdk:+"]
     */
    androidAdapters: [
      { name: "google-adapter", version: "+" },
      { name: "amazon-tam-adapter", extraDependencies: ["com.amazon.android:aps-sdk:+"] },
    ],

    /**
     * 上級者向け override。設定すると `networks` から生成される iOS 側の
     * pod を完全に置き換えます。
     *
     * 各エントリ: { name: string, version?: string }
     *   - name: CocoaPods の pod 名
     */
    iosPods: [
      { name: "AmazonPublisherServicesSDK" },
      { name: "AppLovinMediationGoogleAdapter" },
    ],

    /**
     * Android Maven リポジトリの上級者向け override。設定すると `networks`
     * から生成されるものを完全に置き換えます。別ホストに artifact がある
     * custom adapter や、private ミラーを経由したいときに便利です。
     *
     * 各 repo には `regex` を設定し、includeGroupByRegex でスコープを絞って
     * グローバルリゾルバを汚染しないようにしてください。
     */
    mavenRepositories: [
      { url: "https://example.com/maven", regex: "com\\\\.example.*" },
    ],

    /**
     * true にすると、useFrameworks: "static" 下での xcframework linking を
     * 修正する Podfile post_install hook をスキップします。自前の修正が
     * ある場合のみ true にしてください。デフォルトは false。
     */
    disableIOSFrameworkLinkingFix: false,

    /**
     * Info.plist に `SKAdNetworkItems` 配列として注入する SKAdNetwork 識別子。
     * Invertase の `react-native-google-mobile-ads` plugin のパラメータ形状を
     * 踏襲しており、あちらを触ったことがあれば馴染みやすいはず。
     *
     * 識別子の文字列のフラット配列を渡します。library は自動でデフォルトを
     * 適用しません — bundled リストが欲しい場合は明示的に import してください:
     *
     *   import { DEFAULT_SKADNETWORK_IDENTIFIERS } from "@fumitakayamada/expo-applovin-max";
     *
     *   plugins: [
     *     ["@fumitakayamada/expo-applovin-max", {
     *       skAdNetworkItems: DEFAULT_SKADNETWORK_IDENTIFIERS,
     *     }],
     *   ]
     *
     * bundled リストは AppLovin 公式 MAX docs 発のものです:
     * https://support.axon.ai/en/max/react-native/overview/skadnetwork
     *
     * 独自 ID で拡張したい場合はスプレッドでマージ:
     *   skAdNetworkItems: [...DEFAULT_SKADNETWORK_IDENTIFIERS, "abc.skadnetwork"]
     *
     * 丸ごと省略すれば SKAdNetwork 注入はスキップされます。
     */
    skAdNetworkItems: [
      "cstr6suwn9.skadnetwork",
      "4fzdc2evr5.skadnetwork",
      // ... etc
    ],
  },
]
```

全てのオプションは optional です。`networks` / `androidAdapters` / `iosPods` / `adReview` / `skAdNetworkItems` のどれも設定しなければ plugin は完全な no-op になります。

`networks` に `"google"` か `"googleAdManager"` が含まれる場合は `admobAppIdAndroid` と `admobAppIdIOS` の指定が必須です — 設定しないと起動時に `"Missing application ID"` でクラッシュします。

`adReview` を設定する場合は `adReview.androidReportKey` か `adReview.iosSetupScriptPath` のどちらか少なくとも 1 つは必要ですが、platform ごとに独立に選べます。

## Network registry

`networks` オプションは以下の short ID を受け付けます。各 ID が Android の Gradle 依存 + iOS の CocoaPods pod + (必要なら) Maven リポジトリにマップされます。plugin 側でまとめて配線するため、`app.config.ts` 側はすっきりしたままにできます。

| Network ID | 表示名 | Android | iOS |
| --- | --- | --- | --- |
| `amazon` | Amazon Publisher Services | ✅ + APS base SDK | ✅ + `AmazonPublisherServicesSDK` |
| `bidmachine` | BidMachine | ✅ | ✅ |
| `bigoads` | BIGO Ads | ✅ | ✅ |
| `chartboost` | Chartboost | ✅ | ✅ |
| `csj` | CSJ (Pangle China) | — | ✅ |
| `fyber` | DT Exchange (Fyber) | ✅ | ✅ |
| `googleAdManager` | Google Ad Manager | ✅ | ✅ |
| `google` | Google AdMob / Google Bidding | ✅ | ✅ |
| `hyprmx` | HyprMX | ✅ | ✅ |
| `inmobi` | InMobi | ✅ + Picasso + RecyclerView | ✅ |
| `ironsource` | ironSource | ✅ | ✅ |
| `liftoff` | Liftoff Monetize (Vungle) | ✅ | ✅ |
| `line` | LINE | ✅ | ✅ |
| `maio` | Maio | ✅ | ✅ |
| `meta` | Meta Audience Network (Facebook) | ✅ | ✅ |
| `mintegral` | Mintegral | ✅ | ✅ |
| `mobilefuse` | MobileFuse | ✅ | ✅ |
| `moloco` | Moloco | ✅ | ✅ |
| `mytarget` | myTarget | ✅ | ✅ |
| `ogury` | Ogury | ✅ | ✅ |
| `pangle` | Pangle (ByteDance) | ✅ | ✅ |
| `pubmatic` | PubMatic | ✅ | ✅ |
| `smaato` | Smaato | ✅ | ✅ |
| `tencent` | Tencent GDT | — | ✅ |
| `unity` | Unity Ads | ✅ | ✅ |
| `verve` | Verve | ✅ | ✅ |
| `vk` | VK Ad Network | ✅ | — |
| `yandex` | Yandex | ✅ | ✅ |
| `yso` | YSO Network | ✅ | ✅ |

出典: AppLovin MAX 公式の [Preparing mediated networks](https://developers.applovin.com/en/max/preparing-mediated-networks/) ドキュメント (Android / iOS 両方)。2026-04 時点のリストです。

この表にないネットワークが必要な場合は `androidAdapters` / `iosPods` / `mavenRepositories` の上級者向け override を使ってください。可能であれば issue か PR で registry への追加もお願いします。

> ⚠️ **バンドルサイズに気をつけてください。** 各ネットワークを有効化するとバイナリに ~1〜10 MB 追加されます。フルセットは 28 以上あり、APK / IPA が大幅に肥大化します。実際に配信しているネットワークだけ有効化してください。`networks` 配列は、必要最小限の subset に絞れるようにするために存在しています。

## plugin が何をしているか

### Mediation Adapters

`withAppLovinMediationAdapters` サブプラグインは **opt-in** です。`networks` 配列 (あるいはより advanced な `androidAdapters` / `iosPods` override) を渡すことで、統合したい mediated ad network を指定します。デフォルトでは、つまり `networks` とプラットフォーム別配列のいずれも未設定の場合、plugin は何も追加しません — SKAdNetwork や Ad Review だけ欲しいアプリのバンドルサイズを膨らませないためです。

有効化した各ネットワークについて、plugin は以下を処理します:

**Android** (そのネットワークが Android artifact を持っている場合)

- `app/build.gradle` に該当 adapter の `implementation("com.applovin.mediation:<artifact>:+")` を追加 + そのネットワークが必要とする追加 dependency (例: Amazon TAM はさらに `com.amazon.android:aps-sdk:+` を追加、InMobi は `com.squareup.picasso:picasso:2.8` と `androidx.recyclerview:recyclerview:1.1.0` を追加)。
- そのネットワークの Maven リポジトリを `settings.gradle` (`dependencyResolutionManagement`) とプロジェクト `build.gradle` (`allprojects`) の両方に追加。各 repo は `includeGroupByRegex` でスコープを絞り、Gradle がそのネットワーク専用の artifact だけを該当 repo から解決するようにしています。
- 複数 adapter (Pangle、Mintegral、ironSource など) が同じ `.so` ファイルを持ち込むことによる衝突を解消するため、`packagingOptions { pickFirst "lib/*/libc++_shared.so" ... }` を 1 回だけ追加します。
- `admobAppIdAndroid` が明示的に設定されている場合のみ、`AndroidManifest.xml` に `com.google.android.gms.ads.APPLICATION_ID` の meta-data エントリを追加します。

**iOS** (そのネットワークが iOS pod を持っている場合)

- Podfile のメインターゲットに各 adapter の `pod 'AppLovinMediationXxxAdapter'` を追加 + そのネットワークが必要とする追加 base pod (例: APS adapter のための `AmazonPublisherServicesSDK`、adapter よりも前に挿入して依存として参照可能にする)。
- `admobAppIdIOS` が明示的に設定されている場合のみ、`Info.plist` に `GADApplicationIdentifier` を追加します。
- Podfile の `post_install` hook を追加 (`disableIOSFrameworkLinkingFix: true` でスキップ可能) し、以下を実施:
  - `LD_RUNPATH_SEARCH_PATHS` と `FRAMEWORK_SEARCH_PATHS` のデフォルトを設定。
  - category ベースの mediation adapter のために `OTHER_LDFLAGS` に `-ObjC` が含まれることを保証。
  - bundle リソースを持つ adapter のために、bundle ターゲットの code signing を無効化。
  - `APSiOSSharedLib.framework/Info.plist` に `CFBundleShortVersionString` と `CFBundleVersion` を追加するパッチ(これらのキーが欠けている埋め込み framework は App Store Connect が拒否するため)。

### Ad Review (Quality Service) — optional

`withAppLovinQualityService` サブプラグイン (`adReview.apiKey` が設定されている場合のみ) の処理:

**Android**

- プロジェクト `build.gradle` の `buildscript { repositories }` に AppLovin の Maven repo を追加。
- `buildscript { dependencies }` に `classpath 'com.applovin.quality:AppLovinQualityServiceGradlePlugin:+'` を追加。
- `app/build.gradle` に `apply plugin: 'applovin-quality-service'` と `applovin { apiKey "..." }` を追記。

**iOS**

- prebuild 時に bundle 同梱の `AppLovinQualityServiceSetup-ios.rb` を `ios/` にコピー。
- `ios/` 以下で `ruby AppLovinQualityServiceSetup-ios.rb install` を実行し、`AppLovinQualityService.xcframework` をダウンロードして `app.xcodeproj` に追加 (Link Binary、Embed、自動更新のための Run Script build phase まで)。
- `xcode` パッケージを使って、xcframework が **Link Binary With Libraries** と **Embed Frameworks** build phase の両方に存在することを検証し、なければ追加します。このハードニングは、AppLovin のインストーラー単体では framework を embed しつつ link し忘れることが実測で観測されており、そうなると runtime で Ad Review がサイレントに動かなくなる (MAX Mediation Debugger で **Ad Review Version ❌** になる、ただし framework は `.app` バンドル内に存在する) ためです。

iOS のインストーラーは `eas-build-post-install` npm hook ではなく **`expo prebuild`** 中に走ります。EAS Build のフェーズ順序が `PREBUILD → INSTALL_PODS → POST_INSTALL_HOOK → RUN_FASTLANE` なので、prebuild で実行しておけば pod install と fastlane がプロジェクトを読む時点で xcodeproj の変更が確定しており、consumer プロジェクト側で `eas-build-post-install` の設定をする必要がありません。配線が 1 つ減ります。

**macOS のみ:** AppLovin インストーラーは埋め込まれた Mach-O バイナリを展開して実行します。非 macOS ホストでは plugin はスクリプトをコピーするだけで、installer 本体は警告付きでスキップされます。`expo prebuild --platform ios` そもそも macOS 以外ではサポートされていないため、実害はありません — 影響を受けるのは Windows / Linux で両プラットフォームの prebuild を回すローカル開発フローだけです。

### SKAdNetwork IDs

`withSKAdNetwork` サブプラグインは `skAdNetworkItems` オプションで受け取った `SKAdNetworkIdentifier` 文字列のフラット配列を、`Info.plist` の `SKAdNetworkItems` 配列にマージします。パラメータ形状は Invertase の `react-native-google-mobile-ads` (`sk_ad_network_items`) と合わせてあるので、あちらを触ったことがあれば馴染みやすいはずです。

この plugin はデフォルトを自動適用しません — 必ず配列を渡してください。AppLovin MAX と同梱している mediated network すべてをカバーする 266 以上の識別子の bundled リストを使うには、明示的に import します:

```ts
import { DEFAULT_SKADNETWORK_IDENTIFIERS } from "@fumitakayamada/expo-applovin-max";

// plugins 配列内で
skAdNetworkItems: DEFAULT_SKADNETWORK_IDENTIFIERS,
```

bundled リストは AppLovin 公式の MAX React Native docs が出典です:

> 📖 [AppLovin MAX SKAdNetwork docs](https://support.axon.ai/en/max/react-native/overview/skadnetwork)

カバー範囲は AppLovin、Amazon、BidMachine、DT Exchange (Fyber)、Google AdMob / Google Bidding、InMobi、ironSource、Liftoff Monetize (Vungle)、Meta Audience Network (Facebook)、Mintegral、Pangle (ByteDance)、Unity Ads と long tail の追加ネットワーク多数です。注入前に重複排除とソートが行われます。

一部の mediation network しか使っていない、あるいは library リリース後に AppLovin が新しいネットワークを追加した場合は、自前の配列を渡す (あるいは bundled リストを拡張する) だけで OK です:

```ts
// 完全に置き換える
skAdNetworkItems: ["cstr6suwn9.skadnetwork", "4fzdc2evr5.skadnetwork"]

// 拡張する
skAdNetworkItems: [
  ...DEFAULT_SKADNETWORK_IDENTIFIERS,
  "newNetwork123.skadnetwork",
]
```

plugin は `Info.plist` に既に存在する `SKAdNetworkItems` と突き合わせて重複排除するため、他の config plugin や手動エントリとも安全に共存できます。

## FAQ

### `ios/` や `android/` 以下に何かコミットする必要がある?

不要です。これは managed workflow 向けの plugin なので、`expo prebuild` (あるいは EAS Build) が毎回ゼロから生成する `ios/` / `android/` ディレクトリを書き換えるだけです。Git の working tree はクリーンなままです。

### なぜ iOS インストーラーは macOS が必要?

AppLovin がインストーラーを、Ruby スクリプトに埋め込まれた Mach-O バイナリとして出荷しているためです。この library 側でどうにかできる話ではありません。幸い EAS の iOS ビルドは macOS 上で走るので普通に動きます。

### `useFrameworks: "static"` でも動く?

動きます — むしろこの library がターゲットにしているのはまさにその組み合わせです。mediation adapter サブプラグインには、static framework が vendored framework (特に Amazon APS の DTBiOSSDK) で起こす xcframework linking 問題を解消する Podfile `post_install` 修正が含まれています。

`useFrameworks: "dynamic"` やデフォルトのままでも修正は一応適用されますが、その場合は事実上 no-op になるはずです。

### 機能のサブセットだけ使える?

はい。

- SKAdNetwork を無効化: `skAdNetwork: { disabled: true }`
- Ad Review を無効化: `adReview` ごと省略
- 一部の mediation adapter だけ使う: `androidAdapters: [...subset]`、`iosPods: [...subset]`
- adapter 依存を一切追加しない: `androidAdapters: []`、`iosPods: []`
- サブプラグイン (`withAppLovinMediationAdapters`、`withAppLovinQualityService`、`withSKAdNetwork`) は個別に export もしているので、高度な合成にも使えます。

### なぜ Expo 55 に縛られているの?

厳密には縛られていません。統合ロジックの core は SDK-agnostic ですが、回避対象になっている具体的な落とし穴 (static framework での xcframework linking、Podfile の regex ターゲティング、Gradle 8.x の `dependencyResolutionManagement`) は全て Expo SDK 55 の production ビルドで確認したものです。より古い SDK でも *動くはず*ですが未検証です。

### 既に `@crassaert/applovin-quality-service-expo-plugin` を使っているけど削除して良い?

はい — この library で完全に置き換えられます。さらに `@crassaert` の build.gradle regex が Expo 55 でマッチしなくなっている問題もこちらで解決済みです。`package.json` から `@crassaert/applovin-quality-service-expo-plugin` を削除し、`app.config.ts` の plugins 配列からエントリを外し、Ad Review 設定をこちらの plugin に移してください。

### Ad Review に Android と iOS で別々のキーが必要なのはなぜ?

AppLovin が Ad Review 向けに **platform ごとに別々の認証情報**を発行しているためです。どちらも同じ AppLovin アカウントに紐付きますが、目的と形が異なる別物の文字列です:

- **Android** は "Report Key" を使います。ダッシュボードからコピーして Gradle 設定の `applovin { apiKey "..." }` に貼り付けるタイプの文字列で、`applovin-quality-service` Gradle plugin がアプリのビルド時に AppLovin の Quality Service へ認証するのに使います。プレーンな 86 文字の文字列。
- **iOS** は AppLovin がアカウント単位で生成する Ruby セットアップスクリプト (`AppLovinQualityServiceSetup-ios.rb`) を使います。このスクリプトには JSON ブロックに埋め込まれた、Android 側とは**別の** 86 文字のキーが入っていて、インストール時に `api2.safedk.com` へ認証して Quality Service の xcframework をダウンロードするのに使われます。この文字列を config に貼り付けることはできません — キー込みのスクリプトがまるごと出荷される形式になっているからです。

実際に 2 つの異なる AppLovin アカウントから iOS スクリプトを diff してみると、唯一違うのは `APPLICATION_DATA` JSON ブロック内の `"api_key": "..."` 行だけで、スクリプトにすら `# Developer-specific ID` とコメントが付いています。残りのスクリプト全体 (埋め込まれた macOS インストーラーバイナリを含む) はアカウントをまたいで同一です。一方で Android の Report Key は AppLovin ダッシュボードが発行する別の文字列で、iOS のキーから派生したものではありません (逆もまた然り)。

なので、両プラットフォームで Ad Review を使いたいなら両方渡してください。Android のみ出荷するなら `androidReportKey` だけ、iOS のみなら `iosSetupScriptPath` だけでも OK です。ダミー値を入れる必要はありません。

### なぜ iOS セットアップスクリプトは自前で管理しないといけないの?

AppLovin ダッシュボードからダウンロードできる Ruby スクリプト `AppLovinQualityServiceSetup-ios.rb` には、ダウンロード時点で**アカウント固有の API key が埋め込まれています**。この library 側で 1 つだけスクリプトを同梱してしまうと、library の全ての利用者に「ダウンロードに使われた AppLovin アカウント」がリークします。セキュリティ的に完全アウトなので、各ユーザーが自前のコピーを持ち込む設計にしています。

スクリプトはシークレット扱いしてください:

- リポジトリが **private** ならそのままコミットしても OK です。
- リポジトリが **public** なら、`.gitignore` して CI シークレット + prebuild hook で供給するか、`git-crypt` / `git-secret` 等を使ってください。public リポジトリに平文でコミットしないでください。

スクリプトには、Xcode のビルド時に埋め込み SDK を最新化する自己更新機構が含まれているので、一度取得したあとは AppLovin がセットアップスクリプト自体のメジャーバージョンを上げない限り、再ダウンロードは基本的に不要です。

## トラブルシューティング

### 起動時に "Missing application ID" でクラッシュする

Google adapter (デフォルトで有効) を有効にしているのに `admobAppIdAndroid` / `admobAppIdIOS` を設定していません。どちらかを設定するか、adapter リストから `google-adapter` / `AppLovinMediationGoogleAdapter` を外してください。

### MAX Mediation Debugger が "Ad Review Version ❌" と表示する

AppLovin インストーラーが `AppLovinQualityService.xcframework` を embed したものの link し忘れている可能性があります。この library の `ensureXcframeworkLinked` ステップで修正されるはずですが、それでも直らない場合は:

1. EAS Build のログの `PREBUILD` フェーズで `[AppLovinQualityService]` で始まる行を確認してください。最後に `linked=true, embedded=true` と出ているはずです。
2. インストーラーが `Installer exited with error` で失敗していた場合、`scripts/AppLovinQualityServiceSetup-ios.rb` が正常に走ったか確認してください。よくある原因は `api2.safedk.com` からの pod ダウンロード時のネットワーク問題です。
3. `adReview.apiKey` が正しいか確認してください。キーが間違っていても prebuild はサイレントに成功しますが、runtime で Ad Review は無効化されます。

### Android Gradle: "Could not find com.applovin.quality:AppLovinQualityServiceGradlePlugin"

AppLovin の Maven repo が `buildscript { repositories }` に追加されていません。この plugin を使っている限り起こらないはずなので、`android/build.gradle` を添付して issue を立ててください。

### 特定の adapter で iOS の Pod install が失敗する

個別の adapter には時々一時的な問題が起こります。以下を試してみてください:

1. adapter を特定バージョンにピン: `iosPods: [{ name: "AppLovinMediationXxxAdapter", version: "1.2.3" }, ...]`
2. 一時的に外す: `iosPods: [...allPodsExceptXxx]`
3. ローカルで `pod repo update` を実行 (EAS Build は自動で実行します)。

### `useFrameworks: "static"` + Firebase の組み合わせ

この plugin と `@react-native-firebase/app` を `useFrameworks: "static"` で組み合わせる場合は、`expo-modules-core@55.0.22+` を使うようにしてください — それより前のバージョンには `#import <React/React-Core-umbrella.h>` が壊れていて static framework で失敗する既知問題があります。この問題はこの library の範囲外で、AppLovin 統合とは別問題です。

## 互換性

| パッケージバージョン | Expo SDK | React Native | New Architecture | 備考 |
| --- | --- | --- | --- | --- |
| 0.1.x | 55 (確認済み) | 0.83.x | ✅ 必須 (Expo 55 が必須化) | メインターゲット。production で稼働中。 |
| 0.1.x | 54 | 0.76.x | ✅ optional | 動作する見込みだが未検証。問題があれば issue を上げてください。 |

`peerDependencies` は `expo >= 54.0.0` を要求していますが、実動作確認は SDK 55 に限られています。より古い SDK を使っていて公式サポートが欲しい場合は issue (あるいは PR) を出してください。

### New Architecture

この plugin は Expo SDK 55 が必須化した New Architecture に対して**透過的**です。prebuild 時にビルド設定ファイル (`AndroidManifest.xml`、`Info.plist`、`Podfile`、`build.gradle`) を書き換えるだけで、React Native の runtime コードを追加・変更していません。New Architecture の interop layer (Fabric / TurboModules / codegen) が壊せるものが何もない、ということです。

より古い SDK からアップグレードする場合に気をつけるのは、使っている AppLovin MAX React Native SDK (`react-native-applovin-max` か他のパッケージ) 自体が NewArch 対応かどうかだけです。そこはこの plugin の範囲外です。

### Config Plugin 設計メモ

この plugin は Expo の推奨に従い、可能な限り `withDangerousMod` よりも **safe mod** (構造を理解した AST ベースの変更) を優先しています。具体的には:

| 対象 native ファイル | 使用している mod | 種類 |
| --- | --- | --- |
| `Info.plist` (SKAdNetwork、AdMob ID) | `withInfoPlist` | safe |
| `AndroidManifest.xml` (AdMob ID) | `withAndroidManifest` | safe |
| `android/build.gradle` (Maven リポジトリ、classpath) | `withProjectBuildGradle` | safe (string) |
| `android/app/build.gradle` (adapter 依存、plugin apply) | `withAppBuildGradle` | safe (string) |
| `android/settings.gradle` (`dependencyResolutionManagement` の Maven リポジトリ) | `withSettingsGradle` | safe (string) |
| `ios/Podfile` (mediation pod、post_install) | `withPodfile` | `withDangerousMod` を safe wrap |
| `ios/Podfile` + AppLovin Ruby スクリプト実行 | `withDangerousMod` | dangerous |
| `ios/<App>.xcodeproj/project.pbxproj` (Ad Review xcframework の link 確認) | `withXcodeProject` | safe |

`withDangerousMod` を使っているのは AppLovin Quality Service インストーラー (`ruby AppLovinQualityServiceSetup-ios.rb install`) を prebuild 中に呼び出す部分だけです。Podfile mod の一部として外部スクリプトを構造的に実行する API を Expo が提供していないからこその選択です。なおそこでも、変更そのものは Expo の通常の Podfile + Xcode project ハンドリングを経由しており、`withDangerousMod` はあくまで entry point にすぎません。

## Contributing

Issue と PR は <https://github.com/FumitakaYamada/expo-applovin-max> で受け付けています。バグ報告の際は以下を添えてもらえると助かります:

- `app.config.ts` の plugin エントリ (API key は伏せ字でお願いします)
- Expo SDK バージョンと `expo --version` の出力
- 該当する EAS Build ログのフェーズ (大抵 `PREBUILD` か `INSTALL_PODS`)
- 該当する場合は `useFrameworks` の設定

## スポンサー

この plugin が AppLovin MAX の Expo 統合で時間の節約になったら、継続的なメンテナンスのためのサポートをご検討ください:

[![Sponsor FumitakaYamada](https://img.shields.io/github/sponsors/FumitakaYamada?logo=GitHub&label=Sponsor%20%40FumitakaYamada&color=ea4aaa&style=for-the-badge)](https://github.com/sponsors/FumitakaYamada)

## ライセンス

MIT © [Fumitaka Yamada](https://github.com/FumitakaYamada)

AppLovin、MAX、AppLovin Quality Service は AppLovin Corporation の商標です。この library は AppLovin と提携・承認・スポンサー関係にはありません。公式ドキュメントが記載している統合手順を自動化しているだけです。

# DATA PRIVACY — Mobilistica Mobile Commerce Audit

出典: docs/specs/docs-suite-spec.md（DATA_PRIVACY項目）・docs/specs/web-wp-spec.md（GA4イベント仕様・WPプロキシキャッシュ）・docs/specs/core-engine-spec.md（データ取得範囲）。

## 1. 設計方針: 個人情報を取得しない

本プロダクトは診断機能の提供に個人情報を必要としない設計とする。

- **メール入力なし**: Web診断UIはURL入力のみで診断を開始でき、メールアドレス等の連絡先入力を強制しない（web-wp-spec.md「メール入力なし・個人情報なし」）
- 診断対象はユーザーが入力したURL（＝多くの場合、ユーザー自身が運営するECサイトの公開URL）のみであり、診断対象サイトの訪問者個人を特定する情報は扱わない
- ログイン・購入操作を行わないため、認証情報・決済情報を扱う経路自体が存在しない（PROJECT_BRIEF.md 安全ルール）

## 2. 診断結果の保存

- 診断結果（AuditResult JSON・HTML/MD/CSVレポート）は**ユーザー自身のローカル環境またはブラウザ内**にのみ保存される
- Web診断UIはクライアントサイド実行のため、レポートDL（HTML=Blob保存、JSON）はブラウザ内で完結し、Mobilistica運営側のサーバーに診断結果が送信・保存されることはない
- 結果共有機能はURLの `#u=<encodeURIComponent(url)>` フラグメントで再現する方式であり、診断結果そのものをサーバーに保存する仕組みではない（web-wp-spec.md）
- WPプラグイン経由（プロキシ有効時）の例外は「4. WPプロキシのキャッシュ」を参照

## 3. GA4計測とプライバシー

Web診断UIは以下のGA4イベントを送出する（`window.dataLayer?.push()`。GA4未導入サイトでも動作するようdataLayer未定義ガードを実装）。

- 送出イベント: `audit_form_view` / `audit_started` / `audit_completed` / `audit_failed` / `report_downloaded` / `github_clicked` / `skill_install_clicked` / `cli_install_clicked` / `case_study_clicked` / `consultation_clicked` / `audit_shared`（計11種。詳細な発火条件・パラメータはMEASUREMENT_PLAN.mdに定義）

**プライバシー上の重要方針**:

- **診断対象URLの全体はGA4に送らない**
- 送出するのはドメインの **SHA-256ハッシュ値の先頭12桁のみ**（`site_hash` パラメータ）
- これにより「どのドメインが診断されたか」の集計は可能だが、URLパス・クエリパラメータ等（個人情報や非公開ページ情報を含み得る）はGA4に一切送信されない
- 実装コード上でもこの方針をコメントで明記する（web-wp-spec.md「実装はコメントで方針明記」）

## 4. WPプロキシのキャッシュとIP取り扱い

WordPressプラグインのプロキシ機能（`POST /wp-json/mobilistica-audit/v1/psi`）が有効な場合のみ、以下のサーバー側処理が発生する。

| 項目 | 方針 |
|---|---|
| 結果キャッシュ | URL+strategyのハッシュをキーに **10分間のtransient** としてWordPress DBに保存。個人情報は含まない（診断結果のPSIレスポンス相当のみ） |
| rate limit用IP | **生IPアドレスは保存しない**。`wp_hash(ip+日付salt)` によるハッシュ値のみをtransientキーとして使用し、10回/10分の制限判定に用いる |
| キャッシュ削除 | 管理画面から手動でキャッシュ全削除が可能（nonce+capability保護） |
| アンインストール時 | `uninstall.php` でtransient/optionsを全削除する方針（readme.txtに明記） |

IPアドレスを「生値」として保存しないことは、rate limit機能の実効性（同一IPからの短時間大量アクセスを検知する）と、個人を特定し得るデータの非保存という2つの要件を両立させるための設計判断である。

## 5. 収集データの範囲（何を取得し、何を取得しないか）

| データ種別 | 取得するか | 備考 |
|---|---|---|
| 診断対象URLの公開HTML・HTTPヘッダー | 取得する | 診断目的のみ。フォールバック時のみ（core-engine-spec.md収集連鎖） |
| PSI APIのレスポンス（CWV等の技術指標） | 取得する | Google PageSpeed Insights APIから。診断対象サイトの技術指標であり、訪問者個人のデータではない |
| 診断対象サイトの訪問者の行動データ | 取得しない | 本プロダクトのスコープ外。Clarity/GA4等の行動分析は診断対象サイト運営者が別途自サイトに導入するものであり、本プロダクトはそれを収集・仲介しない |
| ユーザー（診断実行者）のメールアドレス等連絡先 | 取得しない | 入力フォーム自体が存在しない |
| ユーザー（診断実行者）のIPアドレス（生値） | 保存しない | WPプロキシのrate limitはハッシュ化した値のみ保存 |

## 6. 非対象・将来課題

- 本プロダクト自体（mobilistica.com）へのGA4導入は現時点で未実施であり（CURRENT_STATE_AUDIT.md「GA4: 未実装」）、Web診断UIのGA4イベント送出は「GA4が導入されているサイトに設置された場合に動作する」設計である。導入自体はMEASUREMENT_PLAN.mdの前提条件として扱う
- Cookie・ローカルストレージを用いたユーザートラッキングは本設計に含まれない（結果共有はURLフラグメント方式のため、サーバー側の状態保存を必要としない）

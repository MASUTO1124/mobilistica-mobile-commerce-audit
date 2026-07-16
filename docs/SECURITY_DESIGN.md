# SECURITY DESIGN — Mobilistica Mobile Commerce Audit

出典: docs/specs/core-engine-spec.md（security/urlguard.mjs仕様）・docs/specs/web-wp-spec.md（WPプラグインREST仕様）・docs/PROJECT_BRIEF.md（安全ルール・APIキー方針）。

## 1. SSRF脅威モデル

診断対象URLを外部から取得する処理（HTML簡易診断・PSI代理呼び出し）はSSRF（サーバーサイドリクエストフォージェリ）の攻撃面になり得る。提供形態ごとにリスク面を切り分ける。

| 形態 | サーバー取得の有無 | リスク面 | 対策 |
|---|---|---|---|
| Web診断UI | なし（クライアントサイド実行） | サーバー側SSRF面は存在しない。ブラウザ自身がPSI APIを直接fetchする | 入力URLを送信前に `validateUrlSyntax` で検証（防御多層＋PSIクォータ濫用防止） |
| CLI | あり（ローカル実行者自身の端末） | 実行者自身のマシンからの通信。実行者本人が対象URLを指定するため、第三者による悪用面は限定的だが、対象URLが内部リダイレクトで意図しない宛先へ誘導される可能性は残る | `collectors/html.mjs` で `assertPublicTarget`（DNS検証）を全ホップで実行 |
| WPプラグイン（プロキシ） | あり（WordPressサーバーがPSIへ代理リクエスト） | 外部への実質的なアクセス先は **googleapis.com限定**。任意サイトへのプロキシではない | class-rest.phpでURLをurlguard.mjs相当のPHP版でvalidate後、PSI API（googleapis.com）以外へは送信しない設計。nonce検証・rate limitを併用 |

Web版はサーバーが対象URLを取得しないため、古典的なSSRF（サーバーが攻撃者指定のURLへリクエストし内部ネットワークに到達する）のリスクがそもそも存在しない。CLIはローカル実行者自身の環境で完結するため、悪意ある第三者が任意ユーザーのCLIを遠隔操作できる経路がない限りSSRFの実害は限定的だが、`collectors/html.mjs` は防御的に `assertPublicTarget` を必須とする。WPプラグインのプロキシはアクセス先をgoogleapis.comに固定することで、任意内部アドレスへの代理アクセス経路自体を排除する。

## 2. urlguard規則（全列挙）

`security/urlguard.mjs`（core-engine-spec.md準拠。純関数部分はブラウザ互換、DNS検証部分はNode専用）。

### 2-1. validateUrlSyntax（純関数・ブラウザ互換・全形態で実行可能）

- スキームは `http` / `https` のみ許可
- userinfo（`http://user:pass@host/` 形式）は禁止
- ポートは `80` / `443` / `8080` / `8443` のみ許可
- ホスト名が `localhost` / `.local` / `.internal` を含む場合は拒否
- IPリテラルは公開範囲のみ許可（下記2-2の拒否範囲に該当しないもの）

### 2-2. assertPublicTarget（Node専用・DNS検証。CLI・collectors/html.mjsで実行）

`dns.lookup(all: true)` で名前解決された**全アドレス**を検証する。以下を拒否:

| 拒否範囲 | 内容 |
|---|---|
| `127/8` | ループバック |
| `10/8` | プライベート |
| `172.16/12` | プライベート |
| `192.168/16` | プライベート |
| `169.254/16` | リンクローカル（**メタデータエンドポイント `169.254.169.254` を含む**） |
| `0/8` | 予約 |
| `100.64/10` | キャリアグレードNAT |
| `::1` | IPv6ループバック |
| `fc00::/7` | IPv6ユニークローカル |
| `fe80::/10` | IPv6リンクローカル |
| `::ffff:プライベートv4` | IPv4射影アドレス経由のプライベート範囲迂回 |

### 2-3. fetchHtml（collectors/html.mjs・Node専用）

- `redirect: 'manual'` で最大5ホップまで追跡
- **各ホップでvalidateUrlSyntax + assertPublicTargetを再実行**（初回検証だけでなく、リダイレクト先ごとに再検証することで、外部リダイレクトを経由した内部アドレスへの迂回を防ぐ）
- `maxBytes` 既定5MB（超過時は打ち切り、`huge_response` としてlimitationsに記録）
- `timeout` 既定15秒
- `Content-Type` が `text/html` 以外の場合はヘッダー情報のみ取得しボディは扱わない

## 3. DNS Rebinding 残余リスクと緩和

- `assertPublicTarget` はリクエスト**直前**にDNS再解決を行う設計だが、検証（DNS解決）と実際の接続（fetch実行）の間には不可避のタイムラグ（TTL間隙）が存在する
- この間にDNS応答が悪意ある形で書き換えられた場合（DNS rebinding攻撃）、検証をすり抜けて内部アドレスへ接続される可能性が理論上残る
- **この残余リスクは許容する**設計判断とする（完全な対策にはコネクションプールでの接続先IP固定等の追加実装が必要だが、Phase1のスコープ外）。将来的な緩和策の候補としては、fetch実行時に解決済みIPを明示的に指定する（Node `fetch` + `dns.lookup` 結果をピン留め）方式が考えられるが、Phase1では実装しない
- 緩和の主眼は「各リダイレクトホップでの再検証」（2-3参照）に置き、単発リクエストでの再解決タイミングの脆弱性は既知の残余リスクとして本ドキュメントに明記する

## 4. APIキー取り扱い

- 対象キー: `PAGESPEED_API_KEY` / `PSI_API_KEY`（PSI API用）、`MOBILISTICA_PSI_API_KEY`（WPプラグイン用）
- 保管場所: 環境変数、またはWordPress側は `wp-config.php` の定数 `MOBILISTICA_PSI_API_KEY`
- **キーが未定義でも動作を止めない**: WPプラグインはキー未定義ならプロキシを無効化し、クライアント直呼び（キーレス低クォータ動作）へ自動フォールバックする。coreの `runAudit` もキー未指定時はキーレス動作にフォールバックする
- **ログ出力禁止**: APIキーの値をログ・エラーメッセージ・スタックトレースに出力しない。CLIはエラースタックを `--log-level debug` 時のみ表示するが、認証情報・APIキーは出力対象から除外する（cli-spec.md準拠）
- **クライアント非配布**: WPプラグインはキー自体をフロントエンドへ渡さない。`wp_localize_script` で渡すのは「プロキシが有効か否か」のフラグのみで、キーの値そのものは含めない
- **ハードコード禁止**: ソースコード・設定ファイル・HTML出力へのAPIキーのハードコードを禁止する（PROJECT_BRIEF.md）

## 5. WordPressプラグインのセキュリティ

`wordpress-plugin/mobilistica-mobile-audit/`（web-wp-spec.md準拠）。

| 項目 | 対策 |
|---|---|
| nonce | REST エンドポイント `POST /wp-json/mobilistica-audit/v1/psi` は `wp_rest` nonceを検証 |
| 入力検証 | `esc_url_raw` に加え、urlguard.mjsと同じ規則のPHP版で独自validate（http/https限定、localhost/プライベートIPリテラルを拒否） |
| rate limit | transientでIPハッシュ（`wp_hash(ip+日付salt)`。生IPは保存しない）あたり **10回/10分**。超過時はHTTP 429を返す |
| IPハッシュ化 | rate limit判定に生IPを直接使わず、日付saltを含めたハッシュ値のみ保存する（DATA_PRIVACY.md参照） |
| キャッシュ | 結果はURL+strategyのハッシュをキーに **10分transient** キャッシュ（PSI API呼び出し回数の抑制） |
| capability | 診断実行エンドポイントは公開（権限不要・rate limit必須）。管理画面（設定ページ・実行回数表示・キャッシュ全削除ボタン）は `manage_options` 権限が必要 |
| 出力エスケープ | 全出力に `esc_html` / `esc_attr` / `esc_url` を適用。i18n関数を使用 |
| 直接アクセスガード | 各PHPファイルに `ABSPATH` チェックを実装 |
| アンインストール | `uninstall.php` でtransient/optionsを全削除する方針をreadme.txtに明記 |

## 6. レポートHTMLのXSS対策

- `reports/html.mjs` は自己完結HTML（外部依存なし・インラインCSS・JSなしor最小・外部リクエスト0）を出力する
- **診断対象サイトから取得した文字列（title・meta description・H1見出し・alt属性・schema値等）はすべてユーザー由来（＝信頼できない）データとして扱い、HTML出力前に必ずエスケープする**（診断対象サイト自体に悪意あるスクリプトが埋め込まれていた場合に、レポートHTML上でそれが実行されることを防ぐ）
- CSV出力（`reports/csv.mjs`）もExcel等での数式インジェクション（`=`, `+`, `-`, `@` で始まるセル値）に留意し、ユーザー由来文字列をそのまま数式として解釈され得る形で出力しないことが望ましい（実装詳細は core-engine-spec.md のreports仕様に従う）
- `claude_instructions.mjs` の出力についても、診断対象サイトから取得した文字列を「確認すべき場所」の説明文にそのまま埋め込む場合はエスケープ・サニタイズの対象とする

## 7. スコープ外・非対象

- ログイン操作・購入操作・本番注文の自動化は行わない（PROJECT_BRIEF.md 安全ルール）ため、認証情報を扱う攻撃面はそもそも設計に含まれない
- 外部サイトへの実診断はMobilistica自身のURL2件＋少数の公開URLのみとし、高頻度・大量アクセスは行わない

=== Mobilistica Mobile Audit ===
Contributors: mobilistica
Tags: performance, pagespeed, core web vitals, ecommerce, mobile
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 0.1.0
License: MIT
License URI: https://opensource.org/licenses/MIT

モバイルECサイト無料診断ウィジェット。URLを入力すると、モバイル表示速度・Core Web Vitals・購入導線を検査し、売上影響順の改善優先度を表示します。

== Description ==

ショートコード `[mobilistica_mobile_audit]` を固定ページ・投稿に貼るだけで、訪問者向けの無料診断フォームを設置できます。

* 診断はPageSpeed Insights APIと公開情報のみを使用します
* 訪問者のメールアドレス等の個人情報は取得しません
* 診断結果は訪問者のブラウザ内で生成され、サーバーに保存されません
* オープンソース: https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit

= APIキー（任意） =

wp-config.php に以下を追加すると、サーバー側プロキシ（クォータ拡大・安定化）が有効になります。

`define( 'MOBILISTICA_PSI_API_KEY', 'あなたのキー' );`

キーはデータベースに保存されず、HTML・ログにも出力されません。未設定でも訪問者のブラウザから直接キーレス診断されます。

= セキュリティ =

* RESTエンドポイントはnonce検証・レート制限（10回/10分）・入力URL検証つき
* サーバーの外部通信先はgoogleapis.comのみ（入力URL自体をサーバーが取得することはありません）
* IPアドレスの生値は保存しません（日替わりソルト付きハッシュのみ）

== Installation ==

1. プラグインZIPを「プラグイン > 新規追加 > アップロード」からインストール
2. 有効化後、固定ページに `[mobilistica_mobile_audit]` を挿入

== Uninstall ==

アンインストール時、本プラグインが作成したキャッシュ（transient）は全て自動削除されます。投稿・設定には影響しません。

== Changelog ==

= 0.1.0 =
* 初版

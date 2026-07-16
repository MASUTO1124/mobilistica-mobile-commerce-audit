<?php
/**
 * 管理画面（ツール > モバイルEC診断）: 日次実行回数の確認とキャッシュ削除のみ。
 * APIキーの入力欄は設けない（wp-config.php定数 or 環境変数のみ＝DBにキーを保存しない方針）。
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MMA_Settings {

	public static function register_menu() {
		add_management_page(
			__( 'モバイルEC診断', 'mobilistica-mobile-audit' ),
			__( 'モバイルEC診断', 'mobilistica-mobile-audit' ),
			'manage_options',
			'mma-settings',
			array( __CLASS__, 'render' )
		);
	}

	public static function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( '権限がありません。', 'mobilistica-mobile-audit' ) );
		}

		if ( isset( $_POST['mma_purge'] ) && check_admin_referer( 'mma_purge_cache' ) ) {
			MMA_RateLimit::purge_all();
			echo '<div class="notice notice-success"><p>' . esc_html__( 'キャッシュとカウンタを削除しました。', 'mobilistica-mobile-audit' ) . '</p></div>';
		}

		$key_set = function_exists( 'mma_get_api_key' ) && mma_get_api_key();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'モバイルEC診断', 'mobilistica-mobile-audit' ); ?></h1>
			<table class="widefat striped" style="max-width:640px">
				<tbody>
				<tr>
					<td><?php esc_html_e( '本日のサーバー側診断実行回数', 'mobilistica-mobile-audit' ); ?></td>
					<td><strong><?php echo esc_html( MMA_RateLimit::today_runs() ); ?></strong></td>
				</tr>
				<tr>
					<td><?php esc_html_e( 'PageSpeed APIキー', 'mobilistica-mobile-audit' ); ?></td>
					<td>
						<?php if ( $key_set ) : ?>
							<span style="color:green">✔ <?php esc_html_e( '設定済み（wp-config.php / 環境変数）', 'mobilistica-mobile-audit' ); ?></span>
						<?php else : ?>
							<span style="color:#b45309">－ <?php esc_html_e( '未設定（訪問者のブラウザから直接キーレス診断されます）', 'mobilistica-mobile-audit' ); ?></span>
							<p class="description"><code>define( 'MOBILISTICA_PSI_API_KEY', '...' );</code> <?php esc_html_e( 'をwp-config.phpに追加するとサーバー側プロキシが有効になります。', 'mobilistica-mobile-audit' ); ?></p>
						<?php endif; ?>
					</td>
				</tr>
				<tr>
					<td><?php esc_html_e( 'ショートコード', 'mobilistica-mobile-audit' ); ?></td>
					<td><code>[mobilistica_mobile_audit]</code></td>
				</tr>
				</tbody>
			</table>
			<form method="post" style="margin-top:16px">
				<?php wp_nonce_field( 'mma_purge_cache' ); ?>
				<button type="submit" name="mma_purge" value="1" class="button">
					<?php esc_html_e( '診断キャッシュ・実行カウンタを削除', 'mobilistica-mobile-audit' ); ?>
				</button>
			</form>
		</div>
		<?php
	}
}

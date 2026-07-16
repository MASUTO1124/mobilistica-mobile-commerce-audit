<?php
/**
 * Plugin Name: Mobilistica Mobile Audit
 * Plugin URI:  https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit
 * Description: モバイルECサイト無料診断ウィジェット。ショートコード [mobilistica_mobile_audit] で診断フォームを表示します。
 * Version:     0.1.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author:      Mobilistica
 * Author URI:  https://www.mobilistica.com/
 * License:     MIT
 * Text Domain: mobilistica-mobile-audit
 * Domain Path: /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MMA_VERSION', '0.1.0' );
define( 'MMA_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MMA_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once MMA_PLUGIN_DIR . 'includes/class-ratelimit.php';
require_once MMA_PLUGIN_DIR . 'includes/class-rest.php';
require_once MMA_PLUGIN_DIR . 'includes/class-settings.php';

/**
 * APIキー取得。wp-config.php の定数 or 環境変数のみ。DB(options)には保存しない。
 * キーが無ければ null（プロキシ無効・クライアント直呼びフォールバック）。
 */
function mma_get_api_key() {
	if ( defined( 'MOBILISTICA_PSI_API_KEY' ) && MOBILISTICA_PSI_API_KEY ) {
		return MOBILISTICA_PSI_API_KEY;
	}
	$env = getenv( 'MOBILISTICA_PSI_API_KEY' );
	return $env ? $env : null;
}

add_action( 'init', function () {
	load_plugin_textdomain( 'mobilistica-mobile-audit', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	add_shortcode( 'mobilistica_mobile_audit', 'mma_render_shortcode' );
} );

add_action( 'rest_api_init', array( 'MMA_Rest', 'register_routes' ) );
add_action( 'admin_menu', array( 'MMA_Settings', 'register_menu' ) );

/**
 * ショートコード出力。アセットはESM(type=module)でenqueue。
 */
function mma_render_shortcode() {
	wp_enqueue_style( 'mma-styles', MMA_PLUGIN_URL . 'assets/styles.css', array(), MMA_VERSION );
	wp_enqueue_script_module( 'mma-app', MMA_PLUGIN_URL . 'assets/app.mjs', array(), MMA_VERSION );

	// プロキシはキー設定時のみ有効。キー自体は絶対にフロントへ渡さない。
	$config = array(
		'proxyUrl' => mma_get_api_key() ? esc_url_raw( rest_url( 'mobilistica-audit/v1/psi' ) ) : null,
		'nonce'    => wp_create_nonce( 'wp_rest' ),
	);
	$inline = 'window.MOBILISTICA_AUDIT_CONFIG = ' . wp_json_encode( $config ) . ';';
	wp_register_script( 'mma-config', '', array(), MMA_VERSION, false );
	wp_enqueue_script( 'mma-config' );
	wp_add_inline_script( 'mma-config', $inline );

	ob_start();
	include MMA_PLUGIN_DIR . 'templates/form.php';
	return ob_get_clean();
}

<?php
/**
 * アンインストール時: 本プラグインが作成した全transient（キャッシュ・レート制限・カウンタ）を削除する。
 * ユーザーコンテンツ・投稿・設定への影響なし（本プラグインはoptionsに恒久データを保存しない）。
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;
$like  = $wpdb->esc_like( '_transient_mma_' ) . '%';
$like2 = $wpdb->esc_like( '_transient_timeout_mma_' ) . '%';
$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like ) );  // phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like2 ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery

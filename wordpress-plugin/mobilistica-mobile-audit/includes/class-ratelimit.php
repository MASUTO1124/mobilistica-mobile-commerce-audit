<?php
/**
 * レート制限。IPの生値は保存せず、日替わりソルト付きハッシュのみをtransientキーに使う。
 * 既定: 1クライアントあたり10回/10分。日次実行回数カウンタも保持（管理画面表示用）。
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MMA_RateLimit {

	const MAX_PER_WINDOW = 10;
	const WINDOW_SECONDS = 600;

	/** 生IPを保存しないためのハッシュ（日替わりソルトで長期追跡も不可にする） */
	private static function client_hash() {
		$ip   = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
		$salt = gmdate( 'Y-m-d' ) . wp_salt( 'nonce' );
		return substr( hash( 'sha256', $ip . $salt ), 0, 16 );
	}

	public static function allow() {
		$key   = 'mma_rl_' . self::client_hash();
		$count = (int) get_transient( $key );
		if ( $count >= self::MAX_PER_WINDOW ) {
			return false;
		}
		set_transient( $key, $count + 1, self::WINDOW_SECONDS );
		return true;
	}

	/** 日次実行回数（管理画面の統計用。個人特定情報は含まない） */
	public static function count_run() {
		$key = 'mma_runs_' . gmdate( 'Ymd' );
		set_transient( $key, (int) get_transient( $key ) + 1, DAY_IN_SECONDS * 2 );
	}

	public static function today_runs() {
		return (int) get_transient( 'mma_runs_' . gmdate( 'Ymd' ) );
	}

	/** キャッシュ・カウンタの全削除（管理画面から呼ぶ） */
	public static function purge_all() {
		global $wpdb;
		// transientはプレフィックスで一括削除
		$like = $wpdb->esc_like( '_transient_mma_' ) . '%';
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$like2 = $wpdb->esc_like( '_transient_timeout_mma_' ) . '%';
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like2 ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	}
}

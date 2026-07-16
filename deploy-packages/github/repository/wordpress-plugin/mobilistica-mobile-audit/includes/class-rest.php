<?php
/**
 * REST: POST /wp-json/mobilistica-audit/v1/psi
 * サーバー保管キーでPageSpeed Insights APIを代理呼び出しする（外部通信はgoogleapis.comのみ）。
 * 対象URL自体をこのサーバーが取得することはない＝サーバー側SSRF面は存在しないが、
 * 濫用防止のため入力URLの検証・レート制限・キャッシュを必須とする。
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MMA_Rest {

	const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
	const CACHE_TTL    = 600; // 同一URLの短時間連続実行を10分キャッシュ

	public static function register_routes() {
		register_rest_route(
			'mobilistica-audit/v1',
			'/psi',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => array( __CLASS__, 'permission' ),
				'args'                => array(
					'url'      => array( 'required' => true, 'type' => 'string' ),
					'strategy' => array( 'required' => false, 'type' => 'string', 'default' => 'mobile' ),
				),
			)
		);
	}

	/** 公開エンドポイント（診断は誰でも可）だがnonce必須＝自サイトのフォーム経由に限定。 */
	public static function permission( $request ) {
		$nonce = $request->get_header( 'X-WP-Nonce' );
		if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new WP_Error( 'mma_bad_nonce', __( '不正なリクエストです。ページを再読み込みしてください。', 'mobilistica-mobile-audit' ), array( 'status' => 403 ) );
		}
		return true;
	}

	/**
	 * URL検証。src/mobilistica_audit/security/urlguard.mjs と同一規則のPHP版。
	 * http/httpsのみ・userinfo禁止・ポート80/443/8080/8443のみ・localhost/プライベートIPリテラル拒否。
	 */
	public static function validate_target_url( $raw ) {
		$url = esc_url_raw( trim( (string) $raw ) );
		$p   = wp_parse_url( $url );
		if ( ! $p || empty( $p['scheme'] ) || empty( $p['host'] ) ) {
			return false;
		}
		if ( ! in_array( strtolower( $p['scheme'] ), array( 'http', 'https' ), true ) ) {
			return false;
		}
		if ( isset( $p['user'] ) || isset( $p['pass'] ) ) {
			return false;
		}
		if ( isset( $p['port'] ) && ! in_array( (int) $p['port'], array( 80, 443, 8080, 8443 ), true ) ) {
			return false;
		}
		$host = strtolower( $p['host'] );
		if ( 'localhost' === $host || preg_match( '/\.(local|internal)$/', $host ) ) {
			return false;
		}
		// IPリテラルはプライベート/予約帯を拒否（PSI側も拒否するが多層防御）
		$ip = trim( $host, '[]' );
		if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
			if ( ! filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
				return false;
			}
		}
		return $url;
	}

	public static function handle( $request ) {
		$url = self::validate_target_url( $request->get_param( 'url' ) );
		if ( ! $url ) {
			return new WP_Error( 'mma_bad_url', __( '診断できないURLです。https:// から始まる公開URLを指定してください。', 'mobilistica-mobile-audit' ), array( 'status' => 400 ) );
		}
		$strategy = 'desktop' === $request->get_param( 'strategy' ) ? 'desktop' : 'mobile';

		if ( ! MMA_RateLimit::allow() ) {
			return new WP_Error( 'mma_rate_limited', __( 'アクセスが集中しています。10分ほど待ってから再実行してください。', 'mobilistica-mobile-audit' ), array( 'status' => 429 ) );
		}

		$cache_key = 'mma_psi_' . md5( $url . '|' . $strategy );
		$cached    = get_transient( $cache_key );
		if ( false !== $cached ) {
			return rest_ensure_response( json_decode( $cached, true ) );
		}

		$api_key = mma_get_api_key();
		if ( ! $api_key ) {
			return new WP_Error( 'mma_no_key', __( 'サーバー側診断は現在利用できません。', 'mobilistica-mobile-audit' ), array( 'status' => 503 ) );
		}

		$psi_url = add_query_arg(
			array(
				'url'      => rawurlencode( $url ),
				'strategy' => $strategy,
				'category' => 'performance',
				'key'      => rawurlencode( $api_key ),
			),
			self::PSI_ENDPOINT
		);

		$res = wp_remote_get( $psi_url, array( 'timeout' => 60 ) );
		if ( is_wp_error( $res ) ) {
			// エラーログへAPIキーを出さない（メッセージのみ）
			return new WP_Error( 'mma_psi_failed', __( 'PageSpeed Insightsに接続できませんでした。時間をおいて再実行してください。', 'mobilistica-mobile-audit' ), array( 'status' => 502 ) );
		}
		$code = wp_remote_retrieve_response_code( $res );
		$body = wp_remote_retrieve_body( $res );
		if ( 200 !== $code ) {
			return new WP_Error( 'mma_psi_status', sprintf( /* translators: %d: HTTP status */ __( '診断APIがエラーを返しました (HTTP %d)。', 'mobilistica-mobile-audit' ), $code ), array( 'status' => 502 ) );
		}

		set_transient( $cache_key, $body, self::CACHE_TTL );
		MMA_RateLimit::count_run();
		return rest_ensure_response( json_decode( $body, true ) );
	}
}

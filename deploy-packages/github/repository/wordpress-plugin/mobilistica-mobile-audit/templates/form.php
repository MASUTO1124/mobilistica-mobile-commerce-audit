<?php
/**
 * 診断フォームテンプレート（web-app/index.html のフォーム部と同一構造。編集はweb-app側を正とする）。
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="audit-container mma-embed">
	<form id="audit-form" novalidate aria-describedby="form-help">
		<div class="field-row">
			<label for="url-input"><?php esc_html_e( '診断したいサイトのURL', 'mobilistica-mobile-audit' ); ?></label>
			<input type="url" id="url-input" name="url" inputmode="url" autocomplete="url" placeholder="https://example.com/" required aria-required="true">
		</div>
		<div class="field-row">
			<label for="site-type"><?php esc_html_e( 'サイト種別（任意）', 'mobilistica-mobile-audit' ); ?></label>
			<select id="site-type" name="site-type">
				<option value="auto" selected><?php esc_html_e( '自動判定', 'mobilistica-mobile-audit' ); ?></option>
				<option value="wordpress">WordPress</option>
				<option value="woocommerce">WooCommerce</option>
				<option value="shopify">Shopify</option>
				<option value="other"><?php esc_html_e( 'その他', 'mobilistica-mobile-audit' ); ?></option>
			</select>
		</div>
		<p id="form-help" class="help-text"><?php esc_html_e( '公開ページのURLのみ診断できます。診断結果はブラウザ内で生成され、当サイトに保存されません。', 'mobilistica-mobile-audit' ); ?></p>
		<button type="submit" id="submit-btn"><?php esc_html_e( '無料で診断する', 'mobilistica-mobile-audit' ); ?></button>
		<p id="input-error" class="error" role="alert" hidden></p>
	</form>
	<section id="loading" class="loading" aria-live="polite" hidden>
		<div class="skeleton" aria-hidden="true"></div>
		<p id="loading-text"><?php esc_html_e( '診断中です（30〜60秒ほどかかります）…', 'mobilistica-mobile-audit' ); ?></p>
		<button type="button" id="cancel-btn" class="secondary"><?php esc_html_e( '中止する', 'mobilistica-mobile-audit' ); ?></button>
	</section>
	<section id="result" class="result" aria-live="polite" hidden></section>
	<section id="error-panel" class="error-panel" role="alert" hidden>
		<h2><?php esc_html_e( '診断できませんでした', 'mobilistica-mobile-audit' ); ?></h2>
		<p id="error-message"></p>
		<button type="button" id="retry-btn"><?php esc_html_e( 'もう一度試す', 'mobilistica-mobile-audit' ); ?></button>
	</section>
</div>

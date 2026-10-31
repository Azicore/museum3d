/**
 * 重複無しの乱数を生成するクラス
 */
export default class RandomOrder {

	/**
	 * コンストラクタ
	 * @param {number} n - 乱数の範囲（0～n-1）
	 */
	constructor(n) {
		this.n = n;
		this.initialize();
	}
	
	/**
	 * 初期化する
	 */
	initialize() {
		const n = this.n;
		this.order = new Array(n).fill(0).map((v, i) => i);
		for (let i = 0; n - 1 > i; i++) {
			const m = Math.floor(Math.random() * (n - i)) + i;
			[this.order[i], this.order[m]] = [this.order[m], this.order[i]];
		}
	}
	
	/**
	 * 次の値を返す
	 * @return {number} 次の値
	 */
	next() {
		if (!this.order.length) {
			this.initialize();
		}
		return this.order.shift();
	}

}

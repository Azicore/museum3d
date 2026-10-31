/**
 * 方角を表すクラス
 */
export default class Dir {

	/**
	 * 北を表す値
	 * @type {string}
	 */
	static N = 'n';
	/**
	 * 東を表す値
	 * @type {string}
	 */
	static E = 'e';
	/**
	 * 南を表す値
	 * @type {string}
	 */
	static S = 's';
	/**
	 * 西を表す値
	 * @type {string}
	 */
	static W = 'w';

	/**
	 * 方角のリスト
	 * @type {string[]}
	 */
	static dir = [this.N, this.E, this.S, this.W];

	/**
	 * 方角dから時計回りにkずれた方角を返す
	 * @param {string} d - 基準となる方角
	 * @param {number} k - 時計回りにずれる量
	 * @return {string} 方角dから時計回りにkずれた方角
	 */
	static get(d, k) {
		return this.dir[(this.dir.indexOf(d) + k) % this.dir.length];
	}
	
	/**
	 * 方角dの反対の方角を返す
	 * @param {string} d - 基準となる方角
	 * @return {string} 方角dの反対の方角
	 */
	static opp(d) {
		return this.get(d, 2);
	}

	/**
	 * 方角dの北を基準とした時計回りの角度（n：0、e：90、s：180、w：270）を返す
	 * @param {string} d - 方角
	 * @return {number} 北を基準とした時計回りの角度
	 */
	static angle(d) {
		return this.dir.indexOf(d) * Math.PI / 2;
	}
	
	/**
	 * 方角dに進むためのxz座標の差分（n：[0, -1]、e：[1, 0]、s：[0, 1]、w：[-1, 0]）を返す
	 * @param {string} d - 方角
	 * @return {number[]} xz座標の差分
	 */
	static delta(d) {
		const a = -this.angle(d);
		return [-Math.round(Math.sin(a)), -Math.round(Math.cos(a))];
	}

}

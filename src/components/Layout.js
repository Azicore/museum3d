import Dir from './Dir.js';

/**
 * 通路の形状を保持するクラス
 */
export default class Layout {

	/**
	 * コンストラクタ
	 * @param {string} map - 通路の形状を表す罫線文字列
	 */
	constructor(map) {

		/**
		 * 2次元配列に変換したマップ
		 * @type {string[][]}
		 */
		this.cells = ((map) => {
			map = map
			.replace(/^[\r\n]+|[\r\n]+$/g, '')
			.split(/[\r\n]+/)
			.map(line => {
				line = line
				.split('')
				.map(cell => {
					return { '┌': 'se', '┐': 'sw', '┘': 'nw', '└': 'ne', '─': 'ew', '│': 'ns' }[cell] ?? '';
				});
				return line;
			});
			return map;
		})(map);

		/**
		 * 横方向の最大長さ
		 * @type {number}
		 */
		this.lengthX = Math.max(...this.cells.map(line => line.length));

		/**
		 * 縦方向の最大長さ
		 * @type {number}
		 */
		this.lengthZ = this.cells.length;

		/**
		 * 座標ごとのマス番号（※次のcellPositionsと共に初期化）
		 * @type {number[][]}
		 */
		this.cellNumbers = this.cells.map(line => line.map(cell => null));

		/**
		 * マス番号ごとの座標
		 * @type {Array[]}
		 */
		this.cellPositions = ((cells) => {
			let q; // 無限ループ防止用カウンタ
			let [x, y] = [0, 0];
			// 起点の探索
			for (q = 0; !cells[y][x]; ) {
				x++;
				if (q++ >= 100) throw new Error('Start cell not found');
			}
			const pos = [];
			let n = 0;
			let prev = Dir.S; // 起点は必ず┌であるはず
			// 起点から通路をたどっていく
			for (q = 0; this.cellNumbers[y][x] == null; ) {
				pos.push([x, y]);
				this.cellNumbers[y][x] = n++;
				// 進行方向を決定
				const next = cells[y][x].replace(prev, '');
				// 進行方向に応じて座標を変更
				const [dx, dy] = Dir.delta(next);
				[x, y] = [x + dx, y + dy];
				// 次のマスに来た方向を教える
				prev = Dir.opp(next);
				if (q++ >= 1000) throw new Error('Too many cells or invalid route');
			}
			return pos;
		})(this.cells);

		/**
		 * 東西方向の壁の端点座標と長さ
		 * @type {Array[]}
		 */
		this.hwalls = ((cells) => {
			const walls = [];
			for (let j = 0; this.lengthZ + 1 > j; j++) {
				let prev = false;
				let wallStart, wallLength;
				for (let i = 0; this.lengthX + 1 > i; i++) {
					// 壁の座標を横方向に見ていき、上と下のマスが壁を必要としているかを確認
					const cn = cells[j - 1]?.[i];
					const cs = cells[j]?.[i];
					const wallRequired = cn && !/s/.test(cn) || cs && !/n/.test(cs);
					if (wallRequired) {
						if (!prev) {
							wallStart = [i, j];
							wallLength = 0;
						}
						wallLength++;
					} else if (prev) {
						walls.push([...wallStart, wallLength]);
					}
					prev = wallRequired;
				}
			}
			return walls;
		})(this.cells);

		/**
		 * 南北方向の壁の端点座標と長さ
		 * @type {Array[]}
		 */
		this.vwalls = ((cells) => {
			const walls = [];
			for (let i = 0; this.lengthX + 1 > i; i++) {
				let prev = false;
				let wallStart, wallLength;
				for (let j = 0; this.lengthZ + 1 > j; j++) {
					// 壁の座標を縦方向に見ていき、左と右のマスが壁を必要としているかを確認
					const cw = cells[j]?.[i - 1];
					const ce = cells[j]?.[i];
					const wallRequired = cw && !/e/.test(cw) || ce && !/w/.test(ce);
					if (wallRequired) {
						if (!prev) {
							wallStart = [i, j];
							wallLength = 0;
						}
						wallLength++;
					} else if (prev) {
						walls.push([...wallStart, wallLength]);
					}
					prev = wallRequired;
				}
			}
			return walls;
		})(this.cells);
		
		/**
		 * 可動範囲
		 * @type {Array[][]}
		 */
		this.motionRange = ((cells) => {
			const ranges = cells.map(line => line.map(cell => null));
			// 東西方向
			for (let j = 0; this.lengthZ > j; j++) {
				let start = 0;
				for (let i = 0; this.lengthX > i; i++) {
					if (/e/.test(cells[j]?.[i] ?? '')) continue;
					for (let k = start; i >= k; k++) {
						if (!ranges[j][k]) ranges[j][k] = [];
						ranges[j][k][0] = start;
						ranges[j][k][1] = i + 1;
					}
					start = i + 1;
				}
			}
			// 南北方向
			for (let i = 0; this.lengthX > i; i++) {
				let start = 0;
				for (let j = 0; this.lengthZ > j; j++) {
					if (/s/.test(cells[j]?.[i] ?? '')) continue;
					for (let k = start; j >= k; k++) {
						if (!ranges[k][i]) ranges[k][i] = [];
						ranges[k][i][2] = start;
						ranges[k][i][3] = j + 1;
					}
					start = j + 1;
				}
			}
			return ranges;
		})(this.cells);
		
		/**
		 * マス番号ごとの画像を表示する壁のリスト
		 * @type {Array[]}
		 */
		this.imagePositions = ((cells) => {
			const pos = [];
			let prevDir = Dir.N;
			let side = true; // true: 進行方向左側から時計回り, false: 進行方向右側から反時計回り
			for (const [x, z] of this.cellPositions) {
				const cell = cells[z][x];
				const nextDir = cell.replace(Dir.opp(prevDir), '');
				// 通路が右に曲がっている場合
				if (nextDir == Dir.get(prevDir, 1)) {
					side = true;
					pos.push([side, Dir.get(prevDir, 3), prevDir]); // 左の壁と正面の壁
				// 通路が左に曲がっている場合
				} else if (nextDir == Dir.get(prevDir, 3)) {
					side = false;
					pos.push([side, Dir.get(prevDir, 1), prevDir]); // 右の壁と正面の壁
				// 通路が曲がっていない場合
				} else {
					pos.push([side, side ? Dir.get(prevDir, 3) : Dir.get(prevDir, 1)]); // 直前と同じ側の壁
				}
				prevDir = nextDir;
			}
			return pos;
		})(this.cells);

	}

}

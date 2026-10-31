import express from 'express';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';

const __dirname = import.meta.dirname;

if (!config) {
	console.error(`Invalid config: ${process.env.NODE_ENV}`);
	process.exit(1);
}

const app = express();
const router = express.Router();

// 共通のHTTPヘッダー
router.use('/', (req, res, next) => {
	// 画像のみキャッシュし、画像以外はキャッシュしない。
	if (/\.(?:jpg|png|webp)$/i.test(req.path)) {
		res.set('Cache-Control', 'max-age=604800');
	} else {
		res.set('Cache-Control', 'no-cache');
	}
	next();
});

// 画像ファイル
for (const name in config.imagePaths) {
	router.use(`/img/${name}/`, express.static(config.imagePaths[name]));
}

// ファイル一覧
router.get('/filelist/:name', async (req, res, next) => {
	const dirPath = config.imagePaths[req.params.name];
	if (!dirPath) {
		// error
	}
	const files = fs.readdirSync(dirPath);
	const list = files.filter(file => /\.(?:jpg|png|webp)$/i.test(file)).map(file => `./img/${req.params.name}/${file}`);
	res.json({ files: list });
});

// その他の静的ファイル
router.use('/', express.static(path.join(__dirname, './src/')));

app.use(config.prefix, router);
app.listen(config.serverPort);
console.log('Started.');


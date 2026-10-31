export const config = {

	// 設定例
	local: {
		prefix: '/museum/',
		serverPort: 8323,
		imagePaths: {
			default: 'D:\\myphoto\\photo1',
			photo2: 'D:\\myphoto\\photo2'
		}
	}

}[process.env.NODE_ENV || 'local'];

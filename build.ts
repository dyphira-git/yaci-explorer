import { readdirSync, copyFileSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import postcss from 'postcss'
import postcssLoadConfig from 'postcss-load-config'

const isProd = process.env.NODE_ENV === 'production'

// Build JS bundle — entry and chunks get content hashes for cache busting
const result = await Bun.build({
	entrypoints: ['./src/main.tsx'],
	outdir: './dist',
	target: 'browser',
	format: 'esm',
	splitting: true,
	sourcemap: isProd ? 'external' : 'inline',
	minify: isProd,
	naming: {
		entry: '[dir]/[name]-[hash].[ext]',
		chunk: '[dir]/[name]-[hash].[ext]',
		asset: '[dir]/[name]-[hash].[ext]',
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
	},
})

if (!result.success) {
	console.error('Build failed:')
	for (const log of result.logs) {
		console.error(log)
	}
	process.exit(1)
}

// Find the hashed entry filename from build output
const entryOutput = result.outputs.find(o => o.kind === 'entry-point')
const entryFilename = entryOutput ? basename(entryOutput.path) : 'main.js'
console.log(`Built ${result.outputs.length} JS files (entry: ${entryFilename})`)

// Process CSS and write with content hash
const css = await Bun.file('./src/index.css').text()
const { plugins, options } = await postcssLoadConfig()
const cssResult = await postcss(plugins).process(css, { ...options, from: './src/index.css', to: './dist/styles.css' })
const cssHash = new Bun.CryptoHasher('md5').update(cssResult.css).digest('hex').slice(0, 8)
const cssFilename = `styles-${cssHash}.css`
await Bun.write(`./dist/${cssFilename}`, cssResult.css)
console.log(`Built ${cssFilename}`)

// Copy public assets to dist
const publicDir = './public'
for (const file of readdirSync(publicDir)) {
	copyFileSync(join(publicDir, file), join('./dist', file))
}
console.log('Copied public assets')

// Generate index.html referencing hashed filenames
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Republic AI Block Explorer</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="/${cssFilename}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entryFilename}"></script>
  </body>
</html>`
await Bun.write('./dist/index.html', html)
console.log('Built index.html')

console.log('Build complete')

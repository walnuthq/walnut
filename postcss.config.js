module.exports = {
	plugins: {
		// Import other CSS files first
		'postcss-import': {},

		// Enable Tailwind CSS nesting
		'tailwindcss/nesting': {},

		// Process Tailwind CSS
		tailwindcss: {},

		// Add vendor prefixes automatically
		autoprefixer: {
			// Target modern browsers
			overrideBrowserslist: ['last 2 versions', '> 1%', 'not dead']
		}
	}
};

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import reactPlugin from 'eslint-plugin-react';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname
});

const eslintConfig = [
	{
		ignores: [
			'.next/**',
			'node_modules/**',
			'out/**',
			'build/**',
			'dist/**',
			'*.config.js',
			'*.config.cjs',
			'*.config.mjs'
		]
	},
	...compat.extends(
		'next/core-web-vitals',
		'plugin:react/recommended',
		'plugin:jsx-a11y/recommended',
		'plugin:import/errors',
		'plugin:import/warnings'
	),
	{
		plugins: {
			react: reactPlugin,
			'jsx-a11y': jsxA11yPlugin,
			import: importPlugin
		},
		rules: {
			'jsx-a11y/heading-has-content': 'off',
			'jsx-a11y/no-static-element-interactions': 'off',
			'jsx-a11y/click-events-have-key-events': 'off',
			'jsx-a11y/anchor-is-valid': 'off',
			'react/prop-types': 'off',
			'react/react-in-jsx-scope': 'off',
			'import/no-named-as-default': 'off',
			'import/no-unresolved': 'error',
			'import/named': 'error',
			'import/default': 'error',
			'import/namespace': 'error',
			'import/no-duplicates': 'error'
		},
		settings: {
			react: {
				version: 'detect'
			}
		}
	}
];

export default eslintConfig;

import type { Monaco } from '@monaco-editor/react';

export function registerCairoLanguageSupport(_monaco: Monaco) {
	const languageId = 'cairo';
	_monaco.languages.register({ id: languageId });
	_monaco.languages.setLanguageConfiguration(languageId, {
		comments: {
			lineComment: '//'
		},
		brackets: [
			['{', '}'],
			['[', ']'],
			['(', ')'],
			['%{', '%}']
		],
		autoClosingPairs: [
			{ open: '{', close: '}' },
			{ open: '[', close: ']' },
			{ open: '(', close: ')' },
			{ open: '%{', close: '%}' },
			{ open: "'", close: "'", notIn: ['string', 'comment'] },
			{ open: '<', close: '>' }
		],
		surroundingPairs: [
			{ open: '{', close: '}' },
			{ open: '[', close: ']' },
			{ open: '(', close: ')' },
			{ open: '%{', close: '%}' },
			{ open: "'", close: "'" },
			{ open: '<', close: '>' }
		]
	});
	_monaco.languages.setMonarchTokensProvider(languageId, {
		defaultToken: '',
		tokenPostfix: '.cairo',

		brackets: [
			{ token: 'delimiter.curly', open: '{', close: '}' },
			{ token: 'delimiter.parenthesis', open: '(', close: ')' },
			{ token: 'delimiter.square', open: '[', close: ']' },
			{ token: 'delimiter.curly', open: '%{', close: '%}' },
			{ token: 'delimiter.angle', open: '<', close: '>' }
		],

		keywords: [
			'as',
			'break',
			'const',
			'continue',
			'else',
			'enum',
			'extern',
			'false',
			'fn',
			'if',
			'impl',
			'implicits',
			'let',
			'loop',
			'match',
			'mod',
			'mut',
			'nopanic',
			'of',
			'ref',
			'return',
			'struct',
			'trait',
			'true',
			'type',
			'use',
			'Self',
			'assert',
			'do',
			'dyn',
			'for',
			'hint',
			'in',
			'macro',
			'move',
			'pub',
			'self',
			'static',
			'static_assert',
			'super',
			'try',
			'typeof',
			'unsafe',
			'where',
			'while',
			'with',
			'yield',
			'type',
			'cotype'
		],
		types: ['bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'usize'],
		literals: ['true', 'false'],
		operators: [
			'!',
			'~',
			'!=',
			'%',
			'%=',
			'&',
			'&&',
			'*',
			'*=',
			'@',
			'*',
			'+',
			'+=',
			',',
			'-',
			'-',
			'-=',
			'->',
			'.',
			'/',
			'/=',
			':',
			':',
			';',
			'<',
			'<=',
			'=',
			'==',
			'=>',
			'>',
			'>=',
			'^',
			'|',
			'||',
			'?'
		],
		// we include these common regular expressions
		// eslint-disable-next-line no-useless-escape
		symbols: /[=><!~?:&|+\-*\/\^%]+/,
		numberDecimal: /[+-]?[0-9]+/,
		numberHex: /[+-]?0x[0-9a-fA-F]+/,

		// The main tokenizer for our languages
		tokenizer: {
			root: [
				// identifiers and keywords
				[
					/[a-z_$][\w$]*/,
					{
						cases: {
							'@types': 'type.keyword',
							'@keywords': 'keyword',
							'@default': 'identifier'
						}
					}
				],

				// eslint-disable-next-line no-useless-escape
				[/[A-Z][\w\$]*/, 'type.identifier'],
				// whitespace
				{ include: '@whitespace' },

				// directives
				[/^%[a-zA-Z]\w*/, 'tag'],

				// delimiters and operators
				// eslint-disable-next-line no-useless-escape
				[/[{}()\[\]]/, '@brackets'],
				[/[<>](?!@symbols)/, '@brackets'],
				[/\b(?:let|const)\s+([a-zA-Z_$][a-zA-Z\d_$]*)/, 'variableinit'],
				[
					/@symbols/,
					{
						cases: {
							'@operators': 'delimiter',
							'@default': ''
						}
					}
				],

				// numbers
				[/(@numberHex)/, 'number.hex'],
				[/(@numberDecimal)/, 'number'],

				// strings
				[/['"][^'"]*['"]/g, 'string']
			],

			common: [],

			whitespace: [
				[/\s+/, 'white'],
				[/\/\/.*/, 'comment']
			]
		}
	});
	_monaco.editor.defineTheme('light-theme', {
		base: 'vs',
		inherit: true,
		rules: [
			{
				foreground: '#981B64',
				token: 'variableinit'
			}
		],
		colors: {
			'editor.foreground': '#000000',
			'editorCursor.foreground': '#8B0000',
			'editor.lineHighlightBackground': '#0000FF20',
			'editor.selectionBackground': '#88000030',
			'editor.inactiveSelectionBackground': '#88000015'
		}
	});
	_monaco.editor.defineTheme('dark-theme', {
		base: 'vs-dark',
		inherit: true,
		rules: [
			{
				foreground: '#981B64',
				token: 'variableinit'
			}
		],
		colors: {
			'editor.background': '#141515',
			'editor.lineHighlightBackground': '#1e1e1e'
		}
	});
}

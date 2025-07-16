'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
// @ts-ignore
import * as d3 from 'd3';
import { flamegraph } from 'd3-flame-graph';
import 'd3-flame-graph/dist/d3-flamegraph.css';
import { shortenHash } from '@/lib/utils';

export type FlameChartNodeType =
	| 'Root'
	| 'Category'
	| 'ContractAddress'
	| 'StorageKey'
	| 'ClassHash';

export interface FlameNode {
	callId: number;
	value: number;
	rawValue: number;
	name: string;
	nodeType?: FlameChartNodeType;
	children?: FlameNode[];
}

interface FlameGraphProps {
	data: FlameNode;
	height?: number;
	width?: number;
	minFrameSize?: number;
	activeName?: string | null;
}

const FlameGraph: React.FC<FlameGraphProps> = ({
	data,
	height,
	width,
	minFrameSize = 0,
	activeName = null
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<any>(null);
	const tooltipRef = useRef<d3.Selection<any, unknown, HTMLElement, any> | null>(null);
	const [containerWidth, setContainerWidth] = useState(0);
	const formatter = useMemo(() => new Intl.NumberFormat(navigator.language), []);

	const displayName = (rawName: string): string => {
		const parts = rawName.split('.');
		const prefix = parts[0];
		if (/^0x[a-fA-F0-9]{40,}$/.test(prefix)) {
			parts[0] = shortenHash(prefix);
		}
		return parts.join('.');
	};

	function formatNodeType(type?: FlameChartNodeType): string | null {
		if (!type) return null;
		switch (type) {
			case 'ContractAddress':
				return 'Contract Address';
			case 'StorageKey':
				return 'Storage Key';
			case 'ClassHash':
				return 'Class Hash';
			default:
				return null;
		}
	}

	useEffect(() => {
		if (!containerRef.current) return;
		let timeout: number;
		const observer = new ResizeObserver((entries) => {
			clearTimeout(timeout);
			timeout = window.setTimeout(() => {
				setContainerWidth(entries[0].contentRect.width);
			}, 150);
		});
		observer.observe(containerRef.current);
		return () => {
			observer.disconnect();
			clearTimeout(timeout);
		};
	}, []);

	useEffect(() => {
		if (containerWidth === 0 || !containerRef.current) return;
		const container = containerRef.current;

		d3.select(container).selectAll('*').remove();
		d3.select(container).style('position', 'relative');

		d3.select(container).append('style').text(`
      .flame-graph-container .d3-flame-graph .frame rect {
        stroke: white !important;
        stroke-width: 1px !important;
        transition: fill-opacity 0.2s ease;
      }
      .flame-graph-container .d3-flame-graph .frame rect:hover {
        fill-opacity: 0.7 !important;
      }
      .flame-graph-container .d3-flame-graph .frame .label text {
        fill: white !important;
        font-size: 12px !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
      }
      .flame-graph-container .d3-flame-graph .frame foreignObject > div {
        display: flex !important;
        align-items: center !important;
        height: 100% !important;
        padding: 12px 6px !important;
        box-sizing: border-box !important;
        font-size: 12px !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
        color: white !important;
        min-width: 30px !important;
      }
    `);

		const root = d3.hierarchy<FlameNode>(data);
		const maxDepth = root.height;
		const primary = d3.hsl('#000273');
		const lightScale = d3
			.scaleLinear<number>()
			.domain([0, maxDepth])
			.range([Math.min(primary.l + 0.3, 0.95), Math.max(primary.l - 0.3, 0.05)]);

		const colorFn = (d: any) => {
			const depth = d.depth ?? 0;
			const baseL = lightScale(depth);
			const p = d.parent;
			if (p && p.children && p.children.length > 1) {
				const siblings = p.children;
				const idx = siblings.indexOf(d);
				const shift = (idx / (siblings.length - 1) - 0.5) * 0.1;
				const l = Math.max(0, Math.min(1, baseL + shift));
				return d3.hsl(primary.h, primary.s, l).formatHex();
			}
			return d3.hsl(primary.h, primary.s, baseL).formatHex();
		};

		const tooltip = d3
			.select(document.body)
			.append('div')
			.attr('class', 'flame-tooltip')
			.style('position', 'fixed')
			.style('pointer-events', 'none')
			.style('background', 'rgba(0,0,0,0.75)')
			.style('color', '#fff')
			.style('padding', '4px 8px')
			.style('border-radius', '4px')
			.style('font-size', '12px')
			.style('opacity', '0')
			.style('transition', 'opacity 0.2s');
		tooltipRef.current = tooltip;

		const chart = flamegraph()
			.width(width ?? containerWidth)
			.cellHeight(24)
			.minFrameSize(minFrameSize)
			.transitionDuration(750)
			.sort((a, b) => b.value - a.value)
			.inverted(true)
			.tooltip(false)
			// @ts-ignore
			.getName(
				(d: { data: FlameNode }) =>
					`${displayName(d.data.name)} — ${formatter.format(d.data.rawValue)} Gas`
			)
			.color(colorFn);
		chartRef.current = chart;

		d3.select(container).datum(data).call(chart);
		d3.select(container).selectAll('title').remove();
		d3.select(container)
			.selectAll<SVGRectElement, any>('.frame rect')
			.attr('data-name', (d: { data: FlameNode }) => displayName(d.data.name));

		const bindTooltip = () => {
			d3.select(container).selectAll('foreignObject, .label').style('pointer-events', 'none');
			tooltip.style('opacity', '0');
			const margin = 8;

			d3.select(container)
				.selectAll<SVGRectElement, any>('.frame rect')
				.on('mouseenter', (event: MouseEvent, d: { data: FlameNode }) => {
					const nodeTypeLabel = formatNodeType(d.data.nodeType);
					tooltip.html(
						nodeTypeLabel
							? `<strong>${nodeTypeLabel}: ${d.data.name}</strong><br/>Value: ${formatter.format(
									d.data.rawValue
							  )}`
							: `<strong>${d.data.name}</strong><br/>Value: ${formatter.format(d.data.rawValue)}`
					);
					const tipEl = tooltip.node() as HTMLElement;
					const tipW = tipEl.getBoundingClientRect().width;
					const x = event.clientX + margin;
					const y = event.clientY + margin;
					const left = x + tipW + margin > window.innerWidth ? event.clientX - tipW - margin : x;
					tooltip.style('left', `${left}px`).style('top', `${y}px`).style('opacity', '1');
				})
				.on('mousemove', (event: MouseEvent) => {
					const tipEl = tooltip.node() as HTMLElement;
					const tipW = tipEl.getBoundingClientRect().width;
					const x = event.clientX + margin;
					const y = event.clientY + margin;
					const left = x + tipW + margin > window.innerWidth ? event.clientX - tipW - margin : x;
					tooltip.style('left', `${left}px`).style('top', `${y}px`);
				})
				.on('mouseleave', () => {
					tooltip.style('opacity', '0');
				});
		};

		bindTooltip();
		chart.onClick(() => setTimeout(bindTooltip, 200));

		return () => {
			tooltip.remove();
		};
	}, [containerWidth, data, height, width, minFrameSize, formatter]);

	useEffect(() => {
		if (!chartRef.current || containerWidth === 0) return;
		const chart = chartRef.current;
		chart.width(width ?? containerWidth);
		const cont = containerRef.current!;
		d3.select(cont).datum(data).call(chart);
		d3.select(cont)
			.selectAll<SVGRectElement, any>('.frame rect')
			.attr('data-name', (d: { data: FlameNode }) => displayName(d.data.name));
		const tooltip = tooltipRef.current!;
		const margin = 8;
		d3.select(cont).selectAll('foreignObject, .label').style('pointer-events', 'none');
		d3.select(cont)
			.selectAll<SVGRectElement, any>('.frame rect')
			.on('mouseenter', (event: MouseEvent, d: { data: FlameNode }) => {
				const nodeTypeLabel = formatNodeType(d.data.nodeType);
				tooltip.html(
					nodeTypeLabel
						? `<strong>${nodeTypeLabel}: ${d.data.name}</strong><br/>Value: ${formatter.format(
								d.data.rawValue
						  )}`
						: `<strong>${d.data.name}</strong><br/>Value: ${formatter.format(d.data.rawValue)}`
				);
				const tipEl = tooltip.node() as HTMLElement;
				const tipW = tipEl.getBoundingClientRect().width;
				const x = event.clientX + margin;
				const y = event.clientY + margin;
				const left = x + tipW + margin > window.innerWidth ? event.clientX - tipW - margin : x;
				tooltip.style('left', `${left}px`).style('top', `${y}px`).style('opacity', '1');
			})
			.on('mousemove', (event: MouseEvent) => {
				const tipEl = tooltip.node() as HTMLElement;
				const tipW = tipEl.getBoundingClientRect().width;
				const x = event.clientX + margin;
				const y = event.clientY + margin;
				const left = x + tipW + margin > window.innerWidth ? event.clientX - tipW - margin : x;
				tooltip.style('left', `${left}px`).style('top', `${y}px`);
			})
			.on('mouseleave', () => {
				tooltip.style('opacity', '0');
			});
	}, [data, containerWidth, width, formatter]);

	useEffect(() => {
		if (!chartRef.current || !activeName || containerWidth === 0) return;
		setTimeout(() => {
			const cont = containerRef.current!;
			const sel = cont.querySelector<SVGRectElement>(`.frame rect[data-name="${activeName}"]`);
			if (sel) {
				const node = d3.select(sel).datum();
				chartRef.current.zoomTo(node);
			}
		}, 200);
	}, [activeName, data, containerWidth]);

	useEffect(() => {
		return () => {
			chartRef.current?.resetZoom();
		};
	}, []);
	return (
		<div className={`w-full border-gray-200 rounded-xl p-2 bg-accent`}>
			<div
				ref={containerRef}
				style={{ width: '100%', height: `${height}px`, overflow: 'auto' }}
				className="flame-graph-container"
			/>
		</div>
	);
};

export default FlameGraph;

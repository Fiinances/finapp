"use client";
import React, { useEffect, useRef } from 'react';

export default function DonutChart() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const g = (window as any).google;
    if (!g) return;

    const draw = () => {
      const data = g.visualization.arrayToDataTable([
        ['Item', 'Count'],
        ['E', 660],
        ['RP', 142],
        ['unknown', 122],
        ['E10+', 150],
        ['T', 15],
        ['M', 5],
      ]);

      const options = {
        pieHole: 0.55,
        backgroundColor: 'transparent',
        legend: { position: 'bottom', textStyle: { color: '#cfcfcf' } },
        colors: ['#2196f3', '#ff7043', '#9ccc65', '#ffd54f', '#ce93d8', '#90a4ae'],
        chartArea: { left: 20, top: 10, width: '100%', height: '75%' },
      };

      const chart = new g.visualization.PieChart(ref.current);
      chart.draw(data, options);
    };

    g.charts.load('current', { packages: ['corechart'] });
    g.charts.setOnLoadCallback(draw);

    const onResize = () => {
      if ((window as any).google && (window as any).google.visualization) draw();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}

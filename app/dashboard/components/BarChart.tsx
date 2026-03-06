"use client";
import React, { useEffect, useRef } from 'react';

export default function BarChart() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const g = (window as any).google;
    if (!g) return;

    const draw = () => {
      const data = g.visualization.arrayToDataTable([
        ['Year', 'A', 'B', 'C'],
        ['2006', 100, 90, 80],
        ['2007', 80, 70, 60],
        ['2008', 60, 50, 40],
        ['2009', 70, 60, 55],
        ['2010', 90, 85, 80],
      ]);

      const options = {
        backgroundColor: 'transparent',
        chartArea: { left: 40, top: 10, width: '90%', height: '75%' },
        colors: ['#4fc3f7', '#f6c85f', '#9ad0f5'],
        legend: { position: 'right', textStyle: { color: '#cfcfcf' } },
        hAxis: { textStyle: { color: '#cfcfcf' } },
        vAxis: { textStyle: { color: '#cfcfcf' } },
      };

      const chart = new g.visualization.BarChart(ref.current);
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

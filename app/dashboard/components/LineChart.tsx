"use client";
import React, { useEffect, useRef } from 'react';

export default function LineChart() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const g = (window as any).google;
    if (!g) return;

    const draw = () => {
      const data = g.visualization.arrayToDataTable([
        ['x', 'value'],
        ['Jan', 6],
        ['Feb', 7],
        ['Mar', 4],
        ['Apr', 8],
        ['May', 6],
        ['Jun', 7],
        ['Jul', 5],
        ['Aug', 7],
        ['Sep', 6],
        ['Oct', 8],
        ['Nov', 7],
        ['Dec', 9],
      ]);

      const options = {
        backgroundColor: 'transparent',
        legend: { position: 'none' },
        colors: ['#4fc3f7'],
        hAxis: { textStyle: { color: '#cfcfcf' } },
        vAxis: { textStyle: { color: '#cfcfcf' } },
        chartArea: { left: 40, top: 10, width: '90%', height: '75%' },
        curveType: 'function',
      };

      const chart = new g.visualization.LineChart(ref.current);
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

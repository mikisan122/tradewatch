import { useId, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { GREEN, RED } from '../core/utils';
import { C } from '../theme';

/** Gráfica de área nativa (SVG). Interactiva: toca o arrastra para ver valores. */
export function AreaChart({ data, height = 160, width: fixedWidth, color, interactive = false, format = (v) => v.toFixed(2), labels, baseline, fillOpacity = 0.35, strokeWidth = 2 }) {
  const gid = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [w, setW] = useState(fixedWidth || 0);
  const [hover, setHover] = useState(null);
  const width = fixedWidth || w;

  if (!data || data.length < 2) return <View style={{ height }} />;

  const min = Math.min(...data, baseline ?? Infinity);
  const max = Math.max(...data, baseline ?? -Infinity);
  const pad = (max - min) * 0.12 || Math.abs(max) * 0.01 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const H = height;
  const x = (i) => (i / (data.length - 1)) * width;
  const y = (v) => H - ((v - lo) / (hi - lo)) * H;
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${line}L${width},${H}L0,${H}Z`;
  const c = color || (data[data.length - 1] >= data[0] ? GREEN : RED);

  const pick = (e) => {
    if (!width) return;
    const px = Math.min(1, Math.max(0, e.nativeEvent.locationX / width));
    setHover(Math.round(px * (data.length - 1)));
  };
  const responder = interactive
    ? {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderTerminationRequest: () => false,
        onResponderGrant: pick,
        onResponderMove: pick,
        onResponderRelease: () => setTimeout(() => setHover(null), 1400),
      }
    : {};

  const hv = hover != null ? data[hover] : null;
  return (
    <View style={{ height, width: fixedWidth || '100%' }} onLayout={fixedWidth ? undefined : (e) => setW(e.nativeEvent.layout.width)} {...responder}>
      {width > 0 && (
        <Svg width={width} height={H}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c} stopOpacity={fillOpacity} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {baseline != null && <Line x1={0} x2={width} y1={y(baseline)} y2={y(baseline)} stroke="rgba(160,180,220,0.35)" strokeDasharray="3,4" />}
          <Path d={area} fill={`url(#${gid})`} />
          <Path d={line} fill="none" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
          {hover != null && (
            <>
              <Line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="rgba(200,215,255,0.45)" />
              <Circle cx={x(hover)} cy={y(hv)} r={5} fill={c} stroke="#fff" strokeWidth={2} />
            </>
          )}
        </Svg>
      )}
      {hover != null && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: -4,
            left: Math.min(Math.max(x(hover) - 55, 0), width - 110), width: 110,
            backgroundColor: '#1a2a52', borderRadius: 9, paddingVertical: 4, alignItems: 'center',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 12.5 }}>{format(hv)}</Text>
          {labels?.[hover] ? <Text style={{ color: C.muted, fontSize: 10.5 }}>{labels[hover]}</Text> : null}
        </View>
      )}
    </View>
  );
}

export function Sparkline({ data, width = 72, height = 30, color, strokeWidth = 1.6 }) {
  return <AreaChart data={data} width={width} height={height} color={color} fillOpacity={0.25} strokeWidth={strokeWidth} />;
}

/** Gráfica de dona para la distribución del portafolio */
export function Donut({ segments, size = 150, thickness = 18, children }) {
  const r = (size - thickness) / 2;
  const Cc = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
        {segments.map((s) => {
          const len = (s.value / total) * Cc;
          const el = (
            <Circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, len - 2)} ${Cc}`}
              strokeDashoffset={-acc}
            />
          );
          acc += len;
          return el;
        })}
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

import { Text, View } from 'react-native';
import { useStore } from '../core/store';
import { fmtTime } from '../core/utils';
import { Icon } from './ui';
import { C } from '../theme';

/** Pie de gráfica: de dónde vienen los precios y cuándo se actualizaron */
export function ChartSource({ style }) {
  const { market } = useStore();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5 }, style]}>
      <Icon name="globe-outline" size={12} color={C.muted} />
      <Text style={{ color: C.muted, fontSize: 11.5 }}>
        Fuente: {market?.source || 'Yahoo Finance'} API
        {market?.updatedAt ? ` · ${fmtTime(market.updatedAt)}` : ''}
      </Text>
    </View>
  );
}

function untilText(ms) {
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

/** Horario de apertura y cierre del mercado (en hora local y de Nueva York) */
export function MarketHours({ price }) {
  const start = price?.sessionStart;
  const end = price?.sessionEnd;
  const now = Date.now();
  let status = price?.marketOpen ? 'Abierto' : 'Cerrado';
  let detail = '';
  if (start && end) {
    if (now < start) detail = `Abre en ${untilText(start - now)}`;
    else if (now < end) detail = `Cierra en ${untilText(end - now)}`;
    else detail = 'Abre el próximo día hábil';
  }
  const open = status === 'Abierto';
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: C.muted, fontWeight: '600', fontSize: 12.5 }}>Horario del mercado</Text>
        <Text style={{ color: open ? C.green : C.amber, fontWeight: '700', fontSize: 12.5 }}>
          ● {status}
          {detail ? ` · ${detail}` : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: C.muted, fontSize: 13.5 }}>Apertura</Text>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 13.5 }}>
          {start ? `${fmtTime(start)} tu hora` : '—'} · 9:30 Nueva York
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: C.muted, fontSize: 13.5 }}>Cierre</Text>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 13.5 }}>
          {end ? `${fmtTime(end)} tu hora` : '—'} · 16:00 Nueva York
        </Text>
      </View>
      <Text style={{ color: C.muted, fontSize: 12 }}>
        Lunes a viernes{price?.exchange ? ` · ${price.exchange}` : ''}. Fuera de este horario se muestra el último precio de cierre.
      </Text>
    </View>
  );
}
